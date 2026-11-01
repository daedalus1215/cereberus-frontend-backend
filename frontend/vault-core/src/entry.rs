use std::fmt;

use data_encoding::HEXLOWER;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use zeroize::{Zeroize, ZeroizeOnDrop, Zeroizing};

use crate::Error;
use crate::envelope::{MAX_PLAINTEXT_LEN, open, seal};
#[cfg(test)]
use crate::envelope::{NONCE_LEN, seal_with_nonce};
use crate::vault::VaultKey;

/// The entry format this version reads and writes.
pub const ENTRY_VERSION: u32 = 1;

const AAD_ITEM_PREFIX: &str = "cereberus/v1/item|";
const PAD_BLOCK: usize = 256;
const PAD_MARKER: u8 = 0x80;
// Refused here because an entry the server turns away would otherwise sit in a
// device's queue forever.
const MAX_PADDED_LEN: usize = MAX_PLAINTEXT_LEN;

/// One login, as it exists only on a device. Everything here is encrypted before it
/// leaves one. Fields a newer version of the app added are kept and written back, so
/// an old device editing an entry doesn't drop them.
#[derive(Clone, PartialEq, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    /// Format version, [`ENTRY_VERSION`].
    pub v: u32,
    /// Goes up by one on every edit. It's inside the encryption, so the server can't
    /// forge it, and a device can refuse an older copy than the one it holds.
    pub seq: u64,
    /// What the login is for.
    pub name: String,
    /// The username.
    pub username: String,
    /// The password.
    pub password: String,
    /// The site's address, if any.
    pub url: String,
    /// Free text.
    pub notes: String,
    /// Tag names.
    pub tags: Vec<String>,
    /// When it was created, as ISO 8601.
    pub created_at: String,
    /// When it last changed, as ISO 8601.
    pub updated_at: String,
    /// If this is the losing side of a sync conflict, the entry it conflicted with.
    pub conflict_of: Option<String>,
    /// Whether this version is a deletion. Left out of the JSON unless it's true.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub deleted: bool,
    /// Fields from a newer version of the app. Best effort on wiping: `serde_json`
    /// values can't be zeroized.
    #[serde(flatten)]
    #[zeroize(skip)]
    pub extra: Map<String, Value>,
}

impl Default for Entry {
    fn default() -> Self {
        Entry {
            v: ENTRY_VERSION,
            seq: 0,
            name: String::new(),
            username: String::new(),
            password: String::new(),
            url: String::new(),
            notes: String::new(),
            tags: Vec::new(),
            created_at: String::new(),
            updated_at: String::new(),
            conflict_of: None,
            deleted: false,
            extra: Map::new(),
        }
    }
}

impl Entry {
    /// What replaces this entry when it's deleted. It's encrypted and ordered by `seq`
    /// like any other version, so a delete can't be forged, or used to get a device to
    /// accept an older copy afterwards. It keeps nothing from the entry but `seq`.
    pub fn tombstone(&self, updated_at: &str) -> Entry {
        let mut tombstone = Entry::default();
        tombstone.seq = self.seq.saturating_add(1);
        tombstone.updated_at = updated_at.to_owned();
        tombstone.deleted = true;
        tombstone
    }

    /// Whether this holds nothing that a deletion shouldn't.
    fn is_blank(&self) -> bool {
        self.name.is_empty()
            && self.username.is_empty()
            && self.password.is_empty()
            && self.url.is_empty()
            && self.notes.is_empty()
            && self.tags.is_empty()
            && self.created_at.is_empty()
            && self.conflict_of.is_none()
            && self.extra.is_empty()
    }
}

/// Deliberately says nothing about the contents, so a stray `{:?}` can't log a password.
impl fmt::Debug for Entry {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Entry")
            .field("v", &self.v)
            .field("seq", &self.seq)
            .finish_non_exhaustive()
    }
}

/// A new id for an entry, a random UUID, made on the device so entries can be created
/// offline.
pub fn new_item_id() -> Result<String, Error> {
    let mut bytes = [0u8; 16];
    getrandom::fill(&mut bytes).map_err(|_| Error::RandomUnavailable)?;
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

    let hex = HEXLOWER.encode(&bytes);
    Ok(format!(
        "{}-{}-{}-{}-{}",
        &hex[..8],
        &hex[8..12],
        &hex[12..16],
        &hex[16..20],
        &hex[20..]
    ))
}

