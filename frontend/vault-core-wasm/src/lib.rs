//! `vault-core` for the browser. The apps call `vault-core` directly from Rust.
//!
//! Keys stay in WebAssembly memory, and nothing here hands the vault key or a KEK to
//! JavaScript. `tests/vault.test.mjs` lists everything JavaScript can call, so adding
//! to that surface has to be deliberate. This prevents accidents, like a key ending up
//! in a log or in app state. It doesn't stop a hostile script running in the page,
//! which can read WebAssembly memory directly. Keeping such scripts out is the job of
//! the content security policy.
//!
//! Freeing a vault leaves nothing behind in that memory, which
//! `tests/memory.test.mjs` checks by searching all of it. What JavaScript was given is
//! beyond reach, so locking also has to drop those strings and hope the collector runs.
//!
//! A failed call throws an `Error` whose message is the `vault_core::Error` variant,
//! such as `DecryptionFailed`, for the caller to branch on.
#![warn(missing_docs)]

use std::alloc::{GlobalAlloc, Layout, System};
use std::hint::black_box;

use serde_json::Value;
use vault_core::{Entry, Error, KdfParams, RecoveryKey};
use wasm_bindgen::prelude::*;

/// Wipes every block as it's freed. The glue code frees each string it has copied out to
/// JavaScript and each secret it copied in, and without this a recovery key or a
/// decrypted password stays in freed memory until something happens to overwrite it.
struct WipingAllocator;

// SAFETY: every call goes straight to `System`, whose contract is the same. The only
// addition is overwriting a block that the caller has just given up, whose `layout` is
// by contract the one it was allocated with.
unsafe impl GlobalAlloc for WipingAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        unsafe { System.alloc(layout) }
    }

    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        unsafe {
            ptr.write_bytes(0, layout.size());
            // Otherwise the writes could be optimised away as dead.
            System.dealloc(black_box(ptr), layout);
        }
    }

    // `realloc` keeps the trait's default, which allocates, copies and calls `dealloc`,
    // so the old block is wiped too. `System.realloc` wouldn't do that.
}

#[global_allocator]
static ALLOCATOR: WipingAllocator = WipingAllocator;

fn to_js(error: Error) -> JsError {
    JsError::new(&format!("{error:?}"))
}

/// A new random salt for an account, as base64url.
#[wasm_bindgen(js_name = newSalt)]
pub fn new_salt() -> Result<String, JsError> {
    vault_core::new_salt().map_err(to_js)
}

/// A new id for an entry.
#[wasm_bindgen(js_name = newItemId)]
pub fn new_item_id() -> Result<String, JsError> {
    vault_core::new_item_id().map_err(to_js)
}

/// What new accounts use, as JSON.
#[wasm_bindgen(js_name = defaultKdfParams)]
pub fn default_kdf_params() -> Result<String, JsError> {
    serde_json::to_string(&KdfParams::default()).map_err(|_| to_js(Error::InvalidKdfParams))
}

/// Proves to the server that a recovery key is held. A mistyped key throws
/// `InvalidRecoveryKey` here, before the server is asked.
#[wasm_bindgen(js_name = recoveryAuthOf)]
pub fn recovery_auth_of(recovery_key: &str) -> Result<String, JsError> {
    let parsed = RecoveryKey::parse(recovery_key).map_err(to_js)?;
    Ok(parsed.recovery_auth().to_string())
}

/// What a master password turns into. Holds the KEK, which never crosses to JavaScript.
#[wasm_bindgen]
pub struct DerivedKeys(vault_core::DerivedKeys);

#[wasm_bindgen]
impl DerivedKeys {
    /// Runs Argon2id, so it takes seconds; call it from a worker. `kdf_params` is JSON
    /// from the server, and out-of-range values throw `InvalidKdfParams`.
    pub fn derive(
        master_password: &str,
        salt: &str,
        kdf_params: &str,
    ) -> Result<DerivedKeys, JsError> {
        let params: KdfParams =
            serde_json::from_str(kdf_params).map_err(|_| to_js(Error::InvalidKdfParams))?;
        vault_core::derive_keys(master_password, salt, &params)
            .map(DerivedKeys)
            .map_err(to_js)
    }

    /// What to send the server at login.
    #[wasm_bindgen(js_name = authKey)]
    pub fn auth_key(&self) -> String {
        self.0.auth_key.to_base64url().to_string()
    }

    /// Makes a vault and its recovery key.
    #[wasm_bindgen(js_name = createVault)]
    pub fn create_vault(&self) -> Result<NewVault, JsError> {
        vault_core::create_vault(&self.0.kek)
            .map(NewVault)
            .map_err(to_js)
    }

    /// Opens a vault. A wrong password throws `DecryptionFailed`.
    pub fn unlock(&self, wrapped_vault_key: &str) -> Result<Vault, JsError> {
        vault_core::unwrap_vault_key(&self.0.kek, wrapped_vault_key)
            .map(Vault)
            .map_err(to_js)
    }
}

/// What setup produces. Send the wrapped keys and `recoveryAuth` to the server, show
/// `recoveryKey` to the user once, then call `takeVault`.
#[wasm_bindgen]
pub struct NewVault(vault_core::NewVault);

