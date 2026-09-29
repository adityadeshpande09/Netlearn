import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Route,
  Wrench,
  Binary,
  Network,
} from "lucide-react";
import { PacketPreview } from "@/features/home/packet-preview";
import { lessons } from "@/content/lessons";
import styles from "@/features/home/home.module.css";

const activities = [
  {
    href: "/labs/packet-journey",
    icon: Route,
    label: "Watch and inspect",
    title: "Follow a packet",
    copy: "See what switches and routers do, one step at a time.",
    detail: "Start with a working network",
  },
  {
    href: "/labs/troubleshooting",
    icon: Wrench,
    label: "Find and fix",
    title: "Try the guided labs",
    copy: "A packet has stopped. Read the evidence and test a repair.",
    detail: "Three guided exercises",
  },
  {
    href: "/tools/subnet",
    icon: Binary,
    label: "Work it out",
    title: "Explore subnets",
    copy: "Change a prefix and see the address range change with it.",
    detail: "An interactive IPv4 calculator",
  },
  {
    href: "/playground",
    icon: Network,
    label: "Build and experiment",
    title: "Open the playground",
    copy: "Connect your own devices, change their settings, and send a packet.",
    detail: "Save networks in this browser",
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
            See networking <span>happen.</span>
          </h1>
          <p className={styles.description}>
            What actually happens after you press Send? Follow a packet, look
            inside it, and learn how devices find each other.
          </p>
          <div className={styles.actions}>
            <Link href="/learn" className="button">
              Start learning <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#practice" className="text-link">
              Explore the tools <ArrowRight size={17} aria-hidden="true" />
            </a>
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
            Use a ready-made example, or build something of your own. You can
            reset an experiment and try again.
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
