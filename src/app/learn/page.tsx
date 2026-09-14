import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { lessons } from "@/content/lessons";
import { LearningDashboard } from "@/features/learning/learning-dashboard";
export const metadata: Metadata = {
  title: "Learning path",
  description:
    "Five introductory networking lessons, from local connections to routed packets. Read, predict, and track your progress.",
};
export default function LearnPage() {
  const summaries = lessons.map(({ slug, order, title, summary, minutes }) => ({
    slug,
    order,
    title,
    summary,
    minutes,
  }));
  return (
    <main id="main-content" tabIndex={-1} className="learning-page page-width">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <ChevronRight size={13} />
        <span aria-current="page">Learning path</span>
      </nav>
      <LearningDashboard lessons={summaries} />
    </main>
  );
}
