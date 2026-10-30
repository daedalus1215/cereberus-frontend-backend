use data_encoding::{BASE64URL_NOPAD, Encoding, Specification};
use sha2::{Digest, Sha256};
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::Error;
use crate::envelope::{open, seal};
use crate::kdf::{KEY_LEN, Kek, derive_subkey};

pub(crate) const AAD_VAULT_KEY: &[u8] = b"cereberus/v1/vault-key";
pub(crate) const AAD_RECOVERY_VAULT_KEY: &[u8] = b"cereberus/v1/recovery-vault-key";
const INFO_RECOVERY_KEK: &[u8] = b"cereberus/v1/recovery-kek";
const INFO_RECOVERY_AUTH: &[u8] = b"cereberus/v1/recovery-auth";
const RECOVERY_CHECK_PREFIX: &[u8] = b"cereberus/v1/recovery-check";

const RECOVERY_CHECK_LEN: usize = 2;
const RECOVERY_GROUP_LEN: usize = 5;

/// Encrypts every entry. Made once at setup; a new master password only rewraps it,
/// so entries are never re-encrypted.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct VaultKey(pub(crate) [u8; KEY_LEN]);

/// The way back in after forgetting the master password. Shown once, for the user to
/// print; nothing stores it.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct RecoveryKey([u8; KEY_LEN]);

impl RecoveryKey {
    /// The form the user prints: Crockford base32 in groups of 5, ending in a
    /// checksum, like `7KQ2M-...`.
    pub fn to_display(&self) -> Zeroizing<String> {
        let mut payload = Zeroizing::new([0u8; KEY_LEN + RECOVERY_CHECK_LEN]);
        payload[..KEY_LEN].copy_from_slice(&self.0);
        payload[KEY_LEN..].copy_from_slice(&recovery_check(&self.0));
        let encoded = Zeroizing::new(crockford().encode(payload.as_slice()));

        let groups: Vec<&str> = encoded
            .as_bytes()
            .chunks(RECOVERY_GROUP_LEN)
            .map(|group| std::str::from_utf8(group).expect("base32 is ASCII"))
            .collect();
        Zeroizing::new(groups.join("-"))
    }

    /// Reads back what the user typed. Forgiving about case, spaces and hyphens, and
    /// about the letters that look like digits. A typo fails here, with
    /// [`Error::InvalidRecoveryKey`], rather than looking like the wrong key.
    pub fn parse(text: &str) -> Result<Self, Error> {
        let cleaned = Zeroizing::new(
            text.chars()
                .filter(|c| !c.is_whitespace() && *c != '-')
                .collect::<String>(),
        );
        let payload = Zeroizing::new(
            crockford()
                .decode(cleaned.as_bytes())
                .map_err(|_| Error::InvalidRecoveryKey)?,
        );
        if payload.len() != KEY_LEN + RECOVERY_CHECK_LEN {
            return Err(Error::InvalidRecoveryKey);
        }
        let mut key = [0u8; KEY_LEN];
        key.copy_from_slice(&payload[..KEY_LEN]);
        let key = RecoveryKey(key);
        if payload[KEY_LEN..] != recovery_check(&key.0) {
            return Err(Error::InvalidRecoveryKey);
        }
        Ok(key)
    }

    /// Proves to the server that this key is held, without giving the key away. The
    /// server stores a hash of it.
    pub fn recovery_auth(&self) -> Zeroizing<String> {
        let auth = derive_subkey(&self.0, INFO_RECOVERY_AUTH);
        Zeroizing::new(BASE64URL_NOPAD.encode(auth.as_slice()))
    }

    pub(crate) fn kek(&self) -> Zeroizing<[u8; KEY_LEN]> {
        derive_subkey(&self.0, INFO_RECOVERY_KEK)
    }

    #[cfg(test)]
    pub(crate) fn bytes(&self) -> &[u8; KEY_LEN] {
        &self.0
    }
}

fn recovery_check(key: &[u8; KEY_LEN]) -> [u8; RECOVERY_CHECK_LEN] {
    let digest = Sha256::new()
        .chain_update(RECOVERY_CHECK_PREFIX)
        .chain_update(key)
        .finalize();
    [digest[0], digest[1]]
}

/// Crockford's alphabet leaves out I, L, O and U, so it survives being read off paper.
fn crockford() -> Encoding {
    let mut spec = Specification::new();
    spec.symbols.push_str("0123456789ABCDEFGHJKMNPQRSTVWXYZ");
    spec.translate.from.push_str("abcdefghjkmnpqrstvwxyzoOiIlL");
    spec.translate.to.push_str("ABCDEFGHJKMNPQRSTVWXYZ001111");
    spec.encoding().expect("the alphabet is valid")
}

