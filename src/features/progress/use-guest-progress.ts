"use client";
import { useSyncExternalStore } from "react";
import type { LessonSlug } from "@/content/model";
import {
  createProgressRepository,
  normalizeProgress,
  progressKey,
  type ProgressData,
} from "@/repositories/progress/progress-repository";
interface Snapshot extends ProgressData {
  ready: boolean;
}
const empty: Snapshot = { completed: [], persistence: "saved", ready: false };
let snapshot: Snapshot = empty;
const listeners = new Set<() => void>();
function repository() {
  try {
    return createProgressRepository(window.localStorage);
  } catch {
    return createProgressRepository();
  }
}
function publish(next: Snapshot) {
  if (
    next.ready === snapshot.ready &&
    next.persistence === snapshot.persistence &&
    next.completed.join() === snapshot.completed.join()
  )
    return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}
function refresh() {
  const loaded = repository().load();
  // Keep this tab's unsaved work when a route change reconnects subscribers.
  const hasUnsavedProgress = snapshot.persistence === "memory";
  publish({
    completed: hasUnsavedProgress
      ? normalizeProgress([...snapshot.completed, ...loaded.completed])
      : loaded.completed,
    persistence: hasUnsavedProgress ? "memory" : loaded.persistence,
    ready: true,
  });
}
function handleStorage(event: StorageEvent) {
  if (event.key === progressKey || event.key === null) refresh();
}
function subscribe(listener: () => void) {
  const first = listeners.size === 0;
  listeners.add(listener);
  if (first) {
    window.addEventListener("storage", handleStorage);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", handleStorage);
  };
}
function getSnapshot() {
  return snapshot;
}
function getServerSnapshot() {
  return empty;
}
export function completeGuestLesson(slug: LessonSlug) {
  const repo = repository();
  const persisted = repo.load();
  const completed = normalizeProgress([
    ...snapshot.completed,
    ...persisted.completed,
    slug,
  ]);
  // Do not overwrite malformed or future-version data; this tab can still progress.
  const saved = persisted.persistence === "saved" && repo.save(completed);
  publish({ completed, persistence: saved ? "saved" : "memory", ready: true });
}
export function useGuestProgress() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
