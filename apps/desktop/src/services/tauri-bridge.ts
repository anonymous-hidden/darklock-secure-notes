/**
 * Desktop Tauri bridge — wraps Tauri IPC commands for the frontend.
 */

interface TauriInvoke {
  (cmd: string, args?: Record<string, unknown>): Promise<unknown>;
}

let invoke: TauriInvoke | null = null;

async function getInvoke(): Promise<TauriInvoke> {
  if (invoke) return invoke;
  try {
    const mod = await import('@tauri-apps/api/core');
    invoke = mod.invoke;
    return invoke;
  } catch {
    // Not running inside Tauri — provide a no-op stub
    invoke = async () => { throw new Error('Not running in Tauri'); };
    return invoke;
  }
}

/** Read a file from the Darklock data directory */
export async function readVaultFile(relativePath: string): Promise<Uint8Array> {
  const inv = await getInvoke();
  return inv('read_vault_file', { path: relativePath }) as Promise<Uint8Array>;
}

/** Write a file to the Darklock data directory */
export async function writeVaultFile(relativePath: string, data: Uint8Array): Promise<void> {
  const inv = await getInvoke();
  await inv('write_vault_file', { path: relativePath, data: Array.from(data) });
}

/** Delete a file from the Darklock data directory */
export async function deleteVaultFile(relativePath: string): Promise<void> {
  const inv = await getInvoke();
  await inv('delete_vault_file', { path: relativePath });
}

/** List files in a subdirectory of the data dir */
export async function listVaultDir(relativePath: string): Promise<string[]> {
  const inv = await getInvoke();
  return inv('list_vault_dir', { path: relativePath }) as Promise<string[]>;
}

/** Securely wipe memory (Rust side) */
export async function secureZeroize(label: string): Promise<void> {
  const inv = await getInvoke();
  await inv('secure_zeroize', { label });
}

/** Get the app data directory path */
export async function getDataDir(): Promise<string> {
  const inv = await getInvoke();
  return inv('get_data_dir') as Promise<string>;
}

export { getInvoke };
