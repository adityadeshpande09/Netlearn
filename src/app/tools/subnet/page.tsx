import type { Metadata } from "next";
import Link from "next/link";
import { SubnetVisualizer } from "@/features/subnet/subnet-visualizer";
export const metadata: Metadata = {
  title: "Subnet Visualizer",
  description:
    "Explore IPv4 subnet masks, host ranges, binary boundaries, and subnet splitting.",
};
export default function SubnetPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-width">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <span aria-hidden="true">/</span>
        <span>Subnet Visualizer</span>
      </nav>
      <header className="tool-heading">
        <p className="eyebrow">THE ADDRESS SPACE, EXPLAINED</p>
        <h1>Subnet Visualizer</h1>
        <p>Change a prefix. See a network divide.</p>
      </header>
      <SubnetVisualizer />
    </main>
  );
}