/// Encrypts an entry for one id. The ciphertext only opens under that id, so the
/// server can't swap one entry's contents into another's slot.
pub fn encrypt_entry(vault_key: &VaultKey, item_id: &str, entry: &Entry) -> Result<String, Error> {
    let aad = item_aad(item_id)?;
    let padded = to_padded_json(entry)?;
    seal(vault_key.0.as_array(), aad.as_bytes(), &padded)
}

/// Only [`encrypt_entry`] should choose a nonce outside of tests.
#[cfg(test)]
pub(crate) fn encrypt_entry_with_nonce(
    vault_key: &VaultKey,
    item_id: &str,
    entry: &Entry,
    nonce: &[u8; NONCE_LEN],
) -> Result<String, Error> {
    let aad = item_aad(item_id)?;
    let padded = to_padded_json(entry)?;
    seal_with_nonce(vault_key.0.as_array(), nonce, aad.as_bytes(), &padded)
}

/// Decrypts an entry stored under an id.
pub fn decrypt_entry(
    vault_key: &VaultKey,
    item_id: &str,
    ciphertext: &str,
) -> Result<Entry, Error> {
    let aad = item_aad(item_id)?;
    let padded = open(vault_key.0.as_array(), aad.as_bytes(), ciphertext)?;
    from_padded_json(&padded)
}

/// Accepts only the canonical lowercase form. Two spellings of one UUID would be two
/// different `aad`s, and an entry that can't be opened.
fn item_aad(item_id: &str) -> Result<String, Error> {
    let bytes = item_id.as_bytes();
    let canonical = bytes.len() == 36
        && bytes.iter().enumerate().all(|(i, b)| match i {
            8 | 13 | 18 | 23 => *b == b'-',
            _ => b.is_ascii_digit() || (b'a'..=b'f').contains(b),
        });
    if canonical {
        Ok(format!("{AAD_ITEM_PREFIX}{item_id}"))
    } else {
        Err(Error::InvalidItemId)
    }
}

/// Pads to a multiple of 256 bytes, so the ciphertext's length says little about the
/// password's. A marker byte, then zeros (ISO/IEC 7816-4), so it's always reversible.
fn to_padded_json(entry: &Entry) -> Result<Zeroizing<Vec<u8>>, Error> {
    if entry.v != ENTRY_VERSION {
        return Err(Error::UnsupportedEntryVersion);
    }
    // Refused when writing only, so a later version can add to tombstones. Otherwise a bug
    // could keep a real password forever, in a record that lists hide.
    if entry.deleted && !entry.is_blank() {
        return Err(Error::InvalidEntry);
    }
    // One buffer that never grows, because growing would leave copies of the password in
    // the blocks it freed. It's zeros already, so only the marker needs writing.
    let mut padded = Zeroizing::new(vec![0; MAX_PADDED_LEN]);
    let mut unused = padded.as_mut_slice();
    // Writing to memory can only fail by running out of it.
    serde_json::to_writer(&mut unused, entry).map_err(|_| Error::EntryTooLarge)?;
    let json_len = MAX_PADDED_LEN - unused.len();

    let padded_len = (json_len / PAD_BLOCK + 1) * PAD_BLOCK;
    if padded_len > MAX_PADDED_LEN {
        return Err(Error::EntryTooLarge);
    }
    padded[json_len] = PAD_MARKER;
    padded.truncate(padded_len);
    Ok(padded)
}

