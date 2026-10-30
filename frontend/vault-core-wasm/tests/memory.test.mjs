// Searches all of WebAssembly memory for secrets, which is possible here and nowhere
// else. In its own file because each file gets its own process, and so its own memory:
// nothing another test forgot to free can show up.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as wasm from "../pkg/vault_core_wasm.js";

const { DerivedKeys, Vault } = wasm;

const { memory } = wasm.initSync({
  module: readFileSync(new URL("../pkg/vault_core_wasm_bg.wasm", import.meta.url)),
});

const vectors = JSON.parse(
  readFileSync(
    new URL("../../vault-core/testdata/vectors.json", import.meta.url),
    "utf8",
  ),
);

const FAST = JSON.stringify({ alg: "argon2id", m: 19456, t: 2, p: 1 });
const ITEM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const copiesOf = (needle) => {
  const haystack = Buffer.from(memory.buffer);
  const bytes = Buffer.isBuffer(needle) ? needle : Buffer.from(needle, "utf8");
  let count = 0;
  for (
    let at = haystack.indexOf(bytes);
    at !== -1;
    at = haystack.indexOf(bytes, at + 1)
  ) {
    count += 1;
  }
  return count;
};

const raw = (base64url) => Buffer.from(base64url, "base64url");
const [first] = vectors.kdf;
const VAULT_KEY = raw(vectors.entries.vaultKey);
const KEK = raw(first.kek);
const openFirst = () =>
  DerivedKeys.derive(first.password, first.salt, JSON.stringify(first.params));

test("the search works: a key that's in use is found, exactly once", () => {
  const keys = openFirst();
  assert.equal(copiesOf(KEK), 1, "one copy of the KEK");

  const vault = keys.unlock(first.wrappedVaultKey);
  assert.equal(copiesOf(VAULT_KEY), 1, "one copy of the vault key");

  vault.free();
  keys.free();
});

test("freeing leaves no key behind", () => {
  const keys = openFirst();
  const vault = keys.unlock(first.wrappedVaultKey);

  keys.free();
  assert.equal(copiesOf(KEK), 0, "the KEK");
  assert.equal(copiesOf(raw(first.authKey)), 0, "the auth key");

  vault.free();
  assert.equal(copiesOf(VAULT_KEY), 0, "the vault key");
});

test("a master password doesn't stay", () => {
  const typed = "zebra-QUILT-73-café-unique";
  const keys = DerivedKeys.derive(typed, wasm.newSalt(), FAST);
  assert.equal(copiesOf(typed), 0, "as typed");
  assert.equal(copiesOf(typed.normalize("NFKC")), 0, "normalised");
  keys.free();
});

test("what's handed to JavaScript doesn't stay here too", () => {
  const keys = openFirst();
  const authKey = keys.authKey();
  assert.equal(copiesOf(authKey), 0, "the auth key");
  keys.free();

  const created = DerivedKeys.derive("another-unique", wasm.newSalt(), FAST).createVault();
  const recoveryKey = created.recoveryKey;
  const recoveryAuth = created.recoveryAuth;
  created.takeVault().free();
  assert.equal(copiesOf(recoveryKey), 0, "the recovery key");
  assert.equal(copiesOf(recoveryAuth), 0, "its proof");
});

test("a recovery key doesn't stay after use", () => {
  const { display, key, wrappedVaultKeyRecovery } = vectors.recovery;
  const vault = Vault.unlockWithRecovery(display, wrappedVaultKeyRecovery);
  wasm.recoveryAuthOf(display);
  assert.equal(copiesOf(display), 0, "as typed");
  assert.equal(copiesOf(raw(key)), 0, "the key");

  vault.free();
  assert.equal(copiesOf(VAULT_KEY), 0, "the vault key it opened");
});

test("decrypted entries don't stay", () => {
  const keys = openFirst();
  const vault = keys.unlock(first.wrappedVaultKey);
  const { ciphertext, itemId, json } = vectors.entries.cases[1];
  const { username, name } = JSON.parse(json);

  const summary = vault.decryptSummary(itemId, ciphertext);
  const whole = vault.decryptEntry(itemId, ciphertext);
  const password = vault.decryptPassword(itemId, ciphertext);
  assert.ok(summary && whole && password);

  assert.equal(copiesOf(username), 0, "the username");
  assert.equal(copiesOf(name), 0, "the name");
  assert.equal(copiesOf(password), 0, "the password");

  vault.free();
  keys.free();
});

test("entries going in don't stay", () => {
  const keys = openFirst();
  const vault = keys.unlock(first.wrappedVaultKey);
  const secret = "going-in-unique-password";

  const sealed = vault.encryptEntry(
    ITEM_ID,
    JSON.stringify({
      v: 1,
      seq: 1,
      name: "",
      username: "",
      password: secret,
      url: "",
      notes: "",
      tags: [],
      createdAt: "",
      updatedAt: "",
      conflictOf: null,
    }),
  );
  assert.ok(sealed);
  assert.equal(copiesOf(secret), 0, "the password");

  vault.free();
  keys.free();
});
