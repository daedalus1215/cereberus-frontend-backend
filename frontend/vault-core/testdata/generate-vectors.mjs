// Writes vectors.json from a second implementation of the format: libsodium and
// Node's own crypto, written from specs/encrypted-vault-sync/spec-1-crypto-core.md
// rather than from the Rust. The crate has to reproduce these byte for byte, so a
// passing test means two implementations agree, not that the crate agrees with itself.
//
// vectors.json is checked in and doesn't normally change: a change means the format
// changed, which would strand every vault already written. To re-run it:
//
//   mkdir /tmp/sodium && npm install --prefix /tmp/sodium --ignore-scripts libsodium-wrappers-sumo
//   node testdata/generate-vectors.mjs /tmp/sodium > testdata/vectors.json
//
// Node 24.7 or later, for its Argon2.
import { argon2Sync, createHash, hkdfSync } from "node:crypto";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(join(resolve(process.argv[2]), "package.json"));
const sodium = require("libsodium-wrappers-sumo");
await sodium.ready;

const b64 = (bytes) => Buffer.from(bytes).toString("base64url");
const counting = (length, start = 0) =>
  Buffer.from(Array.from({ length }, (_, i) => (start + i) & 0xff));

const argon2id = (password, salt, { m, t, p }) => {
  const message = Buffer.from(password.normalize("NFKC"), "utf8");
  const key = argon2Sync("argon2id", {
    message,
    nonce: salt,
    parallelism: p,
    tagLength: 32,
    memory: m,
    passes: t,
  });
  // Two Argon2s, where libsodium can do it (it only offers one lane).
  if (p === 1) {
    const other = sodium.crypto_pwhash(
      32,
      message,
      salt,
      t,
      m * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13,
    );
    if (!Buffer.from(other).equals(Buffer.from(key))) {
      throw new Error("libsodium and Node disagree about Argon2id");
    }
  }
  return Buffer.from(key);
};

const hkdf = (ikm, info) =>
  Buffer.from(hkdfSync("sha256", ikm, Buffer.alloc(0), info, 32));

const seal = (key, nonce, aad, plaintext) =>
  `cv1.${b64(
    Buffer.concat([
      nonce,
      sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        plaintext,
        Buffer.from(aad, "utf8"),
        null,
        nonce,
        key,
      ),
    ]),
  )}`;

const pad = (bytes) => {
  const length = (Math.floor(bytes.length / 256) + 1) * 256;
  const padded = Buffer.alloc(length);
  bytes.copy(padded);
  padded[bytes.length] = 0x80;
  return padded;
};

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const crockford = (bytes) => {
  let bits = 0;
  let width = 0;
  let out = "";
  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    width += 8;
    while (width >= 5) {
      out += CROCKFORD[(bits >> (width - 5)) & 31];
      width -= 5;
    }
    bits &= (1 << width) - 1;
  }
  if (width > 0) out += CROCKFORD[(bits << (5 - width)) & 31];
  return out;
};

const SALT = counting(16);
const VAULT_KEY = counting(32, 0x40);
const NONCE = counting(24, 0x80);
const DEFAULTS = { alg: "argon2id", m: 65536, t: 3, p: 1 };
const FLOOR = { alg: "argon2id", m: 19456, t: 2, p: 1 };

const kdfCase = (name, password, params = DEFAULTS) => {
  const master = argon2id(password, SALT, params);
  const kek = hkdf(master, "cereberus/v1/kek");
  return {
    name,
    password,
    salt: b64(SALT),
    params,
    // Nothing reads this back. It's what the memory search looks for.
    masterKey: b64(master),
    authKey: b64(hkdf(master, "cereberus/v1/auth")),
    kek: b64(kek),
    wrappedVaultKey: seal(kek, NONCE, "cereberus/v1/vault-key", VAULT_KEY),
  };
};

const kdf = [
  kdfCase("plain text", "correct horse battery staple"),
  kdfCase("the cheapest parameters allowed", "correct horse battery staple", FLOOR),
  kdfCase("two lanes", "correct horse battery staple", { ...FLOOR, p: 2 }),
  kdfCase("accents, precomposed", "café päss"),
  kdfCase("accents, decomposed", "café päss"),
  kdfCase("a compatibility ligature", "ﬁsh"),
  kdfCase("what that ligature normalises to", "fish"),
  kdfCase("emoji and other scripts", "пароль 🔑 密码"),
];

const KEK = counting(32, 0x20);

const wrap = {
  kek: b64(KEK),
  vaultKey: b64(VAULT_KEY),
  nonce: b64(NONCE),
  wrappedVaultKey: seal(KEK, NONCE, "cereberus/v1/vault-key", VAULT_KEY),
};

const RECOVERY_KEY = counting(32, 0x60);
const check = createHash("sha256")
  .update("cereberus/v1/recovery-check")
  .update(RECOVERY_KEY)
  .digest()
  .subarray(0, 2);
