import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock3, Info } from "lucide-react";
import { getLesson, lessons } from "@/content/lessons";
import { Quiz } from "@/features/learning/quiz";
import { LessonSidebar } from "@/features/learning/lesson-sidebar";
import { LessonDiagram } from "@/features/learning/lesson-diagram";
export function generateStaticParams() {
  return lessons.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  return lesson
    ? { title: lesson.title, description: lesson.summary }
    : { title: "Lesson not found" };
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  const summaries = lessons.map(({ slug, order, title, summary, minutes }) => ({
    slug,
    order,
    title,
    summary,
    minutes,
  }));
  const next = lessons[lesson.order];
  return (
    <main id="main-content" tabIndex={-1} className="lesson-layout page-width">
      <LessonSidebar lessons={summaries} active={lesson.slug} />
      <article className="lesson-article">
        <header className="lesson-heading">
          <p className="eyebrow">
            LESSON {String(lesson.order).padStart(2, "0")} / 05{" "}
            <span className="lesson-time">
              <Clock3 size={14} /> {lesson.minutes} min
            </span>
          </p>
          <h1>{lesson.title}</h1>
          <p>{lesson.question}</p>
        </header>
        <section
          className="lesson-objectives"
          aria-labelledby="objectives-heading"
        >
          <h2 id="objectives-heading">By the end, you&apos;ll be able to…</h2>
          <ul>
            {lesson.objectives.map((objective) => (
              <li key={objective}>
                <Check size={16} />
                {objective}
              </li>
            ))}
          </ul>
        </section>
        <LessonDiagram type={lesson.diagram} />
        <div className="lesson-body">
          {lesson.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.callout && (
                <aside className="lesson-callout">
                  <Info size={19} />
                  <div>
                    <strong>{section.callout.label}</strong>
                    <p>{section.callout.body}</p>
                  </div>
                </aside>
              )}
            </section>
          ))}
        </div>
        <section className="lesson-glossary" aria-labelledby="glossary-heading">
          <p className="eyebrow">THREE THINGS TO TAKE WITH YOU</p>
          <h2 id="glossary-heading">The words behind the idea.</h2>
          <dl>
            {lesson.concepts.map((concept) => (
              <div key={concept.term}>
                <dt>{concept.term}</dt>
                <dd>{concept.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
        <aside className="lesson-callout">
          <Info size={19} />
          <div>
            <strong>Put the idea to work</strong>
            <p>
              {lesson.slug === "mac-vs-ip" ? (
                <Link href="/tools/subnet">
                  Explore address boundaries in the Subnet Visualizer →
                </Link>
              ) : lesson.slug === "network-basics" ||
                lesson.slug === "switches" ? (
                <Link href="/playground">
                  Connect your own devices in the Playground →
                </Link>
              ) : (
                <Link href="/labs/packet-journey">
                  Follow every decision in Packet Journey →
                </Link>
              )}
            </p>
          </div>
        </aside>
        <Quiz
          key={lesson.slug}
          quiz={lesson.quiz}
          slug={lesson.slug}
          {...(next
            ? { nextLesson: { slug: next.slug, title: next.title } }
            : {})}
        />
      </article>
    </main>
  );
}
