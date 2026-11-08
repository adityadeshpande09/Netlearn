import Link from "next/link";
import { ArrowRight, BookOpen, Route, Wrench, Binary } from "lucide-react";
import { PacketPreview } from "@/features/home/packet-preview";
import { lessons } from "@/content/lessons";
import styles from "@/features/home/home.module.css";

const activities = [
  {
    href: "/labs/troubleshooting",
    icon: Wrench,
    label: "Find and fix",
    title: "Troubleshooting Labs",
    copy: "Investigate a broken network, test a repair, and explain the result.",
    detail: "Follow the evidence in a preconfigured network",
  },
  {
    href: "/labs/packet-journey",
    icon: Route,
    label: "Watch and inspect",
    title: "Follow a packet",
    copy: "See what switches and routers do, one step at a time.",
    detail: "Start with a working network",
  },
  {
    href: "/tools/subnet",
    icon: Binary,
    label: "Work it out",
    title: "Explore subnets",
    copy: "Change a prefix and see the address range change with it.",
    detail: "An interactive IPv4 calculator",
  },
];

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className={styles.home}>
      <section className={`page-width ${styles.hero}`}>
        <div className={styles.intro}>
          <p className={styles.kicker}>
            A hands-on introduction to computer networks
          </p>
          <h1>
            Learn networking. <span>Diagnose problems.</span>
          </h1>
          <p className={styles.description}>
            Understand why things break. Follow a packet, inspect the evidence,
            and learn what makes a network work.
          </p>
          <div className={styles.actions}>
            <Link href="/labs/troubleshooting" className="button">
              Try a troubleshooting lab{" "}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/learn" className="text-link">
              Start with the basics <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.note}>
            {lessons.length} short lessons · Free to explore · No account needed
          </p>
        </div>
        <div className={styles.demo}>
          <PacketPreview />
          <p className={styles.demoNote}>
            Try sending a packet above. In the full lab, you can pause at every
            step and inspect the addresses.
          </p>
        </div>
      </section>
      <section
        className={`page-width ${styles.start}`}
        aria-labelledby="start-heading"
      >
        <div className={styles.startTitle}>
          <BookOpen size={23} aria-hidden="true" />
          <div>
            <p className={styles.kicker}>New to networking?</p>
            <h2 id="start-heading">Start with one small question.</h2>
          </div>
        </div>
        <div className={styles.startBody}>
          <p>
            {lessons[0]!.question} The first lesson explains what a local
            network can do on its own.
          </p>
          <Link href="/learn/network-basics" className="text-link">
            Read Network Basics{" "}
            <span className={styles.duration}>{lessons[0]!.minutes} min</span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <section
        id="practice"
        className={`page-width ${styles.practice}`}
        aria-labelledby="practice-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>Learn by trying</p>
            <h2 id="practice-heading">What would you like to figure out?</h2>
          </div>
          <p>
            Start with a prepared network. Follow its behavior, investigate a
            failure, and test your understanding. Reset and try again at any
            time.
          </p>
        </div>
        <div className={styles.activities}>
          {activities.map(
            ({ href, icon: Icon, label, title, copy, detail }) => (
              <Link href={href} key={href} className={styles.activity}>
                <Icon size={25} strokeWidth={1.7} aria-hidden="true" />
                <div>
                  <p className={styles.kicker}>{label}</p>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                  <span className={styles.detail}>{detail}</span>
                </div>
                <ArrowRight
                  size={20}
                  className={styles.arrow}
                  aria-hidden="true"
                />
              </Link>
            ),
          )}
        </div>
      </section>
      <section
        className={`page-width ${styles.path}`}
        aria-labelledby="path-heading"
      >
        <div className={styles.pathIntro}>
          <p className={styles.kicker}>A little structure, if you want it</p>
          <h2 id="path-heading">Build your understanding in order.</h2>
          <p>
            Each lesson has a diagram and a question to check your
            understanding. Get an explanation, try again, and move on when
            you’re ready.
          </p>
          <Link href="/learn" className="text-link">
            View all {lessons.length} lessons{" "}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <ol className={styles.lessonList}>
          {lessons.map((lesson) => (
            <li key={lesson.slug}>
              <Link href={`/learn/${lesson.slug}`}>
                <span className={styles.lessonNumber}>
                  {String(lesson.order).padStart(2, "0")}
                </span>
                <span>{lesson.title}</span>
                <small>{lesson.minutes} min</small>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
