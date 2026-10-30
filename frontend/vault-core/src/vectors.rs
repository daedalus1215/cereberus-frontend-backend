//! Holds the crate to `testdata/vectors.json`, written by a second implementation of
//! the format (`testdata/generate-vectors.mjs`). A failure here means vaults already
//! written might no longer open: fix the code, don't regenerate the file.

use data_encoding::BASE64URL_NOPAD;
use serde_json::Value;

use crate::Error;
use crate::entry::{Entry, decrypt_entry, encrypt_entry_with_nonce};
use crate::envelope::{NONCE_LEN, seal_with_nonce};
use crate::kdf::{KdfParams, Kek, derive_keys};
use crate::secret::{KEY_LEN, KeyBytes};
use crate::vault::{
    AAD_RECOVERY_VAULT_KEY, AAD_VAULT_KEY, RecoveryKey, VaultKey, unwrap_vault_key,
    unwrap_with_recovery,
};

fn vectors() -> Value {
    serde_json::from_str(include_str!("../testdata/vectors.json")).unwrap()
}

fn text(value: &Value) -> &str {
    value.as_str().unwrap()
}

fn key_bytes(value: &Value) -> [u8; KEY_LEN] {
    BASE64URL_NOPAD
        .decode(text(value).as_bytes())
        .unwrap()
        .try_into()
        .unwrap()
}

fn key(value: &Value) -> KeyBytes {
    KeyBytes::from_slice(&key_bytes(value)).unwrap()
}

fn nonce_bytes(value: &Value) -> [u8; NONCE_LEN] {
    BASE64URL_NOPAD
        .decode(text(value).as_bytes())
        .unwrap()
        .try_into()
        .unwrap()
}

#[test]
fn key_derivation_matches() {
    let vectors = vectors();
    let cases = vectors["kdf"].as_array().unwrap();
    assert!(cases.len() >= 8);
    for case in cases {
        let name = text(&case["name"]);
        let params: KdfParams = serde_json::from_value(case["params"].clone()).unwrap();
        let keys = derive_keys(text(&case["password"]), text(&case["salt"]), &params).unwrap();
        assert_eq!(
            keys.auth_key.to_base64url().as_str(),
            text(&case["authKey"]),
            "{name}"
        );
        assert_eq!(keys.kek.0.as_array(), &key_bytes(&case["kek"]), "{name}");

        let unwrapped = unwrap_vault_key(&keys.kek, text(&case["wrappedVaultKey"])).unwrap();
        assert_eq!(
            unwrapped.0.as_array(),
            &key_bytes(&vectors["entries"]["vaultKey"]),
            "{name}"
        );
    }
}

#[test]
fn the_vectors_exercise_normalisation() {
    let vectors = vectors();
    let kek_of = |name: &str| {
        let cases = vectors["kdf"].as_array().unwrap();
        let case = cases.iter().find(|case| case["name"] == name).unwrap();
        text(&case["kek"]).to_string()
    };
    assert_eq!(
        kek_of("accents, precomposed"),
        kek_of("accents, decomposed")
    );
    assert_eq!(
        kek_of("a compatibility ligature"),
        kek_of("what that ligature normalises to")
    );
}

#[test]
fn parameters_outside_the_range_are_refused() {
    let vectors = vectors();
    let cases = vectors["refusedParams"].as_array().unwrap();
    assert!(cases.len() >= 7);
    for case in cases {
        let params: KdfParams = serde_json::from_value(case.clone()).unwrap();
        assert_eq!(
            params.validate(),
            Err(Error::InvalidKdfParams),
            "{params:?}"
        );
    }
}

#[test]
fn wrapping_the_vault_key_matches() {
    let vectors = vectors();
    let wrap = &vectors["wrap"];
    let kek = Kek(key(&wrap["kek"]));
    let vault_key = key_bytes(&wrap["vaultKey"]);

    let sealed = seal_with_nonce(
        kek.0.as_array(),
        &nonce_bytes(&wrap["nonce"]),
        AAD_VAULT_KEY,
        &vault_key,
    )
    .unwrap();
    assert_eq!(sealed, text(&wrap["wrappedVaultKey"]));

    let unwrapped = unwrap_vault_key(&kek, text(&wrap["wrappedVaultKey"])).unwrap();
    assert_eq!(unwrapped.0.as_array(), &vault_key);
}

#[test]
fn the_recovery_key_matches() {
    let vectors = vectors();
    let recovery = &vectors["recovery"];
    let display = text(&recovery["display"]);
    let vault_key = key_bytes(&recovery["vaultKey"]);

    let key = RecoveryKey::parse(display).unwrap();
    assert_eq!(key.to_display().as_str(), display);
    assert_eq!(key.bytes(), &key_bytes(&recovery["key"]));
    assert_eq!(
        key.recovery_auth().as_str(),
        text(&recovery["recoveryAuth"])
    );

    let sealed = seal_with_nonce(
        key.kek().as_array(),
        &nonce_bytes(&recovery["nonce"]),
        AAD_RECOVERY_VAULT_KEY,
        &vault_key,
    )
    .unwrap();
    assert_eq!(sealed, text(&recovery["wrappedVaultKeyRecovery"]));

    let unwrapped = unwrap_with_recovery(&key, text(&recovery["wrappedVaultKeyRecovery"])).unwrap();
    assert_eq!(unwrapped.0.as_array(), &vault_key);
}

#[test]
fn entries_match_in_both_directions() {
    let vectors = vectors();
    let entries = &vectors["entries"];
    let vault_key = VaultKey(key(&entries["vaultKey"]));
    let nonce = nonce_bytes(&entries["nonce"]);
    let cases = entries["cases"].as_array().unwrap();
    assert!(cases.len() >= 6);

    for case in cases {
        let name = text(&case["name"]);
        let id = text(&case["itemId"]);
        let ciphertext = text(&case["ciphertext"]);
        let expected: Entry = serde_json::from_str(text(&case["json"])).unwrap();

        assert_eq!(
            decrypt_entry(&vault_key, id, ciphertext).unwrap(),
            expected,
            "{name}"
        );
        assert_eq!(
            encrypt_entry_with_nonce(&vault_key, id, &expected, &nonce).unwrap(),
            ciphertext,
            "{name}"
        );
    }
}

#[test]
fn what_must_fail_fails_for_the_right_reason() {
    let vectors = vectors();
    let vault_key = VaultKey(key(&vectors["entries"]["vaultKey"]));
    let cases = vectors["mustFail"].as_array().unwrap();
    assert!(cases.len() >= 11);

    for case in cases {
        let error = decrypt_entry(&vault_key, text(&case["itemId"]), text(&case["ciphertext"]))
            .unwrap_err();
        assert_eq!(
            format!("{error:?}"),
            text(&case["error"]),
            "{}",
            text(&case["name"])
        );
    }
}
