import type { LessonSlug } from "@/content/model";

// Mirrors the checked-in migration; regenerate and review after schema changes.
export interface Database {
  public: {
    Tables: {
      lesson_completions: {
        Row: {
          user_id: string;
          lesson_slug: string;
          completed_at: string;
        };
        Insert: {
          user_id: string;
          lesson_slug: LessonSlug;
          completed_at?: string;
        };
        // The application only inserts or ignores duplicate completions.
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
