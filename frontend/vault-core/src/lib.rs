//! All of Cereberus's vault encryption, used natively by the desktop and Android
//! apps and as WebAssembly by the browser, so it's only ever written once.
//!
//! The server never sees a master password, a vault key or a decrypted field. The
//! design, what it protects against and what it doesn't are in
//! `specs/encrypted-vault-sync/spec-1-crypto-core.md`.
//!
//! ```text
//! master password + salt  --Argon2id-->  master key
//! master key  --HKDF-->  auth key (sent at login)
//! master key  --HKDF-->  KEK      (never sent), wraps the vault key
//! recovery key           --HKDF-->  a second wrap of the vault key
//! vault key   encrypts each entry
//! ```
//!
//! Key types have no `Debug`, `Clone` or `Serialize`, and they and [`Entry`] wipe
//! themselves on drop. That wiping is best effort: moves can leave copies on the
//! stack, and an allocator's earlier buffers aren't reachable from here.
#![forbid(unsafe_code)]
#![warn(missing_docs)]

mod entry;
mod envelope;
mod error;
mod kdf;
mod vault;
#[cfg(test)]
mod vectors;

pub use entry::{ENTRY_VERSION, Entry, decrypt_entry, encrypt_entry, new_item_id};
pub use error::Error;
pub use kdf::{AuthKey, DerivedKeys, KdfAlgorithm, KdfParams, Kek, derive_keys, new_salt};
pub use vault::{
    NewRecovery, NewVault, RecoveryKey, VaultKey, create_recovery_key, create_vault,
    rewrap_vault_key, unwrap_vault_key, unwrap_with_recovery,
};