/// A recovery key and what the server needs in order to use it later.
pub struct NewRecovery {
    /// Show this to the user once. Nothing keeps it.
    pub recovery_key: RecoveryKey,
    /// The vault key, wrapped for the recovery key. Stored on the server.
    pub wrapped_vault_key_recovery: String,
    /// Sent to the server, which stores a hash of it.
    pub recovery_auth: Zeroizing<String>,
}

/// Everything setup produces.
pub struct NewVault {
    /// Encrypts entries. Stays in memory.
    pub vault_key: VaultKey,
    /// The vault key, wrapped for the master password. Stored on the server.
    pub wrapped_vault_key: String,
    /// The recovery key that was made alongside it.
    pub recovery: NewRecovery,
}

/// Makes a vault key and its recovery key. Together, so a vault can't exist without
/// a way back in.
pub fn create_vault(kek: &Kek) -> Result<NewVault, Error> {
    let mut bytes = Zeroizing::new([0u8; KEY_LEN]);
    getrandom::fill(bytes.as_mut_slice()).map_err(|_| Error::RandomUnavailable)?;
    let vault_key = VaultKey(*bytes);

    Ok(NewVault {
        wrapped_vault_key: rewrap_vault_key(kek, &vault_key)?,
        recovery: create_recovery_key(&vault_key)?,
        vault_key,
    })
}

/// Makes a new recovery key for an existing vault, such as after the old one is lost.
pub fn create_recovery_key(vault_key: &VaultKey) -> Result<NewRecovery, Error> {
    let mut bytes = Zeroizing::new([0u8; KEY_LEN]);
    getrandom::fill(bytes.as_mut_slice()).map_err(|_| Error::RandomUnavailable)?;
    let recovery_key = RecoveryKey(*bytes);

    Ok(NewRecovery {
        wrapped_vault_key_recovery: seal(
            &recovery_key.kek(),
            AAD_RECOVERY_VAULT_KEY,
            &vault_key.0,
        )?,
        recovery_auth: recovery_key.recovery_auth(),
        recovery_key,
    })
}

/// Wraps the vault key for a KEK. Changing the master password is this and nothing
/// more.
pub fn rewrap_vault_key(kek: &Kek, vault_key: &VaultKey) -> Result<String, Error> {
    seal(&kek.0, AAD_VAULT_KEY, &vault_key.0)
}

/// Unlocks with the master password's KEK. A wrong password fails here.
pub fn unwrap_vault_key(kek: &Kek, wrapped: &str) -> Result<VaultKey, Error> {
    vault_key_from(&open(&kek.0, AAD_VAULT_KEY, wrapped)?)
}

/// Unlocks with the recovery key, after a forgotten master password.
pub fn unwrap_with_recovery(recovery_key: &RecoveryKey, wrapped: &str) -> Result<VaultKey, Error> {
    vault_key_from(&open(&recovery_key.kek(), AAD_RECOVERY_VAULT_KEY, wrapped)?)
}

