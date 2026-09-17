"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import type { Lesson } from "@/content/model";
import { useProgress } from "@/features/progress/use-progress";
import { ProgressStatus } from "@/features/progress/progress-status";
export type LessonSummary = Pick<
  Lesson,
  "slug" | "order" | "title" | "summary" | "minutes"
>;
export function LearningDashboard({ lessons }: { lessons: LessonSummary[] }) {
  const progress = useProgress();
  const count = lessons.filter((lesson) =>
    progress.completed.includes(lesson.slug),
  ).length;
  const next =
    lessons.find((lesson) => !progress.completed.includes(lesson.slug)) ??
    lessons[0];
  const allDone = count === lessons.length;
  const minutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);
  return (
    <>
      <div className="learning-intro">
        <div>
          <p className="eyebrow">THE FOUNDATIONS</p>
          <h1>Your networking journey.</h1>
          <p>
            Five small lessons. One clearer picture of how devices communicate.
          </p>
        </div>
        <span className="course-pill">
          <BookOpen size={15} /> Beginner path
        </span>
      </div>
      <div className="course-overview">
        <section className="course-continue" aria-labelledby="continue-heading">
          <div className="continue-copy">
            <p className="eyebrow">
              {allDone
                ? "THE CONNECTIONS ARE COMING TOGETHER"
                : count
                  ? "PICK UP WHERE YOU LEFT OFF"
                  : "EVERY JOURNEY STARTS WITH A CONNECTION"}
            </p>
            <h2 id="continue-heading">
              {allDone ? "Five lessons. A stronger foundation." : next?.title}
            </h2>
            <p>
              {allDone
                ? "You’ve completed the beginner path. Revisit any lesson whenever you want a refresher."
                : next?.summary}
            </p>
            {next && (
              <Link
                href={"/learn/" + next.slug}
                className="button button-inverse"
              >
                {allDone
                  ? "Revisit the first lesson"
                  : count
                    ? "Continue learning"
                    : "Begin the first lesson"}{" "}
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
          <div className="course-symbol" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <BookOpen size={40} strokeWidth={1.25} />
          </div>
        </section>
        <section className="course-progress" aria-labelledby="progress-heading">
          <div className="progress-top">
            <h2 id="progress-heading">Your progress</h2>
            <span className="mono">
              {progress.ready ? count : "—"}/{lessons.length}
            </span>
          </div>
          <progress
            value={count}
            max={lessons.length}
            aria-label="Lessons completed"
          />
          <p>
            {progress.ready
              ? count + " of " + lessons.length + " lessons completed"
              : "Loading your progress…"}
          </p>
          <div className="progress-save">
            <ShieldCheck size={17} />
            <ProgressStatus />
          </div>
        </section>
      </div>
      <div className="curriculum-heading">
        <h2>Your learning path</h2>
        <p>
          <Clock3 size={15} /> About {minutes} minutes, at your pace
        </p>
      </div>
      <ol className="curriculum-list">
        {lessons.map((lesson) => {
          const complete = progress.completed.includes(lesson.slug);
          return (
            <li key={lesson.slug}>
              <Link href={"/learn/" + lesson.slug} className="curriculum-row">
                <span
                  className={
                    "curriculum-index " + (complete ? "is-complete" : "")
                  }
                >
                  {complete ? (
                    <Check size={20} />
                  ) : (
                    String(lesson.order).padStart(2, "0")
                  )}
                </span>
                <div className="curriculum-copy">
                  <h3>{lesson.title}</h3>
                  <p>{lesson.summary}</p>
                </div>
                <div className="curriculum-meta">
                  <span>
                    <Clock3 size={14} /> {lesson.minutes} min
                  </span>
                  <span className={complete ? "completed-label" : ""}>
                    {complete ? "Completed" : "Ready to explore"}
                  </span>
                </div>
                <ArrowUpRight size={19} className="curriculum-arrow" />
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="learning-footnote">
        Take them in order, or follow your curiosity. Every lesson is open to
        you.
      </p>
    </>
  );
}
