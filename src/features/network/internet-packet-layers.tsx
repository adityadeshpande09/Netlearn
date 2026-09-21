import type { SimulationEvent } from "@/domain/networking/types";
import {
  serializeIpv4Header,
  serializeIcmpMessage,
} from "@/domain/networking/packet-headers";
import { PacketLayer, hex } from "./packet-fields";

export function InternetPacketLayers({
  event,
  waiting = false,
}: {
  event: SimulationEvent;
  waiting?: boolean;
}) {
  const { ipv4, icmp } = event.headers;
  const ttlChanged = event.changed.includes("ttl");
  return (
    <>
      <PacketLayer
        title="IPv4"
        subtitle={
          event.type === "dropped"
            ? "Delivery stopped · 20-byte header"
            : waiting
              ? "Waiting for ARP · 20-byte header"
              : "Internet layer · 20-byte header"
        }
        className="ip-layer"
        explanation="IP addresses identify the end-to-end journey. Routers use the destination IP to choose a route; they reduce TTL and recalculate the header checksum."
        fields={[
          { label: "Source IP", value: ipv4.sourceIp, bits: 32 },
          { label: "Destination IP", value: ipv4.destinationIp, bits: 32 },
          { label: "TTL", value: ipv4.ttl, bits: 8, changed: ttlChanged },
        ]}
        more={[
          {
            label: "Version",
            value: ipv4.version,
            bits: 4,
            help: "The Internet Protocol version: IPv4.",
          },
          {
            label: "Header length (IHL)",
            value: ipv4.ihl + " words · " + ipv4.headerLength + " bytes",
            bits: 4,
            help: "One word is 4 bytes. This packet has no IPv4 options.",
          },
          {
            label: "DSCP",
            value: ipv4.dscp,
            bits: 6,
            help: "Traffic treatment marking. Zero uses the default forwarding class.",
          },
          {
            label: "ECN",
            value: ipv4.ecn,
            bits: 2,
            help: "Explicit Congestion Notification. Zero means not ECN-capable.",
          },
          {
            label: "Total length",
            value: ipv4.totalLength + " bytes",
            bits: 16,
            help: "20-byte IPv4 header + 8-byte ICMP header + 8 payload bytes. Ethernet is not included.",
          },
          {
            label: "Identification",
            value: hex(ipv4.identification),
            bits: 16,
            help: "Used for fragment reassembly when fragmentation occurs. Fixed at 1 for this one-packet example.",
          },
          {
            label: "Flags",
            value:
              "Reserved 0 · DF " +
              Number(ipv4.dontFragment) +
              " · MF " +
              Number(ipv4.moreFragments),
            bits: 3,
            help: "Don't Fragment is set; More Fragments is clear. Fragmentation and path MTU discovery are outside this model.",
          },
          {
            label: "Fragment offset",
            value: ipv4.fragmentOffset,
            bits: 13,
            help: "Measured in 8-byte units. Zero here: this packet is not a fragment.",
          },
          {
            label: "Protocol",
            value: ipv4.protocol + " · ICMP",
            bits: 8,
            help: "Identifies the IPv4 payload. ICMP is carried directly in IP; this packet has no TCP or UDP ports.",
          },
          {
            label: "Header checksum",
            value: hex(ipv4.checksum),
            bits: 16,
            changed: event.changed.includes("ipv4Checksum"),
            help: "Calculated from this 20-byte header only. Changes when TTL changes; it does not cover the ICMP message.",
          },
        ]}
        bytes={serializeIpv4Header(ipv4)}
        byteLabel="20 IPv4 header bytes · network order · computed checksum included"
      />
      <PacketLayer
        title="ICMP"
        subtitle="Echo request · 8-byte header"
        className="icmp-layer"
        explanation="Internet Control Message Protocol carries network control and diagnostic messages. This echo request is the outgoing half of a ping; the reply is not simulated."
        fields={[
          { label: "Type", value: icmp.type + " · Echo request", bits: 8 },
          { label: "Code", value: icmp.code, bits: 8 },
        ]}
        more={[
          {
            label: "Checksum",
            value: hex(icmp.checksum),
            bits: 16,
            help: "Calculated over the ICMP header and payload. It stays unchanged when a router changes IPv4 TTL.",
          },
          {
            label: "Identifier",
            value: icmp.identifier,
            bits: 16,
            help: "Helps match an echo reply to its request. Fixed at 1 in this example.",
          },
          {
            label: "Sequence number",
            value: icmp.sequence,
            bits: 16,
            help: "Distinguishes requests in a series. This single request uses sequence 1.",
          },
          {
            label: "Payload",
            value: icmp.payload,
            bits: icmp.payloadBytes.length * 8,
            help: "8 ASCII bytes chosen for this example, after the ICMP header. The payload size is not fixed by ICMP.",
          },
        ]}
        bytes={serializeIcmpMessage(icmp)}
        byteLabel="16 ICMP message bytes · header and payload · computed checksum included"
      />
    </>
  );
}
