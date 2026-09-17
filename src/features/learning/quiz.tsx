"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, CircleHelp, Lightbulb } from "lucide-react";
import type { LessonSlug, QuizQuestion } from "@/content/model";
import { completeLesson, useProgress } from "@/features/progress/use-progress";
import { ProgressStatus } from "@/features/progress/progress-status";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion-preference";
type Result = "correct" | "incorrect" | null;
export function Quiz({
  quiz,
  slug,
  nextLesson,
}: {
  quiz: QuizQuestion;
  slug: LessonSlug;
  nextLesson?: { slug: LessonSlug; title: string };
}) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const progress = useProgress();
  const reduce = useReducedMotionPreference();
  const completed = progress.completed.includes(slug);
  return (
    <section className="quiz-section" aria-labelledby="knowledge-check">
      <p className="eyebrow">
        <Lightbulb size={16} /> MAKE A PREDICTION
      </p>
      <h2 id="knowledge-check">Put the pieces together.</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (answer)
            setResult(
              answer === quiz.correctOptionId ? "correct" : "incorrect",
            );
        }}
      >
        <fieldset>
          <legend>{quiz.prompt}</legend>
          <div className="quiz-options">
            {quiz.options.map((option, index) => (
              <label
                key={option.id}
                className={
                  "quiz-option " + (answer === option.id ? "is-selected" : "")
                }
              >
                <input
                  type="radio"
                  name={quiz.id}
                  value={option.id}
                  checked={answer === option.id}
                  onChange={() => {
                    setAnswer(option.id);
                    setResult(null);
                  }}
                />
                <span className="option-letter" aria-hidden="true">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="quiz-actions">
          <button
            type="submit"
            className="button"
            disabled={!answer || result === "correct"}
          >
            Check my answer <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="hint-button"
            aria-expanded={hintVisible}
            aria-controls="quiz-hint"
            onClick={() => setHintVisible(!hintVisible)}
          >
            <CircleHelp size={16} />{" "}
            {hintVisible ? "Hide hint" : "Give me a hint"}
          </button>
        </div>
        {hintVisible && (
          <p id="quiz-hint" className="quiz-hint">
            {quiz.hint}
          </p>
        )}
        <div aria-live="polite" aria-atomic="true">
          {result && (
            <motion.div
              initial={{ opacity: reduce ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className={"quiz-feedback " + result}
              key={result + answer}
            >
              <strong>
                {result === "correct"
                  ? "Exactly. You’ve got the idea."
                  : "Not quite. Think it through once more."}
              </strong>
              <p>
                {result === "correct"
                  ? quiz.explanation
                  : quiz.hint + " Choose another answer and try again."}
              </p>
            </motion.div>
          )}
        </div>
      </form>
      {(result === "correct" || completed) && (
        <div className="lesson-completion">
          {completed ? (
            <p className="completion-status" role="status">
              <Check size={18} /> Lesson completed
            </p>
          ) : (
            <button
              type="button"
              className="button button-secondary"
              disabled={!progress.ready}
              onClick={() => completeLesson(slug)}
            >
              <Check size={17} /> Mark lesson complete
            </button>
          )}
          {completed && (
            <Link
              className="button"
              href={nextLesson ? "/learn/" + nextLesson.slug : "/learn"}
            >
              {nextLesson
                ? "Next: " + nextLesson.title
                : "Back to your learning path"}{" "}
              <ArrowRight size={16} />
            </Link>
          )}
          {(progress.scope === "account" ||
            progress.syncStatus === "error" ||
            progress.syncStatus === "loading") && (
            <div className="storage-notice">
              <ProgressStatus />
            </div>
          )}
          {progress.persistence === "memory" && (
            <p className="storage-notice">
              Browser storage is unavailable or unreadable. Your progress is
              kept only while this page is open.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
