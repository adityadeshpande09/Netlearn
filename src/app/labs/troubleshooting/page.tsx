import type { Metadata } from "next";
import Link from "next/link";
import { GuidedLabs } from "@/features/guided-labs/guided-labs";

export const metadata: Metadata = {
  title: "Troubleshooting Labs",
  description:
    "Diagnose a missing gateway, unanswered ARP, and expired TTL. Test repairs and inspect the packet trace in guided networking exercises.",
};

export default function TroubleshootingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-width">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <span aria-hidden="true">/</span>
        <span>Troubleshooting</span>
      </nav>
      <header className="tool-heading">
        <p className="eyebrow">THREE NETWORKS TO REPAIR</p>
        <h1>Find the fault. Follow the packet.</h1>
        <p>
          Investigate a broken network, make one change, and use the trace to
          explain the result.
        </p>
      </header>
      <GuidedLabs />
      <div className="tool-next">
        <Link className="text-link" href="/labs/packet-journey">
          Revisit Packet Journey
        </Link>
        <Link className="text-link" href="/playground">
          Build your own network →
        </Link>
      </div>
    </main>
  );
}
