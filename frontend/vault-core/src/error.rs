use std::fmt;

/// What went wrong. Variants carry no data, so an error can't leak a secret into a
/// log. A wrong password and a tampered ciphertext are deliberately the same
/// [`Error::DecryptionFailed`]: the cipher can't tell them apart.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// The master password was empty.
    EmptyPassword,
    /// Key derivation parameters outside the accepted range. A server asking for
    /// less than the minimum is trying to make the password cheap to guess.
    InvalidKdfParams,
    /// The salt isn't 16 bytes of base64url.
    InvalidSalt,
    /// The item id isn't a canonical lowercase UUID.
    InvalidItemId,
    /// The recovery key is mistyped: wrong characters, length or checksum.
    InvalidRecoveryKey,
    /// The ciphertext isn't in a format this version understands.
    UnsupportedFormat,
    /// The ciphertext claims a known format but isn't well formed.
    MalformedCiphertext,
    /// Wrong key, or the ciphertext was changed.
    DecryptionFailed,
    /// The entry was written by a newer version of the app, or is malformed.
    UnsupportedEntryVersion,
    /// The entry decrypted, but what's inside isn't a valid entry.
    InvalidEntry,
    /// The entry is larger than the server accepts.
    EntryTooLarge,
    /// The system couldn't provide random bytes.
    RandomUnavailable,
    /// The cipher refused to encrypt. Shouldn't be reachable with valid keys.
    EncryptionFailed,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Error::EmptyPassword => "the master password is empty",
            Error::InvalidKdfParams => "key derivation parameters are out of range",
            Error::InvalidSalt => "the salt is invalid",
            Error::InvalidItemId => "the item id is invalid",
            Error::InvalidRecoveryKey => "the recovery key is mistyped",
            Error::UnsupportedFormat => "the ciphertext format isn't supported",
            Error::MalformedCiphertext => "the ciphertext is malformed",
            Error::DecryptionFailed => "decryption failed",
            Error::UnsupportedEntryVersion => "the entry version isn't supported",
            Error::InvalidEntry => "the entry is invalid",
            Error::EntryTooLarge => "the entry is too large",
            Error::RandomUnavailable => "random bytes are unavailable",
            Error::EncryptionFailed => "encryption failed",
        })
    }
}

impl std::error::Error for Error {}
