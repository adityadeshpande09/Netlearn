import { describe, expect, it } from "vitest";
import { getLesson, lessons } from "@/content/lessons";
import { isLessonSlug, lessonSlugs } from "@/content/model";
describe("published curriculum", () => {
  it("covers the canonical routes once, in learning order", () => {
    expect(lessons.map((lesson) => lesson.slug)).toEqual([...lessonSlugs]);
    expect(lessons.map((lesson) => lesson.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(getLesson("missing")).toBeUndefined();
  });
  it("preserves the original routes and appends the next three lessons", () => {
    expect(lessonSlugs.slice(0, 5)).toEqual([
      "network-basics",
      "mac-vs-ip",
      "switches",
      "routers",
      "packet-travel",
    ]);
    expect(lessonSlugs.slice(5)).toEqual(["arp", "icmp-ping", "subnetting"]);
    expect(isLessonSlug("arp")).toBe(true);
    expect(isLessonSlug("icmp-ping")).toBe(true);
    expect(isLessonSlug("subnetting")).toBe(true);
    expect(isLessonSlug("ping")).toBe(false);
  });
  it.each(lessons)("provides an answerable prediction for $title", (lesson) => {
    expect(lesson.quiz.options).toHaveLength(3);
    const ids = lesson.quiz.options.map((option) => option.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(lesson.quiz.correctOptionId);
    expect(lesson.quiz.explanation.trim().length).toBeGreaterThan(0);
    expect(lesson.quiz.hint.trim().length).toBeGreaterThan(0);
    expect(lesson.objectives).toHaveLength(3);
    expect(lesson.concepts).toHaveLength(3);
    expect(lesson.sections).toHaveLength(3);
    expect(lesson.sections.every((section) => section.body.length === 2)).toBe(
      true,
    );
    expect(lesson.sections.some((section) => section.callout)).toBe(true);
  });
});
