import type { Metadata } from "next";
import Link from "next/link";
import { NetworkPlayground } from "@/features/playground/network-playground";
export const metadata: Metadata = {
  title: "Network Playground",
  description:
    "Connect computers, switches, and routers. Configure addresses and see how packets travel through your network.",
};
export default function PlaygroundPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-width">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <span aria-hidden="true">/</span>
        <span>Network Playground</span>
      </nav>
      <header className="tool-heading">
        <p className="eyebrow">BUILD. EXPERIMENT. UNDERSTAND.</p>
        <h1>Your network, your decisions.</h1>
        <p>
          Connect devices, configure their addresses, and follow the result.
        </p>
      </header>
      <NetworkPlayground />
      <div className="tool-next">
        <Link className="text-link" href="/labs/packet-journey">
          Return to the guided Packet Journey
        </Link>
        <Link className="text-link" href="/tools/subnet">
          Explore the Subnet Visualizer →
        </Link>
      </div>
    </main>
  );
}
