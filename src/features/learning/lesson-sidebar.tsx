"use client";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import type { LessonSlug } from "@/content/model";
import type { LessonSummary } from "./learning-dashboard";
import { useProgress } from "@/features/progress/use-progress";
export function LessonSidebar({
  lessons,
  active,
}: {
  lessons: LessonSummary[];
  active: LessonSlug;
}) {
  const { completed } = useProgress();
  return (
    <aside className="lesson-sidebar">
      <Link href="/learn" className="back-link">
        <ArrowLeft size={15} /> Learning path
      </Link>
      <nav aria-label="Lessons in this learning path">
        <p className="eyebrow">NETWORKING FOUNDATIONS</p>
        <ol>
          {lessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link
                href={"/learn/" + lesson.slug}
                aria-current={lesson.slug === active ? "page" : undefined}
              >
                <span className="sidebar-index">
                  {completed.includes(lesson.slug) ? (
                    <Check size={15} aria-hidden="true" />
                  ) : (
                    String(lesson.order).padStart(2, "0")
                  )}
                </span>
                <span>
                  {lesson.title}
                  {completed.includes(lesson.slug) && (
                    <span className="sr-only"> — Completed</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
      <div className="sidebar-note">
        <span className="sidebar-line" />
        <p>
          One concept at a time.
          <br />
          You&apos;re building the bigger picture.
        </p>
      </div>
    </aside>
  );
}