fn vault_key_from(bytes: &[u8]) -> Result<VaultKey, Error> {
    let bytes: [u8; KEY_LEN] = bytes.try_into().map_err(|_| Error::MalformedCiphertext)?;
    Ok(VaultKey(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use static_assertions::assert_not_impl_any;

    assert_not_impl_any!(VaultKey: std::fmt::Debug, Clone, Serialize);
    assert_not_impl_any!(RecoveryKey: std::fmt::Debug, Clone, Serialize);
    assert_not_impl_any!(NewVault: std::fmt::Debug, Clone, Serialize);
    assert_not_impl_any!(NewRecovery: std::fmt::Debug, Clone, Serialize);

    fn kek(byte: u8) -> Kek {
        Kek([byte; KEY_LEN])
    }

    #[test]
    fn the_master_password_unlocks_a_new_vault() {
        let vault = create_vault(&kek(1)).unwrap();
        let unwrapped = unwrap_vault_key(&kek(1), &vault.wrapped_vault_key).unwrap();
        assert_eq!(unwrapped.0, vault.vault_key.0);
    }

    #[test]
    fn the_wrong_master_password_doesnt() {
        let vault = create_vault(&kek(1)).unwrap();
        assert_eq!(
            unwrap_vault_key(&kek(2), &vault.wrapped_vault_key).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn vaults_get_different_keys() {
        let a = create_vault(&kek(1)).unwrap();
        let b = create_vault(&kek(1)).unwrap();
        assert_ne!(a.vault_key.0, b.vault_key.0);
        assert_ne!(a.recovery.recovery_key.0, b.recovery.recovery_key.0);
    }

    #[test]
    fn changing_the_master_password_keeps_the_vault_key() {
        let vault = create_vault(&kek(1)).unwrap();
        let rewrapped = rewrap_vault_key(&kek(2), &vault.vault_key).unwrap();

        assert_eq!(
            unwrap_vault_key(&kek(2), &rewrapped).unwrap().0,
            vault.vault_key.0
        );
        assert_eq!(
            unwrap_vault_key(&kek(1), &rewrapped).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn the_recovery_key_unlocks_the_vault() {
        let vault = create_vault(&kek(1)).unwrap();
        let unwrapped = unwrap_with_recovery(
            &vault.recovery.recovery_key,
            &vault.recovery.wrapped_vault_key_recovery,
        )
        .unwrap();
        assert_eq!(unwrapped.0, vault.vault_key.0);
    }

    #[test]
    fn another_vaults_recovery_key_doesnt() {
        let a = create_vault(&kek(1)).unwrap();
        let b = create_vault(&kek(1)).unwrap();
        assert_eq!(
            unwrap_with_recovery(
                &b.recovery.recovery_key,
                &a.recovery.wrapped_vault_key_recovery
            )
            .err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn the_two_wraps_cant_be_swapped() {
        let vault = create_vault(&kek(1)).unwrap();
        // Wrapped under the same key material, so only the aad tells them apart.
        let recovery_kek = Kek(*vault.recovery.recovery_key.kek());
        assert_eq!(
            unwrap_vault_key(&recovery_kek, &vault.recovery.wrapped_vault_key_recovery).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn a_replacement_recovery_key_works_and_is_different() {
        let vault = create_vault(&kek(1)).unwrap();
        let replacement = create_recovery_key(&vault.vault_key).unwrap();
        assert_ne!(replacement.recovery_key.0, vault.recovery.recovery_key.0);
        assert_eq!(
            unwrap_with_recovery(
                &replacement.recovery_key,
                &replacement.wrapped_vault_key_recovery
            )
            .unwrap()
            .0,
            vault.vault_key.0
        );
    }

    #[test]
    fn the_recovery_key_survives_being_printed() {
        let key = RecoveryKey([9; KEY_LEN]);
        let display = key.to_display();
        assert_eq!(RecoveryKey::parse(&display).unwrap().0, key.0);
    }

    #[test]
    fn the_recovery_key_is_readable() {
        let display = RecoveryKey([9; KEY_LEN]).to_display();
        let groups: Vec<&str> = display.split('-').collect();
        assert_eq!(groups.len(), 11);
        assert!(groups.iter().all(|group| group.len() == 5));
        assert!(
            display
                .chars()
                .all(|c| c == '-' || "0123456789ABCDEFGHJKMNPQRSTVWXYZ".contains(c))
        );
    }

    #[test]
    fn sloppy_typing_is_forgiven() {
        let key = RecoveryKey([0; KEY_LEN]);
        let display = key.to_display();
        let sloppy = format!(
            " {} \n",
            display.to_lowercase().replace('-', " ").replace('0', "o")
        );
        assert_eq!(RecoveryKey::parse(&sloppy).unwrap().0, key.0);
    }

    #[test]
    fn a_typo_is_caught_before_the_server_is_asked() {
        let display = RecoveryKey([9; KEY_LEN]).to_display();
        let first = display.chars().next().unwrap();
        let wrong = if first == 'A' { 'B' } else { 'A' };
        let typo = format!("{wrong}{}", &display[1..]);
        assert_eq!(
            RecoveryKey::parse(&typo).err(),
            Some(Error::InvalidRecoveryKey)
        );
    }

    #[test]
    fn garbage_isnt_a_recovery_key() {
        for text in [
            "",
            "   ",
            "-----",
            "UUUUU",
            "tooshort",
            "émoji 🔑",
            &"0".repeat(200),
        ] {
            assert_eq!(
                RecoveryKey::parse(text).err(),
                Some(Error::InvalidRecoveryKey),
                "{text}"
            );
        }
    }

    #[test]
    fn recovery_auth_is_stable_and_isnt_the_key() {
        let key = RecoveryKey([9; KEY_LEN]);
        assert_eq!(*key.recovery_auth(), *key.recovery_auth());
        assert_eq!(key.recovery_auth().len(), 43);
        assert!(!key.to_display().contains(key.recovery_auth().as_str()));
        assert_ne!(
            *key.recovery_auth(),
            *RecoveryKey([8; KEY_LEN]).recovery_auth()
        );
    }

    #[test]
    fn garbage_doesnt_unwrap() {
        for wrapped in ["", "cv1.", "cv2.AAAA", "not a key"] {
            assert!(unwrap_vault_key(&kek(1), wrapped).is_err());
        }
    }

    #[test]
    fn a_wrapped_value_of_the_wrong_length_is_refused() {
        let short = seal(&[1; KEY_LEN], AAD_VAULT_KEY, &[0; 16]).unwrap();
        assert_eq!(
            unwrap_vault_key(&kek(1), &short).err(),
            Some(Error::MalformedCiphertext)
        );
    }
}
