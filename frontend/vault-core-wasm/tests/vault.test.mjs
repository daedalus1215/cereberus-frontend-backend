// Runs the WebAssembly build through its JavaScript interface, against the same
// vectors as the native crate. Run ./build.sh first, then: node --test tests/
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as wasm from "../pkg/vault_core_wasm.js";

const { DerivedKeys, NewRecovery, NewVault, Vault } = wasm;

wasm.initSync({
  module: readFileSync(new URL("../pkg/vault_core_wasm_bg.wasm", import.meta.url)),
});

const vectors = JSON.parse(
  readFileSync(
    new URL("../../vault-core/testdata/vectors.json", import.meta.url),
    "utf8",
  ),
);

const ITEM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const OTHER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const FAST = JSON.stringify({ alg: "argon2id", m: 65536, t: 3, p: 1 });

const entry = (fields = {}) =>
  JSON.stringify({
    v: 1,
    seq: 1,
    name: "Bänk 🏦",
    username: "user@example.com",
    password: "correct horse battery staple",
    url: "https://example.com",
    notes: "line one\nline two",
    tags: ["work", "café"],
    createdAt: "2026-10-30T12:00:00Z",
    updatedAt: "2026-10-30T13:00:00Z",
    conflictOf: null,
    ...fields,
  });

const fails = (call, name) =>
  assert.throws(call, (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.message, name);
    return true;
  });

const keysFor = (password, salt = wasm.newSalt()) =>
  DerivedKeys.derive(password, salt, FAST);

// Unlocking with a password from the vectors gives the vectors' vault key, which is
// what their entries are encrypted under.
const vectorVault = () => {
  const [first] = vectors.kdf;
  return DerivedKeys.derive(
    first.password,
    first.salt,
    JSON.stringify(first.params),
  ).unlock(first.wrappedVaultKey);
};

test("only what's meant to reach JavaScript does", () => {
  const methods = (cls) =>
    Object.getOwnPropertyNames(cls.prototype)
      .filter((name) => name !== "constructor" && !name.startsWith("__"))
      .sort();

  // Adding to these lists should be a decision. None of them may return a vault key or
  // a KEK.
  assert.deepEqual(methods(DerivedKeys), [
    "authKey",
    "createVault",
    "free",
    "unlock",
  ]);
  assert.deepEqual(methods(NewVault), [
    "free",
    "recoveryAuth",
    "recoveryKey",
    "takeVault",
    "wrappedVaultKey",
    "wrappedVaultKeyRecovery",
  ]);
  assert.deepEqual(methods(NewRecovery), [
    "free",
    "recoveryAuth",
    "recoveryKey",
    "wrappedVaultKeyRecovery",
  ]);
  assert.deepEqual(methods(Vault), [
    "createRecovery",
    "decryptEntry",
    "decryptPassword",
    "decryptSummary",
    "encryptEntry",
    "encryptTombstone",
    "free",
    "rewrap",
  ]);
  assert.deepEqual(
    Object.keys(wasm)
      .filter((name) => !["default", "initSync"].includes(name))
      .sort(),
    [
      "DerivedKeys",
      "NewRecovery",
      "NewVault",
      "Vault",
      "defaultKdfParams",
      "newItemId",
      "newSalt",
      "recoveryAuthOf",
    ],
  );
});

test("key derivation matches the vectors, down to opening the vault", () => {
  assert.ok(vectors.kdf.length >= 7);
  for (const c of vectors.kdf) {
    const keys = DerivedKeys.derive(
      c.password,
      c.salt,
      JSON.stringify(c.params),
    );
    assert.equal(keys.authKey(), c.authKey, c.name);

    // There's no reading the KEK out, so this is how it's checked.
    const vault = keys.unlock(c.wrappedVaultKey);
    const { ciphertext, itemId } = vectors.entries.cases[0];
    assert.ok(vault.decryptEntry(itemId, ciphertext), c.name);
    vault.free();
    keys.free();
  }
});

test("parameters out of range are refused", () => {
  assert.ok(vectors.refusedParams.length >= 7);
  for (const params of vectors.refusedParams) {
    fails(
      () =>
        DerivedKeys.derive(
          "correct horse",
          vectors.kdf[0].salt,
          JSON.stringify(params),
        ),
      "InvalidKdfParams",
    );
  }
  fails(
    () => DerivedKeys.derive("correct horse", vectors.kdf[0].salt, "not json"),
    "InvalidKdfParams",
  );
  fails(
    () =>
      DerivedKeys.derive(
        "correct horse",
        vectors.kdf[0].salt,
        JSON.stringify({ alg: "pbkdf2", m: 65536, t: 3, p: 1 }),
      ),
    "InvalidKdfParams",
  );
});

test("the default parameters are the format's", () => {
  assert.deepEqual(JSON.parse(wasm.defaultKdfParams()), {
    alg: "argon2id",
    m: 131072,
    t: 3,
    p: 1,
  });
});

