//! Spikes S1, S2 and S3 from specs/encrypted-vault-sync/spec-1-crypto-core.md. Throwaway,
//! and on Android only. Every result goes to a file, because going to system settings to
//! add a fingerprint can kill this process, and the screen shows that file.
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::time::Instant;

use jni::JNIEnv;
use jni::objects::JObject;
use jni::sys::jstring;
use serde_json::Value;
use tauri::{AppHandle, Runtime};
use tauri_plugin_biometric::{AuthOptions, BiometricExt};
use vault_core::{
    KdfParams, decrypt_entry, derive_keys, encrypt_entry, new_item_id, new_salt, unwrap_vault_key,
};

const FILES: &str = "/data/data/com.cereberus.app.spike/files";
const VECTORS: &str = include_str!("../../vault-core/testdata/vectors.json");

// Stands in for the vault key and auth key, at their combined length. Not a secret.
const TEST_SECRET: &str =
    "spike-test-value-not-a-secret-0123456789-spike-test-value-not-a-secret-0123456789-abcde";

fn path(name: &str) -> String {
    format!("{FILES}/{name}")
}

fn record(line: &str) {
    let _ = fs::create_dir_all(FILES);
    if let Ok(mut log) = OpenOptions::new().create(true).append(true).open(path("log.txt")) {
        let _ = writeln!(log, "{line}");
    }
}

fn derive_times() -> Result<String, String> {
    let salt = new_salt().map_err(|e| format!("{e:?}"))?;
    let params = KdfParams::default();
    let mut times = Vec::new();
    for _ in 0..5 {
        let start = Instant::now();
        derive_keys("correct horse battery staple", &salt, &params).map_err(|e| format!("{e:?}"))?;
        times.push(start.elapsed().as_millis());
    }
    Ok(format!("{times:?} ms, first run first"))
}

/// Opens the vault in the vectors, written by a second implementation, and an entry in it.
fn check_vectors() -> Result<(), String> {
    let v: Value = serde_json::from_str(VECTORS).map_err(|e| e.to_string())?;
    let text = |value: &Value| value.as_str().unwrap_or_default().to_owned();

    let kdf = &v["kdf"][0];
    let params: KdfParams =
        serde_json::from_value(kdf["params"].clone()).map_err(|e| e.to_string())?;
    let keys = derive_keys(&text(&kdf["password"]), &text(&kdf["salt"]), &params)
        .map_err(|e| format!("derive_keys: {e:?}"))?;
    if keys.auth_key.to_base64url().as_str() != text(&kdf["authKey"]) {
        return Err("the auth key doesn't match the vector".into());
    }
    let vault = unwrap_vault_key(&keys.kek, &text(&kdf["wrappedVaultKey"]))
        .map_err(|e| format!("unwrap_vault_key: {e:?}"))?;

    let case = &v["entries"]["cases"][0];
    let entry = decrypt_entry(&vault, &text(&case["itemId"]), &text(&case["ciphertext"]))
        .map_err(|e| format!("decrypt_entry: {e:?}"))?;
    let expected: Value = serde_json::from_str(&text(&case["json"])).map_err(|e| e.to_string())?;
    if entry.name != text(&expected["name"]) {
        return Err("the decrypted entry doesn't match the vector".into());
    }

    let id = new_item_id().map_err(|e| format!("{e:?}"))?;
    let sealed = encrypt_entry(&vault, &id, &entry).map_err(|e| format!("encrypt_entry: {e:?}"))?;
    let reopened = decrypt_entry(&vault, &id, &sealed).map_err(|e| format!("reopen: {e:?}"))?;
    if reopened.name != entry.name {
        return Err("an entry written here didn't read back".into());
    }
    Ok(())
}

fn crypto_report() -> Result<String, String> {
    check_vectors()?;
    Ok(format!(
        "PASS: vectors opened through JNI. derive_keys: {}",
        derive_times()?
    ))
}

/// S1: called by SpikeService, in a process that never ran MainActivity.
#[unsafe(no_mangle)]
pub extern "system" fn Java_com_cereberus_app_SpikeService_nativeRoundTrip<'local>(
    env: JNIEnv<'local>,
    _this: JObject<'local>,
) -> jstring {
    let report = std::panic::catch_unwind(crypto_report)
        .unwrap_or_else(|_| Err("Rust panicked".to_owned()))
        .unwrap_or_else(|e| format!("FAILED: {e}"));
    env.new_string(report)
        .map(|text| text.into_raw())
        .unwrap_or(std::ptr::null_mut())
}

/// Everything so far, for the screen.
#[tauri::command]
pub fn spike_results() -> String {
    let read = |name: &str| fs::read_to_string(path(name)).unwrap_or_else(|_| "(nothing yet)\n".into());
    format!(
        "--- S1\n{}\n--- S2 and S3\n{}\n--- How recent runs ended\n{}",
        read("s1.txt"),
        read("log.txt"),
        read("last-exit.txt"),
    )
}

/// Keeps the prompt off the async runtime's workers, and records how it went.
async fn recorded<R: Runtime>(
    app: AppHandle<R>,
    label: &'static str,
    work: fn(AppHandle<R>) -> Result<String, String>,
) -> Result<(), String> {
    let outcome = tauri::async_runtime::spawn_blocking(move || work(app))
        .await
        .map_err(|e| e.to_string())
        .and_then(|outcome| outcome);
    match &outcome {
        Ok(text) => record(&format!("{label}: {text}")),
        Err(error) => record(&format!("{label}: REFUSED: {error}")),
    }
    outcome.map(|_| ())
}

fn encrypt<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let options = AuthOptions {
        allow_device_credential: false,
        title: Some("S2: encrypt".into()),
        data_to_encrypt: Some(TEST_SECRET.into()),
        ..Default::default()
    };
    let sealed = app
        .biometric()
        .biometric_cipher("Spike test".into(), options)
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(FILES).map_err(|e| e.to_string())?;
    fs::write(path("s2.blob"), &sealed.data).map_err(|e| e.to_string())?;
    Ok(format!("encrypted, {} characters saved", sealed.data.len()))
}

fn decrypt<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    let sealed = fs::read_to_string(path("s2.blob")).map_err(|_| "encrypt first".to_owned())?;
    let options = AuthOptions {
        allow_device_credential: false,
        title: Some("S2: decrypt".into()),
        data_to_decrypt: Some(sealed),
        ..Default::default()
    };
    let opened = app
        .biometric()
        .biometric_cipher("Spike test".into(), options)
        .map_err(|e| e.to_string())?;
    if opened.data == TEST_SECRET {
        Ok("decrypted, and it matches".into())
    } else {
        Err("decrypted, but it DOESN'T match".into())
    }
}

#[tauri::command]
pub async fn spike_encrypt<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    recorded(app, "S2 encrypt", encrypt::<R>).await
}

#[tauri::command]
pub async fn spike_decrypt<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    recorded(app, "S2 decrypt", decrypt::<R>).await
}

#[tauri::command]
pub async fn spike_timing<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    recorded(app, "S3 in the app", |_| derive_times()).await
}
