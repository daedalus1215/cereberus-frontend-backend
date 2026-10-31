use argon2::{Algorithm, Argon2, Params, Version};
use data_encoding::BASE64URL_NOPAD;
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use unicode_normalization::UnicodeNormalization;
use zeroize::Zeroizing;

use crate::Error;
use crate::secret::{KEY_LEN, KeyBytes, burn_stack};

const SALT_LEN: usize = 16;

const INFO_AUTH: &[u8] = b"cereberus/v1/auth";
const INFO_KEK: &[u8] = b"cereberus/v1/kek";

// Parameters come from the server, which could ask for almost no work and then
// guess the password cheaply from the auth key it receives. So the floor is
// enforced here, on every derivation. The floor is OWASP's minimum.
const MIN_M_KIB: u32 = 19 * 1024;
const MIN_T: u32 = 2;
const MIN_P: u32 = 1;
// A ceiling too, so a server can't crash a phone by asking for all its memory.
const MAX_M_KIB: u32 = 256 * 1024;
const MAX_T: u32 = 16;
const MAX_P: u32 = 4;

/// The key derivation function. Only one exists today; naming it lets a later
/// version add another without guessing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum KdfAlgorithm {
    /// Argon2id, version 0x13.
    Argon2id,
}

/// Key derivation cost, stored per account so it can rise later.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct KdfParams {
    /// Which function.
    pub alg: KdfAlgorithm,
    /// Memory, in KiB.
    pub m: u32,
    /// Iterations.
    pub t: u32,
    /// Parallelism.
    pub p: u32,
}

impl Default for KdfParams {
    /// What new accounts use: 64 MiB, 3 iterations, 1 lane.
    fn default() -> Self {
        KdfParams {
            alg: KdfAlgorithm::Argon2id,
            m: 64 * 1024,
            t: 3,
            p: 1,
        }
    }
}

impl KdfParams {
    /// Whether these are safe to use. [`derive_keys`] always checks.
    pub fn validate(&self) -> Result<(), Error> {
        let in_range = (MIN_M_KIB..=MAX_M_KIB).contains(&self.m)
            && (MIN_T..=MAX_T).contains(&self.t)
            && (MIN_P..=MAX_P).contains(&self.p);
        if in_range {
            Ok(())
        } else {
            Err(Error::InvalidKdfParams)
        }
    }
}

/// Sent at login in place of the password. Knowing it doesn't help decrypt anything.
pub struct AuthKey(KeyBytes);

impl AuthKey {
    /// The form sent to the server.
    pub fn to_base64url(&self) -> Zeroizing<String> {
        Zeroizing::new(BASE64URL_NOPAD.encode(self.0.as_array()))
    }
}

/// Wraps the vault key. Never leaves the device.
pub struct Kek(pub(crate) KeyBytes);

/// What a master password turns into.
pub struct DerivedKeys {
    /// Sent to the server to log in.
    pub auth_key: AuthKey,
    /// Unwraps the vault key.
    pub kek: Kek,
}

/// A new random salt for an account, as base64url.
pub fn new_salt() -> Result<String, Error> {
    let mut salt = [0u8; SALT_LEN];
    getrandom::fill(&mut salt).map_err(|_| Error::RandomUnavailable)?;
    Ok(BASE64URL_NOPAD.encode(&salt))
}

/// Runs Argon2id, then splits the result into the auth key and the KEK. Slow on
/// purpose: up to about a second on a phone.
pub fn derive_keys(
    master_password: &str,
    salt: &str,
    params: &KdfParams,
) -> Result<DerivedKeys, Error> {
    if master_password.is_empty() {
        return Err(Error::EmptyPassword);
    }
    params.validate()?;
    let salt = BASE64URL_NOPAD
        .decode(salt.as_bytes())
        .ok()
        .filter(|salt| salt.len() == SALT_LEN)
        .ok_or(Error::InvalidSalt)?;

    // A phone and a laptop can type different bytes for the same text.
    let normalized = Zeroizing::new(master_password.nfkc().collect::<String>());

    let master_key = run_argon2(normalized.as_bytes(), &salt, params)?;

    // Each of these also scrubs what Argon2 left on the stack.
    Ok(DerivedKeys {
        auth_key: AuthKey(derive_subkey(&master_key, INFO_AUTH)),
        kek: Kek(derive_subkey(&master_key, INFO_KEK)),
    })
}

#[inline(never)]
fn run_argon2(password: &[u8], salt: &[u8], params: &KdfParams) -> Result<KeyBytes, Error> {
    let argon2 = Argon2::new(
        Algorithm::Argon2id,
        Version::V0x13,
        Params::new(params.m, params.t, params.p, Some(KEY_LEN))
            .map_err(|_| Error::InvalidKdfParams)?,
    );
    let mut master_key = KeyBytes::zeroed();
    argon2
        .hash_password_into(password, salt, master_key.as_mut_slice())
        .map_err(|_| Error::InvalidKdfParams)?;
    Ok(master_key)
}

/// HKDF-SHA256 with no salt: the input is already uniformly random.
pub(crate) fn derive_subkey(ikm: &KeyBytes, info: &[u8]) -> KeyBytes {
    let okm = run_hkdf(ikm, info);
    burn_stack();
    okm
}

#[inline(never)]
fn run_hkdf(ikm: &KeyBytes, info: &[u8]) -> KeyBytes {
    let mut okm = KeyBytes::zeroed();
    Hkdf::<Sha256>::new(None, ikm.as_array())
        .expand(info, okm.as_mut_slice())
        .expect("32 bytes is within HKDF-SHA256's output limit");
    okm
}

