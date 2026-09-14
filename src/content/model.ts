export const lessonSlugs = [
  "network-basics",
  "mac-vs-ip",
  "switches",
  "routers",
  "packet-travel",
] as const;
export type LessonSlug = (typeof lessonSlugs)[number];
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionId: string;
  explanation: string;
  hint: string;
}
export interface Lesson {
  slug: LessonSlug;
  order: number;
  title: string;
  question: string;
  summary: string;
  minutes: number;
  objectives: string[];
  sections: {
    title: string;
    body: string[];
    callout?: { label: string; body: string };
  }[];
  concepts: { term: string; definition: string }[];
  diagram: "lan" | "addresses" | "switch" | "router" | "journey";
  quiz: QuizQuestion;
}
export function isLessonSlug(value: unknown): value is LessonSlug {
  return (
    typeof value === "string" && lessonSlugs.some((slug) => slug === value)
  );
}
