# Spec 4 — Migrating the real vault

## Goal

Every existing entry moves into the encrypted format without any risk of losing
one, and the server stops being able to read the vault.

This is the riskiest step in the plan: it's the one that operates on real
passwords. It has to be restartable, verified before it commits, and reversible
for two weeks afterwards.

## How it works

The migration runs in the new client, on a device at home:

1. Log in with the current password. Prelogin reports `encryptionVersion: 0`, so
   the client goes straight to the migration screen.
2. Choose a **new** master password. The old one has crossed Cloudflare in
   plaintext, so it can't be reused. Save the recovery key and type part of it back.
3. The client downloads all entries in one request, encrypts each under a new vault
   key, and uploads them. Login doesn't change yet, and the legacy data is untouched.
4. The client downloads what it uploaded, decrypts all of it, and compares every
   field against the export. Any difference stops the migration here.
5. Only then does it call finalize, which in one transaction switches the login to
   the new auth key and sets `encryption_version = 1`.
6. Legacy tables stay for two weeks as the way back. Then they're dropped.

Restarting is safe at any point before step 5: `migrate/start` clears that account's
pending items.

## Commits

### Commit 1 — `feat(vault): legacy export and migration endpoints`

- [ ] `GET /vault/legacy-export`: every entry with its decrypted password and tag
  names, for version-0 accounts only.
  - It sends the whole vault at once, so it **refuses any request carrying
    `CF-Ray` or `CF-Connecting-IP`**. Cloudflare adds those headers, so the export
    can't happen through the tunnel. It only works on the LAN.
- [ ] `POST /vault/migrate/start`: stores the new salt, parameters, wrapped keys and
  recovery hash, clears pending items, leaves the login alone.
- [ ] `POST /vault/changes` accepts version-0 accounts once `start` has run.
- [ ] `POST /vault/migrate/finalize { newAuthKey, expectedCount }`: checks the count,
  saves the old hash to `legacy_password_hash`, then replaces it with
  `bcrypt(newAuthKey)` and sets `encryption_version = 1`, in one transaction.
- [ ] After finalize, legacy `/passwords` and `/tags` endpoints return 410 for that
  account.

### Commit 2 — `feat(frontend): migration screen`

- [ ] Steps 2–5 above, with visible progress. A failure says what happened and that
  nothing has changed.
- [ ] Master password rules as in Spec 3, and it must not match the old password.
- [ ] Field comparison handles what legacy data really contains: `null` URLs and
  notes, empty strings, entries without tags, non-ASCII text.
- [ ] Refuse to start through the tunnel with a clear message, rather than hitting
  the export's refusal.

### Rehearsal on dev

- [ ] Script that seeds the dev server with 500 entries covering the awkward cases
  above.
- [ ] Run the migration; every entry matches.
- [ ] Kill it at each step (between upload and verify, verify and finalize, during
  finalize), restart, and it still ends correct with no duplicates.
- [ ] Corrupt one uploaded item on purpose; verification stops it and login still
  works the old way.
- [ ] Rehearse the rollback below, and confirm the old client logs in again.
- [ ] Time it, so the real run has an expected duration.

## Cutover **(you)**

Claude doesn't run any of this.

- [ ] Answer Q1: are there other accounts?
- [ ] Take a fresh backup with home-lab's backup script, and check it restores into
  a scratch database.
- [ ] **Remove old clients first.** Uninstall the v0.1.0 APK. A stale client sends
  whatever you type straight to the server, so typing the new master password into
  one would expose it to Cloudflare. Keep the new password away from any old app
  or cached web page.
- [ ] Deploy the new backend and frontend images.
- [ ] At home, migrate from the new desktop app using the LAN address. Plain HTTP on
  your own LAN is a much smaller exposure than the export going through Cloudflare.
- [ ] Print the recovery key and store it away from the devices.
- [ ] Spot-check several entries on another device. Then install the new APK on the
  phone and log in.

## Rollback (until the cleanup commit)

```sql
UPDATE "user" SET password = legacy_password_hash, encryption_version = 0 WHERE id = <id>;
```

Then deploy the previous images and reinstall the old clients.
Anything changed since cutover is lost, as those edits exist only in `vault_items`.

## After two quiet weeks

- [ ] **(you)** Confirm real use on every device, and that the recovery key is stored.

### Commit 3 — `chore(password): remove the legacy vault`

- [ ] Migration drops `passwords`, `password_tags`, `tags` and
  `user.legacy_password_hash`.
- [ ] Delete [`EncryptionAdapter`](../../backend/src/password/infra/encryption/encryption.adapter.ts),
  the legacy actions and transaction scripts, the export and migration endpoints, and
  `ENCRYPTION_KEY` and `ENCRYPTION_SALT` from `.env.sample`. Also the unused
  `fetch-password-action/fetch-passwords.action.ts`, which no module registers.

### In home-lab **(you)**

- [ ] Remove the encryption key and salt from Cereberus's compose file and from the
  deploy secrets, and retire the compose file's warning about them.
- [ ] Fix that file's header, which says Cereberus is LAN-only when the production
  environment also routes the public hostname, or make it true for the web app (Q3).
- [ ] Rewrite D28. It says entries are encrypted client-side; from now on that's
  true for the apps, while a browser on the public hostname still trusts Cloudflare
  for its code.
- [ ] Decide Q3 (web app LAN-only) and Q4 (rotation), and rotate.

## What this doesn't erase

- **Backups keep the old data.** Database dumps age out in about two weeks, but VM
  backups can last up to a year (home-lab's `INVENTORY.md` has the retention). Until
  then they hold plaintext names, usernames, URLs and notes, and old-format passwords,
  possibly with the old key alongside them. Let them age out: pruning them would also
  remove disaster recovery.
- **The old key stays recoverable** from the history of the deploy secrets.
- **Cloudflare has already had the chance** to see what's been through the tunnel.

Rotation (Q4) is the only real fix for the passwords that matter most.

## Acceptance criteria

- Every entry matched field by field before finalize, on the real run.
- The database holds no readable entry fields in `vault_items`.
- After cleanup, the backend starts with no `ENCRYPTION_KEY` set.
- Export is refused for a request carrying `CF-Ray`, and for a version-1 account.

## Out of scope

- Anything stored on the device (Spec 5).
- Recovering the old password if forgotten before migrating; the current password
  is needed to start.

## Tests

Transaction script tests for each endpoint's guards. The dev rehearsal above is the
real test of the flow.
