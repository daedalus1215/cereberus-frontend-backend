import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPassword } from "@/api/passwords";
import { copySecretToClipboard } from "@/tauri/clipboard";
import { copyEntryPassword } from "./copyEntryPassword";
import type { PasswordEntryResponse } from "./types";

vi.mock("@/api/passwords", () => ({ fetchPassword: vi.fn() }));
vi.mock("@/tauri/clipboard", () => ({ copySecretToClipboard: vi.fn() }));

const entryWithPassword = (password: string) =>
  ({ id: "1", password }) as PasswordEntryResponse;

describe("copyEntryPassword", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches and copies the real password of an entry that isn't revealed", async () => {
    vi.mocked(fetchPassword).mockResolvedValue(entryWithPassword("real"));

    await copyEntryPassword("1");

    expect(fetchPassword).toHaveBeenCalledWith("1");
    expect(copySecretToClipboard).toHaveBeenCalledWith("real");
  });

  it("copies a revealed password without another request", async () => {
    await copyEntryPassword("1", "revealed");

    expect(fetchPassword).not.toHaveBeenCalled();
    expect(copySecretToClipboard).toHaveBeenCalledWith("revealed");
  });

  it("fails without touching the clipboard when the fetch fails", async () => {
    vi.mocked(fetchPassword).mockRejectedValue(new Error("offline"));

    await expect(copyEntryPassword("1")).rejects.toThrow("offline");

    expect(copySecretToClipboard).not.toHaveBeenCalled();
  });

  it("fails rather than copying nothing when the entry has no password", async () => {
    vi.mocked(fetchPassword).mockResolvedValue(entryWithPassword(""));

    await expect(copyEntryPassword("1")).rejects.toThrow();

    expect(copySecretToClipboard).not.toHaveBeenCalled();
  });

  it("fails when the clipboard refuses", async () => {
    vi.mocked(copySecretToClipboard).mockRejectedValue(new Error("denied"));

    await expect(copyEntryPassword("1", "revealed")).rejects.toThrow("denied");
  });
});
