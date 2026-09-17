import type { SupabaseClient } from "@supabase/supabase-js";
import { isLessonSlug, type LessonSlug } from "@/content/model";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeProgress } from "./progress-repository";

export interface CloudProgressRepository {
  load(userId: string): Promise<LessonSlug[]>;
  add(userId: string, completed: readonly LessonSlug[]): Promise<void>;
}

export function createCloudProgressRepository(
  client: SupabaseClient<Database>,
): CloudProgressRepository {
  return {
    async load(userId) {
      try {
        if (!userId) throw new Error("Missing account");
        const { data, error } = await client
          .from("lesson_completions")
          .select("lesson_slug")
          .eq("user_id", userId);
        const rows: unknown = data;
        if (error || !Array.isArray(rows)) throw new Error("Invalid response");
        const completed: LessonSlug[] = [];
        for (const row of rows) {
          if (
            typeof row !== "object" ||
            row === null ||
            !("lesson_slug" in row) ||
            !isLessonSlug(row.lesson_slug)
          )
            throw new Error("Invalid completion");
          completed.push(row.lesson_slug);
        }
        return normalizeProgress(completed);
      } catch {
        throw new Error("Could not load your account progress. Try again.");
      }
    },
    async add(userId, completed) {
      const slugs = normalizeProgress(completed);
      if (!slugs.length) return;
      try {
        if (!userId) throw new Error("Missing account");
        const { error } = await client.from("lesson_completions").upsert(
          slugs.map((lesson_slug) => ({ user_id: userId, lesson_slug })),
          { onConflict: "user_id,lesson_slug", ignoreDuplicates: true },
        );
        if (error) throw new Error("Write failed");
      } catch {
        throw new Error("Could not save your account progress. Try again.");
      }
    },
  };
}
