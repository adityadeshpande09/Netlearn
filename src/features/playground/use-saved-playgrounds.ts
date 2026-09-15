"use client";

import { useSyncExternalStore } from "react";
import {
  createPlaygroundRepository,
  playgroundKey,
  type LibraryResult,
  type SavedPlayground,
} from "@/repositories/playgrounds/playground-repository";

interface LibrarySnapshot {
  ready: boolean;
  items: SavedPlayground[];
  error: string;
}
const initial: LibrarySnapshot = { ready: false, items: [], error: "" };
let snapshot = initial;
const listeners = new Set<() => void>();

function repository() {
  try {
    return createPlaygroundRepository(window.localStorage);
  } catch {
    return createPlaygroundRepository();
  }
}
function publish(result: LibraryResult) {
  snapshot = result.ok
    ? { ready: true, items: result.items, error: "" }
    : { ready: true, items: [], error: result.error };
  listeners.forEach((listener) => listener());
}
function refresh() {
  publish(repository().load());
}
function handleStorage(event: StorageEvent) {
  if (event.key === playgroundKey || event.key === null) refresh();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", handleStorage);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", handleStorage);
  };
}
export function savePlayground(entry: SavedPlayground) {
  const result = repository().save(entry);
  if (result.ok) publish(result);
  return result;
}
export function removePlayground(id: string) {
  const result = repository().remove(id);
  if (result.ok) publish(result);
  return result;
}
export function useSavedPlaygrounds() {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initial,
  );
}
