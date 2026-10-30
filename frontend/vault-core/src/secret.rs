//! Keeping keys from being left behind. Searching WebAssembly memory showed why this
//! is needed: with keys as plain arrays, every move left a copy, and a KEK outlived the
//! object holding it. `vault-core-wasm/tests/memory.test.mjs` keeps measuring.

use std::hint::black_box;

use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::Error;

pub(crate) const KEY_LEN: usize = 32;

/// More than the deepest key-handling call uses, and far less than any stack we run on.
const STACK_BURN_LEN: usize = 64 * 1024;

/// 32 secret bytes at one heap address, wiped on drop. Moving the owner moves a pointer,
/// so there's only ever the one copy to wipe.
pub(crate) struct KeyBytes(Box<[u8; KEY_LEN]>);

impl KeyBytes {
    pub(crate) fn zeroed() -> Self {
        KeyBytes(Box::new([0; KEY_LEN]))
    }

    pub(crate) fn random() -> Result<Self, Error> {
        let mut key = Self::zeroed();
        getrandom::fill(key.as_mut_slice()).map_err(|_| Error::RandomUnavailable)?;
        Ok(key)
    }

    /// `None` if it isn't exactly key length.
    pub(crate) fn from_slice(bytes: &[u8]) -> Option<Self> {
        if bytes.len() != KEY_LEN {
            return None;
        }
        let mut key = Self::zeroed();
        key.as_mut_slice().copy_from_slice(bytes);
        Some(key)
    }

    pub(crate) fn as_array(&self) -> &[u8; KEY_LEN] {
        &self.0
    }

    pub(crate) fn as_mut_slice(&mut self) -> &mut [u8] {
        self.0.as_mut_slice()
    }
}

impl Drop for KeyBytes {
    fn drop(&mut self) {
        self.0.as_mut_slice().zeroize();
    }
}

impl ZeroizeOnDrop for KeyBytes {}

/// Overwrites the stack below the caller. Hash and cipher libraries keep working state,
/// and for HKDF the output itself, in stack frames that nothing wipes when they return.
///
/// Call it after a function marked `#[inline(never)]` that did the work. Were the work
/// inlined, its frame would be the caller's, which this can't reach.
#[inline(never)]
pub(crate) fn burn_stack() {
    let mut scratch = [0u8; STACK_BURN_LEN];
    scratch.zeroize();
    black_box(&mut scratch);
}

#[cfg(test)]
impl KeyBytes {
    pub(crate) fn filled(byte: u8) -> Self {
        KeyBytes(Box::new([byte; KEY_LEN]))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_key_length_slice_is_accepted() {
        assert!(KeyBytes::from_slice(&[1; KEY_LEN]).is_some());
        assert!(KeyBytes::from_slice(&[1; KEY_LEN - 1]).is_none());
        assert!(KeyBytes::from_slice(&[1; KEY_LEN + 1]).is_none());
        assert!(KeyBytes::from_slice(&[]).is_none());
    }

    #[test]
    fn random_keys_differ() {
        let a = KeyBytes::random().unwrap();
        let b = KeyBytes::random().unwrap();
        assert_ne!(a.as_array(), b.as_array());
    }

    #[test]
    fn burning_the_stack_returns() {
        burn_stack();
    }
}