fn from_padded_json(padded: &[u8]) -> Result<Entry, Error> {
    let marker = padded
        .iter()
        .rposition(|byte| *byte != 0)
        .ok_or(Error::InvalidEntry)?;
    if padded[marker] != PAD_MARKER || !padded.len().is_multiple_of(PAD_BLOCK) {
        return Err(Error::InvalidEntry);
    }
    let json = &padded[..marker];

    // Checked first, so a newer format reads as "update the app" and not as corrupt.
    #[derive(Deserialize)]
    struct Version {
        v: u32,
    }
    let version: Version = serde_json::from_slice(json).map_err(|_| Error::InvalidEntry)?;
    if version.v != ENTRY_VERSION {
        return Err(Error::UnsupportedEntryVersion);
    }
    // serde_json's errors can quote the input, so this one isn't kept.
    serde_json::from_slice(json).map_err(|_| Error::InvalidEntry)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::secret::KeyBytes;

    const ID: &str = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const OTHER_ID: &str = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

    fn key() -> VaultKey {
        VaultKey(KeyBytes::filled(3))
    }

    fn entry() -> Entry {
        let mut entry = Entry::default();
        entry.seq = 3;
        entry.name = "Bänk 🏦".into();
        entry.username = "user@example.com".into();
        entry.password = "correct horse battery staple".into();
        entry.url = "https://example.com/login".into();
        entry.notes = "line one\nline two".into();
        entry.tags = vec!["work".into(), "café".into()];
        entry.created_at = "2026-10-30T12:00:00Z".into();
        entry.updated_at = "2026-10-30T13:00:00Z".into();
        entry.conflict_of = Some(OTHER_ID.into());
        entry
    }

    /// An empty entry with these notes. `Entry` wipes itself on drop, which rules out
    /// `..Entry::default()`.
    fn with_notes(notes: String) -> Entry {
        let mut entry = Entry::default();
        entry.notes = notes;
        entry
    }

    /// Seals exact bytes, for testing what a bad or future client could have written.
    fn sealed_padded(json: &[u8]) -> String {
        let mut padded = json.to_vec();
        padded.push(PAD_MARKER);
        padded.resize((json.len() / PAD_BLOCK + 1) * PAD_BLOCK, 0);
        sealed_raw(&padded)
    }

    fn sealed_raw(bytes: &[u8]) -> String {
        seal(key().0.as_array(), item_aad(ID).unwrap().as_bytes(), bytes).unwrap()
    }

    #[test]
    fn an_entry_survives_the_round_trip() {
        let sealed = encrypt_entry(&key(), ID, &entry()).unwrap();
        assert_eq!(decrypt_entry(&key(), ID, &sealed).unwrap(), entry());
    }

    #[test]
    fn an_empty_entry_survives_too() {
        let sealed = encrypt_entry(&key(), ID, &Entry::default()).unwrap();
        assert_eq!(
            decrypt_entry(&key(), ID, &sealed).unwrap(),
            Entry::default()
        );
    }

    #[test]
    fn a_ciphertext_cant_move_to_another_entry() {
        let sealed = encrypt_entry(&key(), ID, &entry()).unwrap();
        assert_eq!(
            decrypt_entry(&key(), OTHER_ID, &sealed).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn the_wrong_vault_key_fails() {
        let sealed = encrypt_entry(&key(), ID, &entry()).unwrap();
        assert_eq!(
            decrypt_entry(&VaultKey(KeyBytes::filled(4)), ID, &sealed).err(),
            Some(Error::DecryptionFailed)
        );
    }

    #[test]
    fn padding_hides_small_differences_in_length() {
        let mut short = entry();
        short.password = "a".into();
        let mut long = entry();
        long.password = "a much longer password than that".into();
        assert_eq!(
            encrypt_entry(&key(), ID, &short).unwrap().len(),
            encrypt_entry(&key(), ID, &long).unwrap().len()
        );
    }

    #[test]
    fn padding_works_at_every_block_boundary() {
        let base = serde_json::to_vec(&Entry::default()).unwrap().len();
        for target in [
            PAD_BLOCK - 1,
            PAD_BLOCK,
            PAD_BLOCK + 1,
            2 * PAD_BLOCK - 1,
            2 * PAD_BLOCK,
        ] {
            let original = with_notes("n".repeat(target - base));
            let padded = to_padded_json(&original).unwrap();
            assert!(
                padded.len().is_multiple_of(PAD_BLOCK),
                "json of {target} bytes"
            );
            assert!(padded.len() > target, "json of {target} bytes");
            assert_eq!(
                from_padded_json(&padded).unwrap(),
                original,
                "json of {target} bytes"
            );
        }
    }

    #[test]
    fn broken_padding_is_refused() {
        let json = serde_json::to_vec(&Entry::default()).unwrap();

        let no_marker = {
            let mut bytes = json.clone();
            bytes.resize(PAD_BLOCK, 0);
            bytes
        };
        let wrong_length = {
            let mut bytes = json.clone();
            bytes.push(PAD_MARKER);
            bytes
        };
        let wrong_marker = {
            let mut bytes = json.clone();
            bytes.push(0x81);
            bytes.resize(PAD_BLOCK, 0);
            bytes
        };
        for bad in [
            no_marker,
            wrong_length,
            wrong_marker,
            vec![0; PAD_BLOCK],
            vec![],
        ] {
            assert_eq!(
                decrypt_entry(&key(), ID, &sealed_raw(&bad)).err(),
                Some(Error::InvalidEntry)
            );
        }
    }

    #[test]
    fn an_entry_from_a_newer_version_is_named_as_such() {
        let sealed = sealed_padded(br#"{"v":2,"somethingNew":true}"#);
        assert_eq!(
            decrypt_entry(&key(), ID, &sealed).err(),
            Some(Error::UnsupportedEntryVersion)
        );
    }

    #[test]
    fn a_version_this_app_doesnt_write_is_refused() {
        let mut future = entry();
        future.v = 2;
        assert_eq!(
            encrypt_entry(&key(), ID, &future).err(),
            Some(Error::UnsupportedEntryVersion)
        );
    }

    #[test]
    fn a_missing_field_is_an_error_not_a_blank() {
        let sealed = sealed_padded(br#"{"v":1,"seq":1,"name":"","username":"","url":"","notes":"","tags":[],"createdAt":"","updatedAt":""}"#);
        assert_eq!(
            decrypt_entry(&key(), ID, &sealed).err(),
            Some(Error::InvalidEntry)
        );
    }

    #[test]
    fn what_isnt_json_is_refused() {
        for bad in [&b"not json"[..], b"{", b"[]", b"null", b"\xff\xfe"] {
            assert_eq!(
                decrypt_entry(&key(), ID, &sealed_padded(bad)).err(),
                Some(Error::InvalidEntry)
            );
        }
    }

    #[test]
    fn fields_from_a_newer_version_are_kept() {
        let sealed = sealed_padded(br#"{"v":1,"seq":1,"name":"","username":"","password":"p","url":"","notes":"","tags":[],"createdAt":"","updatedAt":"","conflictOf":null,"androidPackages":["com.example"]}"#);
        let decrypted = decrypt_entry(&key(), ID, &sealed).unwrap();
        assert_eq!(decrypted.extra["androidPackages"][0], "com.example");

        let rewritten = encrypt_entry(&key(), ID, &decrypted).unwrap();
        let again = decrypt_entry(&key(), ID, &rewritten).unwrap();
        assert_eq!(again.extra["androidPackages"][0], "com.example");
    }

    #[test]
    fn entries_have_a_stable_wire_format() {
        let json = serde_json::to_string(&Entry::default()).unwrap();
        assert_eq!(
            json,
            r#"{"v":1,"seq":0,"name":"","username":"","password":"","url":"","notes":"","tags":[],"createdAt":"","updatedAt":"","conflictOf":null}"#
        );
    }

    #[test]
    fn a_tombstone_keeps_nothing_but_a_higher_seq() {
        let mut full = entry();
        full.extra
            .insert("androidPackages".into(), "com.example".into());

        let tombstone = full.tombstone("2026-11-01T00:00:00Z");
        let sealed = encrypt_entry(&key(), ID, &tombstone).unwrap();
        let opened = decrypt_entry(&key(), ID, &sealed).unwrap();

        assert!(opened.deleted);
        assert_eq!(opened.seq, full.seq + 1);
        assert_eq!(opened.updated_at, "2026-11-01T00:00:00Z");

        let mut expected = Entry::default();
        expected.seq = full.seq + 1;
        expected.updated_at = "2026-11-01T00:00:00Z".into();
        expected.deleted = true;
        assert_eq!(opened, expected);
    }

    #[test]
    fn a_tombstone_is_the_size_of_a_small_entry() {
        let mut small = Entry::default();
        small.updated_at = "2026-11-01T00:00:00Z".into();
        assert_eq!(
            encrypt_entry(&key(), ID, &entry().tombstone("2026-11-01T00:00:00Z"))
                .unwrap()
                .len(),
            encrypt_entry(&key(), ID, &small).unwrap().len()
        );
    }

    #[test]
    fn a_deleted_entry_with_anything_left_in_it_cant_be_written() {
        let mut full = entry();
        full.deleted = true;
        assert_eq!(
            encrypt_entry(&key(), ID, &full).err(),
            Some(Error::InvalidEntry)
        );

        let blank = || {
            let mut blank = Entry::default();
            blank.deleted = true;
            blank
        };
        let mut cases = vec![blank(); 9];
        cases[0].name = "x".into();
        cases[1].username = "x".into();
        cases[2].password = "x".into();
        cases[3].url = "x".into();
        cases[4].notes = "x".into();
        cases[5].tags = vec!["x".into()];
        cases[6].created_at = "x".into();
        cases[7].conflict_of = Some(OTHER_ID.into());
        cases[8].extra.insert("x".into(), "x".into());
        for (i, case) in cases.iter().enumerate() {
            assert_eq!(
                encrypt_entry(&key(), ID, case).err(),
                Some(Error::InvalidEntry),
                "case {i}"
            );
        }
        assert!(encrypt_entry(&key(), ID, &blank()).is_ok());
    }

    #[test]
    fn a_deleted_entry_with_more_in_it_can_still_be_read() {
        let sealed = sealed_padded(br#"{"v":1,"seq":2,"name":"","username":"","password":"","url":"","notes":"","tags":[],"createdAt":"","updatedAt":"","conflictOf":null,"deleted":true,"deletedBy":"a later version"}"#);
        let opened = decrypt_entry(&key(), ID, &sealed).unwrap();
        assert!(opened.deleted);
        assert_eq!(opened.extra["deletedBy"], "a later version");
    }

    #[test]
    fn an_entry_without_the_deleted_field_isnt_deleted() {
        let sealed = sealed_padded(br#"{"v":1,"seq":1,"name":"","username":"","password":"p","url":"","notes":"","tags":[],"createdAt":"","updatedAt":"","conflictOf":null}"#);
        assert!(!decrypt_entry(&key(), ID, &sealed).unwrap().deleted);
    }

    #[test]
    fn an_entry_too_large_for_the_server_is_refused() {
        let huge = with_notes("n".repeat(MAX_PADDED_LEN));
        assert_eq!(
            encrypt_entry(&key(), ID, &huge).err(),
            Some(Error::EntryTooLarge)
        );
    }

    #[test]
    fn the_largest_allowed_entry_fits_the_servers_limit() {
        let base = serde_json::to_vec(&Entry::default()).unwrap().len();
        let largest = with_notes("n".repeat(MAX_PADDED_LEN - base - 1));
        let sealed = encrypt_entry(&key(), ID, &largest).unwrap();
        assert!(sealed.len() <= 256 * 1024, "{}", sealed.len());
        assert_eq!(decrypt_entry(&key(), ID, &sealed).unwrap(), largest);
    }

    #[test]
    fn only_a_canonical_id_is_accepted() {
        for id in [
            "",
            "0F8FAD5B-D9CB-469F-A165-70867728950E",
            "0f8fad5bd9cb469fa16570867728950e",
            "0f8fad5b-d9cb-469f-a165-70867728950",
            "0f8fad5b-d9cb-469f-a165-70867728950e0",
            "0f8fad5b_d9cb_469f_a165_70867728950e",
            "gf8fad5b-d9cb-469f-a165-70867728950e",
        ] {
            assert_eq!(
                encrypt_entry(&key(), id, &entry()).err(),
                Some(Error::InvalidItemId),
                "{id}"
            );
            assert_eq!(
                decrypt_entry(&key(), id, "cv1.AAAA").err(),
                Some(Error::InvalidItemId),
                "{id}"
            );
        }
    }

    #[test]
    fn new_ids_are_canonical_random_v4_uuids() {
        let id = new_item_id().unwrap();
        assert!(item_aad(&id).is_ok(), "{id}");
        assert_eq!(id.as_bytes()[14], b'4', "{id}");
        assert!(
            matches!(id.as_bytes()[19], b'8' | b'9' | b'a' | b'b'),
            "{id}"
        );
        assert_ne!(id, new_item_id().unwrap());
    }

    #[test]
    fn debug_output_shows_no_secrets() {
        let output = format!("{:?}", entry());
        for secret in [
            "correct horse",
            "user@example.com",
            "Bänk",
            "example.com",
            "line one",
            "work",
        ] {
            assert!(!output.contains(secret), "{secret} in {output}");
        }
    }

    #[test]
    fn errors_dont_quote_what_was_decrypted() {
        let sealed = sealed_padded(br#"{"v":1,"seq":"my secret password"}"#);
        let error = decrypt_entry(&key(), ID, &sealed).unwrap_err();
        assert!(!format!("{error} {error:?}").contains("secret"));
    }

    #[test]
    fn hostile_input_never_panics() {
        // A small deterministic generator: no extra dependency, the same run every time.
        let mut state = 0x9e37_79b9_7f4a_7c15_u64;
        let mut next = move || {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            state
        };
        for round in 0..2_000 {
            let len = (next() % 600) as usize;
            let bytes: Vec<u8> = (0..len).map(|_| next() as u8).collect();
            let text = String::from_utf8_lossy(&bytes);

            assert!(decrypt_entry(&key(), ID, &text).is_err(), "round {round}");
            assert!(
                decrypt_entry(&key(), ID, &format!("cv1.{text}")).is_err(),
                "round {round}"
            );
            // Authentic but nonsense, which only a bad client could produce.
            assert!(
                decrypt_entry(&key(), ID, &sealed_raw(&bytes)).is_err(),
                "round {round}"
            );
            assert!(from_padded_json(&bytes).is_err(), "round {round}");
        }
    }
}
