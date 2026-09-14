import type { Metadata } from "next";
import Link from "next/link";
import { PacketJourney } from "@/features/packet-journey/packet-journey";
export const metadata: Metadata = {
  title: "Packet Journey",
  description:
    "Follow an IPv4 packet through ARP, switching, routing, TTL, and Ethernet re-encapsulation.",
};
export default function PacketJourneyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="page-width">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Overview</Link>
        <span aria-hidden="true">/</span>
        <span>Packet Journey</span>
      </nav>
      <header className="tool-heading">
        <p className="eyebrow">MAKE THE INVISIBLE VISIBLE</p>
        <h1>Follow one packet.</h1>
        <p>
          Step through every decision between two computers on different
          networks.
        </p>
      </header>
      <PacketJourney />
      <div className="tool-next">
        <Link className="text-link" href="/learn/packet-travel">
          Read the packet travel lesson
        </Link>
        <Link className="text-link" href="/playground">
          Build your own network →
        </Link>
      </div>
    </main>
  );
}
