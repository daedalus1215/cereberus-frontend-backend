//! The one format everything encrypted is stored in:
//! `cv1.<base64url(nonce || ciphertext)>`, XChaCha20-Poly1305 with a random 24-byte
//! nonce, which is long enough that random nonces can't realistically repeat.

use chacha20poly1305::aead::{Aead, KeyInit, Payload};
use chacha20poly1305::{XChaCha20Poly1305, XNonce};
use data_encoding::BASE64URL_NOPAD;
use zeroize::Zeroizing;

use crate::Error;
use crate::secret::{KEY_LEN, burn_stack};

const PREFIX: &str = "cv1.";
pub(crate) const NONCE_LEN: usize = 24;
const TAG_LEN: usize = 16;

pub(crate) fn seal(key: &[u8; KEY_LEN], aad: &[u8], plaintext: &[u8]) -> Result<String, Error> {
    let mut nonce = [0u8; NONCE_LEN];
    getrandom::fill(&mut nonce).map_err(|_| Error::RandomUnavailable)?;
    seal_with_nonce(key, &nonce, aad, plaintext)
}

/// Only [`seal`] should choose a nonce outside of tests.
pub(crate) fn seal_with_nonce(
    key: &[u8; KEY_LEN],
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<String, Error> {
    let sealed = run_seal(key, nonce, aad, plaintext);
    burn_stack();
    sealed
}

#[inline(never)]
fn run_seal(
    key: &[u8; KEY_LEN],
    nonce: &[u8; NONCE_LEN],
    aad: &[u8],
    plaintext: &[u8],
) -> Result<String, Error> {
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| Error::EncryptionFailed)?;
    let ciphertext = cipher
        .encrypt(
            &XNonce::from(*nonce),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|_| Error::EncryptionFailed)?;

    let mut raw = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    raw.extend_from_slice(nonce);
    raw.extend_from_slice(&ciphertext);
    Ok(format!("{PREFIX}{}", BASE64URL_NOPAD.encode(&raw)))
}

pub(crate) fn open(
    key: &[u8; KEY_LEN],
    aad: &[u8],
    text: &str,
) -> Result<Zeroizing<Vec<u8>>, Error> {
    let opened = run_open(key, aad, text);
    burn_stack();
    opened
}

#[inline(never)]
fn run_open(key: &[u8; KEY_LEN], aad: &[u8], text: &str) -> Result<Zeroizing<Vec<u8>>, Error> {
    let encoded = text.strip_prefix(PREFIX).ok_or(Error::UnsupportedFormat)?;
    let raw = BASE64URL_NOPAD
        .decode(encoded.as_bytes())
        .map_err(|_| Error::MalformedCiphertext)?;
    if raw.len() < NONCE_LEN + TAG_LEN {
        return Err(Error::MalformedCiphertext);
    }
    let (nonce, ciphertext) = raw.split_at(NONCE_LEN);
    let nonce: [u8; NONCE_LEN] = nonce.try_into().map_err(|_| Error::MalformedCiphertext)?;

    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| Error::DecryptionFailed)?;
    cipher
        .decrypt(
            &XNonce::from(nonce),
            Payload {
                msg: ciphertext,
                aad,
            },
        )
        .map(Zeroizing::new)
        .map_err(|_| Error::DecryptionFailed)
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: [u8; KEY_LEN] = [7; KEY_LEN];

    fn raw_of(sealed: &str) -> Vec<u8> {
        let encoded = sealed.strip_prefix("cv1.").unwrap();
        BASE64URL_NOPAD.decode(encoded.as_bytes()).unwrap()
    }

    #[test]
    fn what_goes_in_comes_out() {
        let sealed = seal(&KEY, b"aad", b"secret").unwrap();
        assert_eq!(*open(&KEY, b"aad", &sealed).unwrap(), b"secret");
    }

    #[test]
    fn the_plaintext_isnt_visible() {
        let sealed = seal(&KEY, b"aad", b"secret").unwrap();
        let raw = raw_of(&sealed);
        assert!(!raw.windows(6).any(|w| w == b"secret"));
    }

    #[test]
    fn sealing_twice_differs() {
        assert_ne!(
            seal(&KEY, b"aad", b"secret").unwrap(),
            seal(&KEY, b"aad", b"secret").unwrap()
        );
    }

    #[test]
    fn the_wrong_key_or_aad_fails() {
        let sealed = seal(&KEY, b"aad", b"secret").unwrap();
        assert_eq!(
            open(&[8; KEY_LEN], b"aad", &sealed).err(),
            Some(Error::DecryptionFailed)
        );
        assert_eq!(
            open(&KEY, b"other", &sealed).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn changing_any_byte_fails() {
        let sealed = seal(&KEY, b"aad", b"secret").unwrap();
        let raw = raw_of(&sealed);
        for i in 0..raw.len() {
            let mut tampered = raw.clone();
            tampered[i] ^= 0x01;
            let text = format!("cv1.{}", BASE64URL_NOPAD.encode(&tampered));
            assert_eq!(
                open(&KEY, b"aad", &text).err(),
                Some(Error::DecryptionFailed),
                "byte {i}"
            );
        }
    }

    #[test]
    fn an_unknown_format_is_refused() {
        for text in ["", "secret", "cv2.AAAA", "CV1.AAAA", "cv1"] {
            assert_eq!(
                open(&KEY, b"aad", text).err(),
                Some(Error::UnsupportedFormat),
                "{text}"
            );
        }
    }

    #[test]
    fn a_malformed_ciphertext_is_refused() {
        let too_short = format!(
            "cv1.{}",
            BASE64URL_NOPAD.encode(&[0; NONCE_LEN + TAG_LEN - 1])
        );
        for text in ["cv1.", "cv1.!!!!", "cv1.AAA=", too_short.as_str()] {
            assert_eq!(
                open(&KEY, b"aad", text).err(),
                Some(Error::MalformedCiphertext),
                "{text}"
            );
        }
    }

    #[test]
    fn only_one_encoding_of_a_ciphertext_is_accepted() {
        let nonce = [1; NONCE_LEN];
        let sealed = seal_with_nonce(&KEY, &nonce, b"aad", b"secret").unwrap();
        assert!(open(&KEY, b"aad", &sealed).is_ok());

        // Padding, and the other base64 alphabet.
        assert!(open(&KEY, b"aad", &format!("{sealed}=")).is_err());
        let raw = raw_of(&sealed);
        let standard = data_encoding::BASE64.encode(&raw);
        assert!(open(&KEY, b"aad", &format!("cv1.{standard}")).is_err());

        // Unused trailing bits set, which would otherwise be a second spelling.
        let encoded = sealed.strip_prefix("cv1.").unwrap();
        if !raw.len().is_multiple_of(3) {
            let last = encoded.chars().last().unwrap();
            let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
            let next = alphabet
                .chars()
                .nth(alphabet.find(last).unwrap() + 1)
                .unwrap();
            let spelled = format!("cv1.{}{next}", &encoded[..encoded.len() - 1]);
            assert_eq!(
                open(&KEY, b"aad", &spelled).err(),
                Some(Error::MalformedCiphertext)
            );
        }
    }

    #[test]
    fn an_empty_plaintext_works() {
        let sealed = seal(&KEY, b"aad", b"").unwrap();
        assert_eq!(*open(&KEY, b"aad", &sealed).unwrap(), b"");
    }
}
