# Spec 6 — Offline edits and sync

## Goal

Add, edit and delete work with no server. Changes go up when it's reachable, and no
version of a password is ever silently lost.

## Decisions

- **Local edits apply at once and are queued.** The queue holds ciphertext only, so a
  backlog exposes nothing extra.
- **New entries get a client-made UUID,** so nothing needs remapping after upload.
- **Conflicts keep both versions:**

| This device | Server has | Result |
|---|---|---|
| Edited | Edited elsewhere | Server's version keeps the entry, if it decrypts and its `seq` is above the outbox's `baseSeq`. If not, the local copy stays and you're warned, so a conflict reply can't roll an entry back. This device's version becomes a new entry with `conflictOf` set |
| Edited | Deleted elsewhere | This device's version comes back as a new entry, with `conflictOf` set |
| Deleted | Edited elsewhere | Delete is dropped, and the edited entry stays. Tell the user |
| Deleted | Deleted | Nothing to do |

- **A conflict copy is an ordinary encrypted entry,** so it syncs to other devices and
  gets resolved once. Resolving means choosing which to keep and deleting the other.
- **A delete is a tombstone with a higher `seq`.** In the table, "deleted" means a tombstone
  that passed the check above. Nothing else counts.
- **Conflict replies are checked against the last synced copy** (`baseSeq`), not the pending
  edit. Two offline edits can leave a device's `seq` above a real edit made elsewhere, and
  comparing with the pending edit would call that a rollback. False alarms would also teach
  you to ignore the only rollback warning there is.
- **Junk on the server heals.** A pulled copy that fails with `DecryptionFailed` or
  `MalformedCiphertext` is refused, and the device re-queues its own copy. A copy that fails
  with `UnsupportedEntryVersion` or `UnsupportedFormat` was written by a newer app, so it's
  left alone and the app asks to be updated.
- **Retries are safe.** Spec 2 returns `ok` for a re-sent identical ciphertext, so a
  lost response doesn't turn into a false conflict.

## Commits

### Commit 1 — `feat(desktop): queue of local changes`

- [ ] Add `outbox: [{ id, baseRevision, baseSeq, ciphertext }]` to the vault file, with
  `format` raised to 2 and an upgrade from 1.
- [ ] `save` and `remove` update `items` and the outbox in one atomic save.
- [ ] Editing an entry that's already queued replaces its queued change and keeps its
  `baseRevision`, so a backlog sends only the latest.

### Commit 2 — `feat(frontend): send queued changes`

- [ ] Order: send the outbox, apply results, then pull. Advance the cursor only after
  saving.
- [ ] Split batches to fit Spec 2's limits. Back off on 429 and network errors.
- [ ] One sync at a time, with a queued request if another is asked for.
- [ ] A 4xx that isn't a conflict leaves that change queued and visible rather than
  dropping it; other changes carry on.

### Commit 3 — `feat(frontend): keep both versions on a conflict`

- [ ] Follow the table above, in `vault_store.rs` or TypeScript, wherever the ciphertext
  and decrypt calls are simplest, under test.
- [ ] Conflict copies are named clearly and marked in the list, with a count.
- [ ] Compare screen: two versions side by side, passwords hidden until revealed, and
  "Keep this one".

### Commit 4 — `feat(frontend): handle a server restored from backup`

- [ ] Home-lab restores are a real scenario. When the device's cursor is ahead of
  `latestRevision`, do a full pull rather than trusting the cursor.
- [ ] For each entry where the device's `seq` is higher than the server's, or the server's
  copy is junk as defined above, re-queue the device's copy. Nothing newer on a device is lost to a
  restore, and a tombstone is re-queued like an edit, so deleted entries don't come back.
- [ ] **A known limit:** `seq` is one number, so it can't spot two devices editing
  separately from a restored backup. The higher `seq` wins without a conflict. Accepted for
  one person's devices, and the notice below points you to check recent edits.
- [ ] Show a notice saying this happened.

### Commit 5 — `feat(frontend): sync status`

- [ ] Status: synced at a time, N changes waiting, offline, conflict count. Reuse the
  idea of the siblings' `SyncStatusIndicator`.
- [ ] Warn before sign-out if the queue isn't empty, since those changes exist nowhere
  else.
- [ ] Update [`frontend/README.md`](../../frontend/README.md).

## Acceptance criteria

**In the Docker rig, with two app instances on separate data directories**

- [ ] Offline add, edit, delete; back online, and the other instance has all of them.
- [ ] Both edit one entry offline: both versions exist on both instances after sync,
  and resolving on one clears it on the other.
- [ ] Every other row of the conflict table behaves as written.
- [ ] Kill the app between send and save: the next sync neither duplicates nor falsely
  conflicts.
- [ ] Restore the server's database to an older dump: no newer entry is lost on any
  device.
- [ ] A backlog larger than one batch, and 429s from the throttle, both complete.

**Android and desktop together (you)**

- [ ] Edit in airplane mode on the phone, edit the same entry on the laptop, reconnect,
  and both versions appear in both places.

## Out of scope

- Field-level merging. Two versions and a choice is enough, and it's easy to reason about.
- Offline edits in the browser. Password history, beyond conflict copies.

## Tests

The conflict table is the main test target: one test for each row, plus the outbox
replacement rule and crash points in the send, save and pull sequence.
