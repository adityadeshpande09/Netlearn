import { isLessonSlug, lessonSlugs, type LessonSlug } from "@/content/model";
export type PersistenceMode = "saved" | "memory";
export interface ProgressData {
  completed: LessonSlug[];
  persistence: PersistenceMode;
}
export interface ProgressRepository {
  load(): ProgressData;
  save(completed: LessonSlug[]): boolean;
}
type StoragePort = Pick<Storage, "getItem" | "setItem">;
export const progressKey = "netlearn.progress.v1";
export function normalizeProgress(values: readonly unknown[]): LessonSlug[] {
  return lessonSlugs.filter((slug) => values.includes(slug));
}
export function decodeProgress(raw: string | null): ProgressData {
  if (raw === null) return { completed: [], persistence: "saved" };
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== "object" ||
      value === null ||
      !("version" in value) ||
      value.version !== 1 ||
      !("completed" in value) ||
      !Array.isArray(value.completed) ||
      !value.completed.every((item: unknown) => typeof item === "string")
    ) {
      return { completed: [], persistence: "memory" };
    }
    return {
      completed: normalizeProgress(value.completed.filter(isLessonSlug)),
      persistence: "saved",
    };
  } catch {
    return { completed: [], persistence: "memory" };
  }
}
export function createProgressRepository(
  storage?: StoragePort,
): ProgressRepository {
  return {
    load() {
      if (!storage) return { completed: [], persistence: "memory" };
      try {
        return decodeProgress(storage.getItem(progressKey));
      } catch {
        return { completed: [], persistence: "memory" };
      }
    },
    save(completed) {
      if (!storage) return false;
      try {
        storage.setItem(
          progressKey,
          JSON.stringify({
            version: 1,
            completed: normalizeProgress(completed),
          }),
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}