test("the recovery key matches the vectors", () => {
  const { display, recoveryAuth, wrappedVaultKeyRecovery } = vectors.recovery;
  assert.equal(wasm.recoveryAuthOf(display), recoveryAuth);

  const vault = Vault.unlockWithRecovery(display, wrappedVaultKeyRecovery);
  const { ciphertext, itemId } = vectors.entries.cases[0];
  assert.ok(vault.decryptEntry(itemId, ciphertext));
  vault.free();
});

test("entries match the vectors", () => {
  const vault = vectorVault();
  assert.ok(vectors.entries.cases.length >= 6);
  for (const c of vectors.entries.cases) {
    const expected = JSON.parse(c.json);
    assert.deepEqual(
      JSON.parse(vault.decryptEntry(c.itemId, c.ciphertext)),
      expected,
      c.name,
    );
    if (expected.deleted) {
      fails(() => vault.decryptPassword(c.itemId, c.ciphertext), "InvalidEntry");
    } else {
      assert.equal(
        vault.decryptPassword(c.itemId, c.ciphertext),
        expected.password,
        c.name,
      );
    }

    const { password: _, androidPackages: __, ...summary } = expected;
    assert.deepEqual(
      JSON.parse(vault.decryptSummary(c.itemId, c.ciphertext)),
      summary,
      c.name,
    );
  }
  vault.free();
});

test("running out of memory is an error, and the instance still works", async () => {
  // A fresh instance, grown until 256 MiB can't fit in its 4 GiB of address space.
  const fresh = await import(`../pkg/vault_core_wasm.js?oom`);
  const { memory } = fresh.initSync({
    module: readFileSync(new URL("../pkg/vault_core_wasm_bg.wasm", import.meta.url)),
  });
  memory.grow(65536 - memory.buffer.byteLength / 65536 - 2000);

  const salt = vectors.kdf[0].salt;
  fails(
    () =>
      fresh.DerivedKeys.derive(
        "correct horse",
        salt,
        JSON.stringify({ alg: "argon2id", m: 262144, t: 3, p: 1 }),
      ),
    "OutOfMemory",
  );
  fresh.DerivedKeys.derive("correct horse", salt, FAST).free();
});

test("a summary leaves out fields it doesn't know", () => {
  const vault = vectorVault();
  const sealed = vault.encryptEntry(
    ITEM_ID,
    entry({ totpSecret: "a future secret" }),
  );
  assert.ok(vault.decryptEntry(ITEM_ID, sealed).includes("a future secret"));
  const summary = vault.decryptSummary(ITEM_ID, sealed);
  assert.ok(!summary.includes("a future secret"), summary);
  assert.ok(!summary.includes("correct horse"), summary);
  vault.free();
});

test("deleting an entry keeps nothing from it but a higher seq", () => {
  const vault = vectorVault();
  const current = vault.encryptEntry(ITEM_ID, entry({ seq: 7 }));
  const sealed = vault.encryptTombstone(
    ITEM_ID,
    current,
    "2026-11-01T00:00:00Z",
  );
  assert.deepEqual(JSON.parse(vault.decryptEntry(ITEM_ID, sealed)), {
    v: 1,
    seq: 8,
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tags: [],
    createdAt: "",
    updatedAt: "2026-11-01T00:00:00Z",
    conflictOf: null,
    deleted: true,
  });
  assert.equal(JSON.parse(vault.decryptSummary(ITEM_ID, sealed)).deleted, true);

  // Only an entry this vault can open can be deleted through here.
  fails(
    () => vault.encryptTombstone(OTHER_ID, current, "2026-11-01T00:00:00Z"),
    "DecryptionFailed",
  );
  vault.free();
});

test("what must fail fails for the right reason", () => {
  const vault = vectorVault();
  assert.ok(vectors.mustFail.length >= 11);
  for (const c of vectors.mustFail) {
    for (const decrypt of ["decryptEntry", "decryptSummary", "decryptPassword"]) {
      fails(() => vault[decrypt](c.itemId, c.ciphertext), c.error);
    }
  }
  vault.free();
});

test("a new vault opens with its password and its recovery key", () => {
  const salt = wasm.newSalt();
  const created = keysFor("correct horse", salt).createVault();
  const wrapped = created.wrappedVaultKey;
  const wrappedRecovery = created.wrappedVaultKeyRecovery;
  const recoveryKey = created.recoveryKey;
  assert.equal(created.recoveryAuth, wasm.recoveryAuthOf(recoveryKey));
  const vault = created.takeVault();

  const sealed = vault.encryptEntry(ITEM_ID, entry());
  const byPassword = keysFor("correct horse", salt).unlock(wrapped);
  const byRecovery = Vault.unlockWithRecovery(recoveryKey, wrappedRecovery);
  assert.deepEqual(
    JSON.parse(byPassword.decryptEntry(ITEM_ID, sealed)),
    JSON.parse(entry()),
  );
  assert.deepEqual(
    JSON.parse(byRecovery.decryptEntry(ITEM_ID, sealed)),
    JSON.parse(entry()),
  );

  fails(() => keysFor("wrong horse", salt).unlock(wrapped), "DecryptionFailed");
});

