import { describe, expect, it } from "vitest";
import { getLesson, lessons } from "@/content/lessons";
import { lessonSlugs } from "@/content/model";
describe("published curriculum", () => {
  it("covers the canonical routes once, in learning order", () => {
    expect(lessons.map((lesson) => lesson.slug)).toEqual([...lessonSlugs]);
    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5]);
    expect(getLesson("missing")).toBeUndefined();
  });
  it.each(lessons)("provides an answerable prediction for $title", (lesson) => {
    expect(lesson.quiz.options.length).toBeGreaterThanOrEqual(2);
    const ids = lesson.quiz.options.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(lesson.quiz.correctOptionId);
    expect(lesson.quiz.explanation.trim().length).toBeGreaterThan(0);
    expect(lesson.quiz.hint.trim().length).toBeGreaterThan(0);
    expect(lesson.objectives.length).toBeGreaterThan(0);
    expect(lesson.sections.every((section) => section.body.length > 0)).toBe(
      true,
    );
  });
});
