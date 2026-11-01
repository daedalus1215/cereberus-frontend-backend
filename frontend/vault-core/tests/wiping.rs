//! Whether secrets are wiped before their memory is freed. The desktop and Android apps
//! rely on this directly, without the wiping allocator the WebAssembly build has, so it's
//! checked here by an allocator that inspects each block as it's freed.
//!
//! Scrubbing the stack is checked in `vault-core-wasm/tests/memory.test.mjs`, where all
//! of memory can be searched.

use std::alloc::{GlobalAlloc, Layout, System};
use std::slice;
use std::sync::atomic::{AtomicBool, AtomicU8, AtomicUsize, Ordering};

use data_encoding::BASE64URL_NOPAD;
use serde_json::Value;
use vault_core::{KdfParams, RecoveryKey, decrypt_entry, derive_keys, unwrap_vault_key};

const MAX_NEEDLE: usize = 128;

static WATCHING: AtomicBool = AtomicBool::new(false);
static NEEDLE: [AtomicU8; MAX_NEEDLE] = [const { AtomicU8::new(0) }; MAX_NEEDLE];
static NEEDLE_LEN: AtomicUsize = AtomicUsize::new(0);
static SIGHTINGS: AtomicUsize = AtomicUsize::new(0);

struct Inspecting;

// SAFETY: every call goes straight to `System`. Reading a block just before it's freed
// is reading memory this allocator handed out. Some of it may never have been written,
// which only matters to the comparison below.
unsafe impl GlobalAlloc for Inspecting {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        unsafe { System.alloc(layout) }
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        if WATCHING.load(Ordering::SeqCst) {
            let len = NEEDLE_LEN.load(Ordering::SeqCst);
            let mut needle = [0u8; MAX_NEEDLE];
            for (byte, stored) in needle.iter_mut().zip(&NEEDLE).take(len) {
                *byte = stored.load(Ordering::SeqCst);
            }
            let block = unsafe { slice::from_raw_parts(ptr, layout.size()) };
            if block.windows(len).any(|window| window == &needle[..len]) {
                SIGHTINGS.fetch_add(1, Ordering::SeqCst);
            }
        }
        unsafe { System.dealloc(ptr, layout) }
    }
}

#[global_allocator]
static ALLOCATOR: Inspecting = Inspecting;

/// How many freed blocks still held `secret` when `value` was dropped.
fn sightings_of<T>(secret: &[u8], value: T) -> usize {
    assert!(!secret.is_empty() && secret.len() <= MAX_NEEDLE);
    for (stored, byte) in NEEDLE.iter().zip(secret) {
        stored.store(*byte, Ordering::SeqCst);
    }
    NEEDLE_LEN.store(secret.len(), Ordering::SeqCst);
    SIGHTINGS.store(0, Ordering::SeqCst);

    WATCHING.store(true, Ordering::SeqCst);
    drop(value);
    WATCHING.store(false, Ordering::SeqCst);

    SIGHTINGS.load(Ordering::SeqCst)
}

fn raw(value: &Value) -> Vec<u8> {
    BASE64URL_NOPAD
        .decode(value.as_str().unwrap().as_bytes())
        .unwrap()
}

// One test, because the allocator is global and these steps mustn't overlap.
#[test]
fn secrets_are_wiped_before_their_memory_is_freed() {
    let vectors: Value = serde_json::from_str(include_str!("../testdata/vectors.json")).unwrap();

    // The control: without this, every check below could be passing by not looking.
    let unwiped: Vec<u8> = b"a secret nobody wiped".to_vec();
    let needle = unwiped.clone();
    assert_eq!(sightings_of(&needle, unwiped), 1, "the inspection works");

    let case = &vectors["kdf"][0];
    let params: KdfParams = serde_json::from_value(case["params"].clone()).unwrap();
    let derive = || {
        derive_keys(
            case["password"].as_str().unwrap(),
            case["salt"].as_str().unwrap(),
            &params,
        )
        .unwrap()
    };

    let kek = raw(&case["kek"]);
    assert_eq!(sightings_of(&kek, derive().kek), 0, "the KEK");

    let auth_key = raw(&case["authKey"]);
    assert_eq!(
        sightings_of(&auth_key, derive().auth_key),
        0,
        "the auth key"
    );

    let keys = derive();
    let auth_text = keys.auth_key.to_base64url();
    assert_eq!(
        sightings_of(auth_text.clone().as_bytes(), auth_text),
        0,
        "the auth key as text"
    );

    let vault_key = raw(&vectors["entries"]["vaultKey"]);
    let opened = unwrap_vault_key(&keys.kek, case["wrappedVaultKey"].as_str().unwrap()).unwrap();
    let entry_case = &vectors["entries"]["cases"][1];
    let entry = decrypt_entry(
        &opened,
        entry_case["itemId"].as_str().unwrap(),
        entry_case["ciphertext"].as_str().unwrap(),
    )
    .unwrap();
    assert_eq!(sightings_of(&vault_key, opened), 0, "the vault key");

    // What's in an entry, field by field. Each is copied out first, into memory that
    // outlives the watching.
    let password = entry.password.clone();
    let username = entry.username.clone();
    let notes = entry.notes.clone();
    let tag = entry.tags[0].clone();
    let conflict_of = entry.conflict_of.clone().unwrap();
    assert_eq!(
        sightings_of(password.as_bytes(), entry.clone()),
        0,
        "password"
    );
    assert_eq!(
        sightings_of(username.as_bytes(), entry.clone()),
        0,
        "username"
    );
    assert_eq!(sightings_of(notes.as_bytes(), entry.clone()), 0, "notes");
    assert_eq!(sightings_of(tag.as_bytes(), entry.clone()), 0, "tag");
    assert_eq!(sightings_of(conflict_of.as_bytes(), entry), 0, "conflictOf");

    let recovery = &vectors["recovery"];
    let display = recovery["display"].as_str().unwrap();
    let recovery_key = raw(&recovery["key"]);
    assert_eq!(
        sightings_of(&recovery_key, RecoveryKey::parse(display).unwrap()),
        0,
        "the recovery key"
    );
    let parsed = RecoveryKey::parse(display).unwrap();
    assert_eq!(
        sightings_of(display.as_bytes(), parsed.to_display()),
        0,
        "the recovery key as text"
    );
}
