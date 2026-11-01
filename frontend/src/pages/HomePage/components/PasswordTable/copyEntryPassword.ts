import { fetchPassword } from "@/api/passwords";
import { copySecretToClipboard } from "@/tauri/clipboard";

// The list only holds a mask, so an entry that isn't revealed has to be fetched
// first. Pass `revealedPassword` when the entry's real password is already here.
export const copyEntryPassword = async (
  id: string,
  revealedPassword?: string,
): Promise<void> => {
  const password = revealedPassword || (await fetchPassword(id)).password;
  if (!password) {
    throw new Error("Entry has no password to copy");
  }
  await copySecretToClipboard(password);
};
