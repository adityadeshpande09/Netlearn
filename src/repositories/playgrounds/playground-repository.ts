import { decodeWorkspace, type WorkspaceSnapshot } from "./workspace-snapshot";

export interface SavedPlayground {
  id: string;
  name: string;
  updatedAt: string;
  workspace: WorkspaceSnapshot;
}

export type LibraryResult =
  { ok: true; items: SavedPlayground[] } | { ok: false; error: string };

export interface PlaygroundRepository {
  load(): LibraryResult;
  save(entry: SavedPlayground): LibraryResult;
  remove(id: string): LibraryResult;
}

type StoragePort = Pick<Storage, "getItem" | "setItem">;
export const playgroundKey = "netlearn.playgrounds.v1";
export const MAX_PLAYGROUNDS = 20;
const MAX_LIBRARY_CHARACTERS = 1_000_000;
const unreadable =
  "Your saved playground data could not be read. It has been left unchanged.";
const unavailable =
  "Browser storage is unavailable. Your playground has not been saved.";

function failure(error: string): LibraryResult {
  return { ok: false, error };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeEntry(value: unknown): SavedPlayground | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value.id) ||
    typeof value.name !== "string" ||
    value.name.trim().length < 1 ||
    value.name.trim().length > 60 ||
    typeof value.updatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.updatedAt)
  )
    return null;
  const time = new Date(value.updatedAt);
  if (
    !Number.isFinite(time.getTime()) ||
    time.toISOString() !== value.updatedAt
  )
    return null;
  const workspace = decodeWorkspace(value.workspace);
  if (!workspace) return null;
  return {
    id: value.id,
    name: value.name.trim(),
    updatedAt: value.updatedAt,
    workspace,
  };
}

function decodeLibrary(raw: string | null): LibraryResult {
  if (raw === null) return { ok: true, items: [] };
  if (raw.length > MAX_LIBRARY_CHARACTERS) return failure(unreadable);
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.version !== 1 ||
      !Array.isArray(value.items) ||
      value.items.length > MAX_PLAYGROUNDS
    )
      return failure(unreadable);
    const items: SavedPlayground[] = [];
    const ids = new Set<string>();
    const names = new Set<string>();
    for (const rawEntry of value.items) {
      const entry = decodeEntry(rawEntry);
      if (!entry || ids.has(entry.id) || names.has(entry.name.toLowerCase()))
        return failure(unreadable);
      items.push(entry);
      ids.add(entry.id);
      names.add(entry.name.toLowerCase());
    }
    return { ok: true, items };
  } catch {
    return failure(unreadable);
  }
}

export function createPlaygroundRepository(
  storage?: StoragePort,
): PlaygroundRepository {
  function load(): LibraryResult {
    if (!storage) return failure(unavailable);
    try {
      return decodeLibrary(storage.getItem(playgroundKey));
    } catch {
      return failure(unavailable);
    }
  }

  function write(items: SavedPlayground[]): LibraryResult {
    if (!storage) return failure(unavailable);
    const raw = JSON.stringify({ version: 1, items });
    if (raw.length > MAX_LIBRARY_CHARACTERS)
      return failure(
        "Your saved playgrounds are too large for this library. Remove a saved playground before trying again.",
      );
    try {
      storage.setItem(playgroundKey, raw);
      return { ok: true, items };
    } catch {
      return failure(
        "Browser storage could not be updated. Your saved playgrounds are unchanged.",
      );
    }
  }

  return {
    load,
    save(value) {
      const entry = decodeEntry(value);
      if (!entry)
        return failure(
          "Enter a name of 1–60 characters and check that the workspace can be saved.",
        );
      const latest = load();
      if (!latest.ok) return latest;
      if (latest.items.some((item) => item.id === entry.id))
        return failure(
          "That playground already exists. Save a new copy instead.",
        );
      if (
        latest.items.some(
          (item) => item.name.toLowerCase() === entry.name.toLowerCase(),
        )
      )
        return failure(
          "A playground already has that name. Choose a different name.",
        );
      if (latest.items.length >= MAX_PLAYGROUNDS)
        return failure(
          "You can keep up to 20 playgrounds. Remove one before saving another.",
        );
      return write([...latest.items, entry]);
    },
    remove(id) {
      const latest = load();
      if (!latest.ok) return latest;
      if (!latest.items.some((item) => item.id === id)) return latest;
      return write(latest.items.filter((item) => item.id !== id));
    },
  };
}