#[wasm_bindgen]
impl NewVault {
    /// The vault key, wrapped for the master password.
    #[wasm_bindgen(getter, js_name = wrappedVaultKey)]
    pub fn wrapped_vault_key(&self) -> String {
        self.0.wrapped_vault_key.clone()
    }

    /// The vault key, wrapped for the recovery key.
    #[wasm_bindgen(getter, js_name = wrappedVaultKeyRecovery)]
    pub fn wrapped_vault_key_recovery(&self) -> String {
        self.0.recovery.wrapped_vault_key_recovery.clone()
    }

    /// Sent to the server, which stores a hash of it.
    #[wasm_bindgen(getter, js_name = recoveryAuth)]
    pub fn recovery_auth(&self) -> String {
        self.0.recovery.recovery_auth.to_string()
    }

    /// For the user to print.
    #[wasm_bindgen(getter, js_name = recoveryKey)]
    pub fn recovery_key(&self) -> String {
        self.0.recovery.recovery_key.to_display().to_string()
    }

    /// The open vault. This object can't be used afterwards.
    #[wasm_bindgen(js_name = takeVault)]
    pub fn take_vault(self) -> Vault {
        Vault(self.0.vault_key)
    }
}

/// A replacement recovery key. Send the wrapped key and `recoveryAuth` to the server, and
/// show `recoveryKey` to the user once.
#[wasm_bindgen]
pub struct NewRecovery(vault_core::NewRecovery);

#[wasm_bindgen]
impl NewRecovery {
    /// The vault key, wrapped for the recovery key.
    #[wasm_bindgen(getter, js_name = wrappedVaultKeyRecovery)]
    pub fn wrapped_vault_key_recovery(&self) -> String {
        self.0.wrapped_vault_key_recovery.clone()
    }

    /// Sent to the server, which stores a hash of it.
    #[wasm_bindgen(getter, js_name = recoveryAuth)]
    pub fn recovery_auth(&self) -> String {
        self.0.recovery_auth.to_string()
    }

    /// For the user to print.
    #[wasm_bindgen(getter, js_name = recoveryKey)]
    pub fn recovery_key(&self) -> String {
        self.0.recovery_key.to_display().to_string()
    }
}

/// An open vault. `free()` wipes the vault key, and is how locking works.
#[wasm_bindgen]
pub struct Vault(vault_core::VaultKey);

#[wasm_bindgen]
impl Vault {
    /// Opens a vault with the recovery key, after a forgotten master password.
    #[wasm_bindgen(js_name = unlockWithRecovery)]
    pub fn unlock_with_recovery(recovery_key: &str, wrapped: &str) -> Result<Vault, JsError> {
        let parsed = RecoveryKey::parse(recovery_key).map_err(to_js)?;
        vault_core::unwrap_with_recovery(&parsed, wrapped)
            .map(Vault)
            .map_err(to_js)
    }

    /// Wraps the vault key for new keys. Changing the master password is this and
    /// nothing more.
    pub fn rewrap(&self, keys: &DerivedKeys) -> Result<String, JsError> {
        vault_core::rewrap_vault_key(&keys.0.kek, &self.0).map_err(to_js)
    }

    /// Makes a new recovery key, such as after the old one is lost.
    #[wasm_bindgen(js_name = createRecovery)]
    pub fn create_recovery(&self) -> Result<NewRecovery, JsError> {
        vault_core::create_recovery_key(&self.0)
            .map(NewRecovery)
            .map_err(to_js)
    }

    /// Encrypts an entry, given as JSON, for one id.
    #[wasm_bindgen(js_name = encryptEntry)]
    pub fn encrypt_entry(&self, item_id: &str, entry_json: &str) -> Result<String, JsError> {
        let entry: Entry =
            serde_json::from_str(entry_json).map_err(|_| to_js(Error::InvalidEntry))?;
        vault_core::encrypt_entry(&self.0, item_id, &entry).map_err(to_js)
    }

    /// The whole entry as JSON, password included, for editing it. Prefer
    /// `decryptSummary` when the password isn't needed.
    #[wasm_bindgen(js_name = decryptEntry)]
    pub fn decrypt_entry(&self, item_id: &str, ciphertext: &str) -> Result<String, JsError> {
        let entry = vault_core::decrypt_entry(&self.0, item_id, ciphertext).map_err(to_js)?;
        serde_json::to_string(&entry).map_err(|_| to_js(Error::InvalidEntry))
    }

    /// The entry as JSON without its password, for lists and search.
    #[wasm_bindgen(js_name = decryptSummary)]
    pub fn decrypt_summary(&self, item_id: &str, ciphertext: &str) -> Result<String, JsError> {
        let entry = vault_core::decrypt_entry(&self.0, item_id, ciphertext).map_err(to_js)?;
        let mut summary = serde_json::to_value(&entry).map_err(|_| to_js(Error::InvalidEntry))?;
        if let Value::Object(fields) = &mut summary {
            fields.remove("password");
        }
        Ok(summary.to_string())
    }

    /// Just the password, for revealing or copying it.
    #[wasm_bindgen(js_name = decryptPassword)]
    pub fn decrypt_password(&self, item_id: &str, ciphertext: &str) -> Result<String, JsError> {
        let entry = vault_core::decrypt_entry(&self.0, item_id, ciphertext).map_err(to_js)?;
        Ok(entry.password.clone())
    }
}
