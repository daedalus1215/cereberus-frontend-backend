# Spec 2 — Backend: encrypted vault API

## Goal

The server can store and sync encrypted entries it can't read. This only adds to
the API: legacy endpoints keep working, and it's safe to deploy before any client
uses it.

## Decisions

- **The server gets one write endpoint.** `POST /vault/changes` handles creates,
  updates and deletes in one transaction, so an offline device can send a backlog
  in one go.
- **Client-made UUIDs replace integer ids,** so a device can create entries while
  offline.
- **Deletes leave a marker** (`deleted_at`, ciphertext cleared). Today's hard delete
  ([`password.repository.impl.ts:33`](../../backend/src/password/infra/repositories/password.repository.impl.ts))
  would leave other devices holding the entry forever. Markers are kept, since
  they're tiny.
- **Revisions, not timestamps.** Each account has a counter, bumped in the same
  transaction as the write. The row lock on `user` keeps one account's writes in
  order, so `since=N` can't skip one. Device clocks are never trusted.
- **Login keeps its shape.** `{username, password}`, where the client now sends the
  auth key as `password`; [`auth.service.ts:25`](../../backend/src/auth/domain/auth.service.ts)
  compares it with bcrypt as before.

## Schema

```
vault_items
  user_id     int   references "user"
  id          uuid
  ciphertext  text  null (null once deleted)
  revision    bigint
  deleted_at  timestamptz null
  created_at, updated_at
  primary key (user_id, id)    one account can't touch another's row by guessing a UUID
  index (user_id, revision)

"user", new columns
  encryption_version          smallint default 0    0 = legacy, 1 = encrypted
  kdf_salt, kdf_params        text null
  wrapped_vault_key           text null
  wrapped_vault_key_recovery  text null
  recovery_auth_hash          text null
  vault_revision              bigint default 0
```

`user` is a reserved word in Postgres; quote it in raw SQL.

## API

```
GET  /auth/prelogin?username=
     { kdf, salt, encryptionVersion }

POST /auth/login   { username, password: <auth key> }
     { access_token, wrappedVaultKey }

GET  /vault/items?since=<revision>
     { items: [{ id, revision, ciphertext, deleted }], latestRevision }

POST /vault/changes
     { changes: [{ id, baseRevision | null, ciphertext | null }] }     null ciphertext = delete
     { results: [{ id, status: "ok", revision }
               | { id, status: "conflict", current: { revision, ciphertext, deleted } }],
       latestRevision }

POST /users/register            { username, password: <auth key>, salt, kdf,
                                  wrappedVaultKey, wrappedVaultKeyRecovery, recoveryAuth }
PUT  /users/master-password     { currentAuthKey, newAuthKey, salt, kdf, wrappedVaultKey }
POST /auth/recover/start        { username, recoveryAuth }  →  { wrappedVaultKeyRecovery }
POST /auth/recover/complete     { username, recoveryAuth, newAuthKey, salt, kdf, wrappedVaultKey }
```

## Commits

### Commit 1 — `feat(vault): schema for encrypted items and account keys`

- [ ] Entity `VaultItem` and a migration from
  [`generate-migration.js`](../../backend/generate-migration.js).
- [ ] New `user` columns. Existing rows get `encryption_version = 0`.

### Commit 2 — `feat(auth): prelogin returns the account's key parameters`

- [ ] `GET /auth/prelogin`, throttled at 20 a minute.
- [ ] An unknown username gets a salt computed as `HMAC(JWT_SECRET, "prelogin|" + username)`
  and the default parameters, in the same shape, so it can't be used to find out
  which usernames exist. Same answer every time for the same name.
- [ ] `POST /auth/login` also returns `wrappedVaultKey`.

### Commit 3 — `feat(vault): fetch and apply encrypted changes`

- [ ] `backend/src/vault/` module, action then transaction script then repository,
  with validated DTOs (`main.ts` sets `forbidNonWhitelisted`).
- [ ] `GET /vault/items`: only the caller's rows, `revision > since`, including
  delete markers, plus `latestRevision`.
- [ ] `POST /vault/changes`, in one transaction per request, for each change:
  - `baseRevision` matches the row's revision (or null and no row exists): write
    it, bump `vault_revision`, return `ok`.
  - It doesn't match, **but the submitted ciphertext equals the stored one**:
    return `ok` with the stored revision. This is a retry after a lost response;
    random nonces mean identical ciphertext is the same upload.
  - Otherwise return `conflict` with the current row. One conflict doesn't fail
    the other changes.
- [ ] Limits: 100 changes per request, 256 KiB per ciphertext, 1 MiB per body
  (`app.useBodyParser`; Express's default is 100 KB and notes have no length limit
  today). The client splits larger backlogs.
- [ ] Reject ciphertext that doesn't start with `cv1.`.
- [ ] The global throttle of 100 a minute ([`app.module.ts:21`](../../backend/src/app.module.ts))
  stays. Clients back off on 429.
- [ ] Reject both endpoints for accounts with `encryption_version = 0`, apart from
  the migration exception added in Spec 4.

### Commit 4 — `feat(users): register, change master password and recover with keys`

- [ ] [`POST /users/register`](../../backend/src/users/app/controllers/users.controller.ts)
  takes the fields above and creates `encryption_version = 1` accounts. The auth
  key is validated as a 32-byte base64 string; password length rules
  (`update-user-password.transaction.script.ts:7`) no longer apply on the server.
- [ ] `PUT /users/master-password`: checks the current auth key, then replaces the
  hash, salt, parameters and wrapped key together, in one transaction.
- [ ] `POST /auth/recover/*`, throttled at 5 a minute like login. `recoveryAuth`
  is compared against `recovery_auth_hash` in constant time; a failed attempt is
  logged through `SecurityEventAggregator`, as a failed login is.
- [ ] [`PUT /users/username`](../../backend/src/users/domain/transaction-scripts/update-username-TS/update-username.transaction.script.ts)
  needs no change, since the client sends the auth key as `currentPassword`.

## Acceptance criteria

- A new account can register, log in, write and read back entries using only
  ciphertext, via the API tests.
- Two devices editing from the same `baseRevision`: first gets `ok`, second gets
  `conflict` with the first's row.
- Sending the same change twice gives `ok` both times and one revision.
- `since=N` returns exactly the changes after N, including deletes.
- One account can't read or overwrite another's entries, even knowing the UUID.
- `/auth/prelogin` looks the same for real and unknown usernames.
- Every legacy endpoint behaves as it did. The existing specs still pass.

## Out of scope

- Client changes (Spec 3).
- Legacy export and migration endpoints (Spec 4).
- Per-device sessions and revocation. Changing the master password locks other
  devices out of sync, which is enough for now.

## Tests

Follow `__specs__/*.spec.ts`: transaction script tests for each `POST /vault/changes`
outcome, and e2e tests in `backend/test/` against a real Postgres for the
transaction and ordering behaviour, including two concurrent writes to one account.