test("a new master password opens the same entries, and the old one doesn't", () => {
  const salt = wasm.newSalt();
  const vault = keysFor("old password", salt).createVault().takeVault();
  const sealed = vault.encryptEntry(ITEM_ID, entry());

  const newSalt = wasm.newSalt();
  const rewrapped = vault.rewrap(keysFor("new password", newSalt));
  assert.equal(
    keysFor("new password", newSalt)
      .unlock(rewrapped)
      .decryptPassword(ITEM_ID, sealed),
    "correct horse battery staple",
  );
  fails(
    () => keysFor("old password", salt).unlock(rewrapped),
    "DecryptionFailed",
  );
});

test("a replacement recovery key opens the vault", () => {
  const vault = keysFor("correct horse").createVault().takeVault();
  const sealed = vault.encryptEntry(ITEM_ID, entry());

  const replacement = vault.createRecovery();
  const reopened = Vault.unlockWithRecovery(
    replacement.recoveryKey,
    replacement.wrappedVaultKeyRecovery,
  );
  assert.equal(
    reopened.decryptPassword(ITEM_ID, sealed),
    "correct horse battery staple",
  );
});

test("sloppy recovery keys are forgiven, typos aren't", () => {
  const { display, recoveryAuth } = vectors.recovery;
  const sloppy = ` ${display.toLowerCase().replaceAll("-", " ")} \n`;
  assert.equal(wasm.recoveryAuthOf(sloppy), recoveryAuth);

  const wrong = display[0] === "A" ? "B" : "A";
  fails(
    () => wasm.recoveryAuthOf(`${wrong}${display.slice(1)}`),
    "InvalidRecoveryKey",
  );
  fails(() => wasm.recoveryAuthOf(""), "InvalidRecoveryKey");
});

test("a ciphertext can't move to another entry", () => {
  const vault = vectorVault();
  const sealed = vault.encryptEntry(ITEM_ID, entry());
  fails(() => vault.decryptEntry(OTHER_ID, sealed), "DecryptionFailed");
  vault.free();
});

test("bad entries are refused going in", () => {
  const vault = vectorVault();
  fails(() => vault.encryptEntry(ITEM_ID, "not json"), "InvalidEntry");
  fails(() => vault.encryptEntry(ITEM_ID, "{}"), "InvalidEntry");
  fails(
    () => vault.encryptEntry(ITEM_ID, entry({ v: 2 })),
    "UnsupportedEntryVersion",
  );
  fails(
    () => vault.encryptEntry(ITEM_ID.toUpperCase(), entry()),
    "InvalidItemId",
  );
  fails(
    () => vault.encryptEntry(ITEM_ID, entry({ notes: "n".repeat(200 * 1024) })),
    "EntryTooLarge",
  );
  vault.free();
});

test("randomness works, and is random", () => {
  const vault = vectorVault();
  assert.notEqual(
    vault.encryptEntry(ITEM_ID, entry()),
    vault.encryptEntry(ITEM_ID, entry()),
  );
  vault.free();

  assert.notEqual(wasm.newSalt(), wasm.newSalt());
  assert.notEqual(wasm.newItemId(), wasm.newItemId());
  assert.match(
    wasm.newItemId(),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  // Salts have to be accepted by what uses them.
  assert.ok(keysFor("correct horse", wasm.newSalt()));

  // A vault's keys differ every time, even from the same password and salt.
  const salt = wasm.newSalt();
  const a = keysFor("correct horse", salt).createVault();
  const b = keysFor("correct horse", salt).createVault();
  assert.notEqual(a.recoveryKey, b.recoveryKey);
  assert.notEqual(a.wrappedVaultKey, b.wrappedVaultKey);
});

test("freeing a vault makes it unusable", () => {
  const vault = vectorVault();
  const { ciphertext, itemId } = vectors.entries.cases[0];
  assert.ok(vault.decryptEntry(itemId, ciphertext));

  vault.free();
  assert.throws(() => vault.decryptEntry(itemId, ciphertext));
});

test("taking the vault uses up what made it", () => {
  const created = keysFor("correct horse").createVault();
  assert.ok(created.takeVault());
  assert.throws(() => created.takeVault());
  assert.throws(() => created.recoveryKey);
});

test("nothing about a key shows in the object or an error", () => {
  const vault = vectorVault();
  assert.equal(JSON.stringify(vault), JSON.stringify({ __wbg_ptr: vault.__wbg_ptr }));

  const sealed = vault.encryptEntry(ITEM_ID, entry());
  try {
    vault.decryptEntry(OTHER_ID, sealed);
    assert.fail("should have thrown");
  } catch (error) {
    assert.equal(error.message, "DecryptionFailed");
  }
  vault.free();
});