const recovery = {
  key: b64(RECOVERY_KEY),
  display: crockford(Buffer.concat([RECOVERY_KEY, check]))
    .match(/.{1,5}/g)
    .join("-"),
  recoveryAuth: b64(hkdf(RECOVERY_KEY, "cereberus/v1/recovery-auth")),
  vaultKey: b64(VAULT_KEY),
  nonce: b64(NONCE),
  wrappedVaultKeyRecovery: seal(
    hkdf(RECOVERY_KEY, "cereberus/v1/recovery-kek"),
    NONCE,
    "cereberus/v1/recovery-vault-key",
    VAULT_KEY,
  ),
};

const ITEM_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const entryBase = {
  v: 1,
  seq: 1,
  name: "",
  username: "",
  password: "",
  url: "",
  notes: "",
  tags: [],
  createdAt: "",
  updatedAt: "",
  conflictOf: null,
};
const sealEntry = (json) =>
  seal(
    VAULT_KEY,
    NONCE,
    `cereberus/v1/item|${ITEM_ID}`,
    pad(Buffer.from(json, "utf8")),
  );

const entryCase = (name, fields) => {
  const json = JSON.stringify({ ...entryBase, ...fields });
  return { name, itemId: ITEM_ID, json, ciphertext: sealEntry(json) };
};

// Notes that take the JSON to exactly a block boundary, so padding needs a whole
// block of its own.
const baseLength = Buffer.byteLength(JSON.stringify(entryBase), "utf8");

const entries = {
  vaultKey: b64(VAULT_KEY),
  nonce: b64(NONCE),
  cases: [
    entryCase("nearly empty", {}),
    entryCase("every field, in several scripts", {
      seq: 42,
      name: "Bänk 🏦",
      username: "user@example.com",
      password: 'pa"ss\\wo/rd\n\t\u0001',
      url: "https://example.com/login?a=1&b=2",
      notes: "line one\nline two\nпароль 密码",
      tags: ["work", "café"],
      createdAt: "2026-10-30T12:00:00Z",
      updatedAt: "2026-10-30T13:00:00Z",
      conflictOf: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    }),
    entryCase("exactly one block before padding", {
      notes: "n".repeat(256 - baseLength),
    }),
    entryCase("one byte short of a block", {
      notes: "n".repeat(255 - baseLength),
    }),
    entryCase("several blocks", { notes: "n".repeat(1000) }),
    entryCase("a field from a newer version", {
      androidPackages: ["com.example.app"],
    }),
  ],
};

const OTHER_KEY = counting(32, 0xa0);
const good = sealEntry(JSON.stringify(entryBase));
const flipLastByte = (text) => {
  const raw = Buffer.from(text.slice("cv1.".length), "base64url");
  raw[raw.length - 1] ^= 1;
  return `cv1.${b64(raw)}`;
};
const sealRaw = (key, plaintext) =>
  seal(key, NONCE, `cereberus/v1/item|${ITEM_ID}`, plaintext);

const mustFail = [
  ["a changed ciphertext", ITEM_ID, flipLastByte(good), "DecryptionFailed"],
  [
    "another entry's id",
    "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    good,
    "DecryptionFailed",
  ],
  [
    "another vault's key",
    ITEM_ID,
    sealRaw(OTHER_KEY, pad(Buffer.from(JSON.stringify(entryBase)))),
    "DecryptionFailed",
  ],
  ["an unknown format", ITEM_ID, `cv2.${good.slice(4)}`, "UnsupportedFormat"],
  ["no format at all", ITEM_ID, good.slice(4), "UnsupportedFormat"],
  ["an id in the wrong case", ITEM_ID.toUpperCase(), good, "InvalidItemId"],
  [
    "truncated below the nonce and tag",
    ITEM_ID,
    `cv1.${b64(counting(39))}`,
    "MalformedCiphertext",
  ],
  [
    "no padding at all",
    ITEM_ID,
    sealRaw(VAULT_KEY, Buffer.from(JSON.stringify(entryBase))),
    "InvalidEntry",
  ],
  [
    "padding of the wrong length",
    ITEM_ID,
    sealRaw(
      VAULT_KEY,
      Buffer.concat([Buffer.from(JSON.stringify(entryBase)), Buffer.from([0x80])]),
    ),
    "InvalidEntry",
  ],
  [
    "a missing password",
    ITEM_ID,
    sealEntry(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(entryBase).filter(([key]) => key !== "password"),
        ),
      ),
    ),
    "InvalidEntry",
  ],
  [
    "a newer entry version",
    ITEM_ID,
    sealEntry(JSON.stringify({ v: 2, somethingNew: true })),
    "UnsupportedEntryVersion",
  ],
].map(([name, itemId, ciphertext, error]) => ({
  name,
  itemId,
  ciphertext,
  error,
}));

const refusedParams = [
  { ...FLOOR, m: 19455 },
  { ...FLOOR, t: 1 },
  { ...FLOOR, p: 0 },
  { alg: "argon2id", m: 8, t: 1, p: 1 },
  { ...FLOOR, m: 256 * 1024 + 1 },
  { ...FLOOR, t: 17 },
  { ...FLOOR, p: 5 },
];

process.stdout.write(
  `${JSON.stringify(
    {
      comment:
        "From testdata/generate-vectors.mjs, a second implementation. Don't edit by hand.",
      kdf,
      refusedParams,
      wrap,
      recovery,
      entries,
      mustFail,
    },
    null,
    2,
  )}\n`,
);