#[cfg(test)]
mod tests {
    use super::*;
    use static_assertions::assert_not_impl_any;

    assert_not_impl_any!(AuthKey: std::fmt::Debug, Clone, Serialize);
    assert_not_impl_any!(Kek: std::fmt::Debug, Clone, Serialize);
    assert_not_impl_any!(DerivedKeys: std::fmt::Debug, Clone, Serialize);

    const SALT: &str = "AAECAwQFBgcICQoLDA0ODw";

    /// The cheapest parameters allowed, to keep the tests quick.
    fn fast() -> KdfParams {
        KdfParams {
            m: MIN_M_KIB,
            t: MIN_T,
            ..KdfParams::default()
        }
    }

    #[test]
    fn the_same_input_gives_the_same_keys() {
        let a = derive_keys("correct horse", SALT, &fast()).unwrap();
        let b = derive_keys("correct horse", SALT, &fast()).unwrap();
        assert_eq!(*a.auth_key.to_base64url(), *b.auth_key.to_base64url());
        assert_eq!(a.kek.0.as_array(), b.kek.0.as_array());
    }

    #[test]
    fn the_auth_key_and_kek_are_unrelated() {
        let keys = derive_keys("correct horse", SALT, &fast()).unwrap();
        assert_ne!(keys.auth_key.0.as_array(), keys.kek.0.as_array());
    }

    #[test]
    fn a_different_password_salt_or_cost_gives_different_keys() {
        let kek = |password: &str, salt: &str, params: &KdfParams| {
            *derive_keys(password, salt, params)
                .unwrap()
                .kek
                .0
                .as_array()
        };
        let base = kek("correct horse", SALT, &fast());
        assert_ne!(base, kek("correct horsf", SALT, &fast()));
        assert_ne!(
            base,
            kek("correct horse", "AQECAwQFBgcICQoLDA0ODw", &fast())
        );
        assert_ne!(
            base,
            kek("correct horse", SALT, &KdfParams { t: 3, ..fast() })
        );
    }

    #[test]
    fn composed_and_decomposed_text_give_the_same_keys() {
        let composed = derive_keys("caf\u{e9}-p\u{e4}ss", SALT, &fast()).unwrap();
        let decomposed = derive_keys("cafe\u{301}-pa\u{308}ss", SALT, &fast()).unwrap();
        assert_eq!(composed.kek.0.as_array(), decomposed.kek.0.as_array());
    }

    #[test]
    fn an_empty_password_is_refused() {
        assert_eq!(
            derive_keys("", SALT, &fast()).err(),
            Some(Error::EmptyPassword)
        );
    }

    #[test]
    fn a_server_cant_ask_for_weak_parameters() {
        for params in [
            KdfParams {
                m: MIN_M_KIB - 1,
                ..fast()
            },
            KdfParams {
                t: MIN_T - 1,
                ..fast()
            },
            KdfParams {
                p: MIN_P - 1,
                ..fast()
            },
            KdfParams {
                m: 8,
                t: 1,
                p: 1,
                ..fast()
            },
        ] {
            assert_eq!(
                derive_keys("correct horse", SALT, &params).err(),
                Some(Error::InvalidKdfParams),
                "{params:?}"
            );
        }
    }

    #[test]
    fn a_server_cant_exhaust_the_device() {
        for params in [
            KdfParams {
                m: MAX_M_KIB + 1,
                ..fast()
            },
            KdfParams {
                t: MAX_T + 1,
                ..fast()
            },
            KdfParams {
                p: MAX_P + 1,
                ..fast()
            },
        ] {
            assert_eq!(
                params.validate(),
                Err(Error::InvalidKdfParams),
                "{params:?}"
            );
        }
    }

    #[test]
    fn the_default_parameters_are_allowed() {
        assert_eq!(KdfParams::default().validate(), Ok(()));
    }

    #[test]
    fn a_bad_salt_is_refused() {
        for salt in ["", "AAEC", "not base64url!", "AAECAwQFBgcICQoLDA0ODxA"] {
            assert_eq!(
                derive_keys("correct horse", salt, &fast()).err(),
                Some(Error::InvalidSalt),
                "{salt}"
            );
        }
    }

    #[test]
    fn salts_are_random_and_the_right_length() {
        let a = new_salt().unwrap();
        assert_ne!(a, new_salt().unwrap());
        assert_eq!(
            BASE64URL_NOPAD.decode(a.as_bytes()).unwrap().len(),
            SALT_LEN
        );
        assert!(derive_keys("correct horse", &a, &fast()).is_ok());
    }

    #[test]
    fn the_auth_key_is_32_bytes_of_base64url() {
        let keys = derive_keys("correct horse", SALT, &fast()).unwrap();
        let auth = keys.auth_key.to_base64url();
        assert_eq!(auth.len(), 43);
        assert_eq!(
            BASE64URL_NOPAD.decode(auth.as_bytes()).unwrap().as_slice(),
            keys.auth_key.0.as_array().as_slice()
        );
    }

    #[test]
    fn parameters_have_a_stable_wire_format() {
        let json = serde_json::to_string(&KdfParams::default()).unwrap();
        assert_eq!(json, r#"{"alg":"argon2id","m":65536,"t":3,"p":1}"#);
    }

    #[test]
    fn an_unknown_algorithm_is_refused() {
        let json = r#"{"alg":"pbkdf2","m":65536,"t":3,"p":1}"#;
        assert!(serde_json::from_str::<KdfParams>(json).is_err());
    }
}
