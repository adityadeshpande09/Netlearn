import { parseIpv4 } from "./ipv4";
import type {
  ArpHeader,
  EthernetHeader,
  EthernetIIHeader,
  IcmpEchoHeader,
  IPv4Header,
  IPv4Packet,
  PacketHeaderSnapshot,
} from "./types";

function unsigned(value: number, bits: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** bits)
    throw new RangeError(field + " must fit in " + bits + " unsigned bits.");
  return value;
}

function word(value: number): number[] {
  unsigned(value, 16, "Word");
  return [Math.floor(value / 256), value % 256];
}

function ipv4Bytes(address: string): number[] {
  const numeric = parseIpv4(address);
  if (numeric === null) throw new TypeError("Invalid IPv4 header address.");
  return [24, 16, 8, 0].map((shift) => Math.floor(numeric / 2 ** shift) % 256);
}

function macBytes(address: string): number[] {
  if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(address))
    throw new TypeError("Invalid Ethernet header address.");
  return address.split(":").map((octet) => parseInt(octet, 16));
}

/** RFC 1071: network-order words, end-around carry, then one's complement.
 * An odd final byte is padded on the right for the calculation only.
 */
export function internetChecksum(bytes: readonly number[]): number {
  let sum = 0;
  for (let index = 0; index < bytes.length; index += 2) {
    const high = unsigned(bytes[index]!, 8, "Byte");
    const low = unsigned(bytes[index + 1] ?? 0, 8, "Byte");
    sum += high * 256 + low;
    sum = (sum & 0xffff) + Math.floor(sum / 65536);
  }
  while (sum > 0xffff) sum = (sum & 0xffff) + Math.floor(sum / 65536);
  return 0xffff - sum;
}

/** Ethernet II header only: excludes padding, preamble, SFD, and the FCS trailer. */
export function serializeEthernetHeader(header: EthernetIIHeader): number[] {
  return [
    ...macBytes(header.destinationMac),
    ...macBytes(header.sourceMac),
    ...word(header.etherType),
  ];
}

/** Ethernet/IPv4 ARP payload; ARP has no checksum field of its own. */
export function serializeArpHeader(header: ArpHeader): number[] {
  return [
    ...word(header.hardwareType),
    ...word(header.protocolType),
    header.hardwareLength,
    header.protocolLength,
    ...word(header.operation),
    ...macBytes(header.senderMac),
    ...ipv4Bytes(header.senderIp),
    ...macBytes(header.targetMac),
    ...ipv4Bytes(header.targetIp),
  ];
}

/** Serializes the 20-byte, option-free header, including its stored checksum. */
export function serializeIpv4Header(header: IPv4Header): number[] {
  const flagsAndOffset =
    (header.dontFragment ? 0x4000 : 0) +
    (header.moreFragments ? 0x2000 : 0) +
    unsigned(header.fragmentOffset, 13, "Fragment offset");
  return [
    header.version * 16 + header.ihl,
    header.dscp * 4 + header.ecn,
    ...word(header.totalLength),
    ...word(header.identification),
    ...word(flagsAndOffset),
    unsigned(header.ttl, 8, "TTL"),
    header.protocol,
    ...word(header.checksum),
    ...ipv4Bytes(header.sourceIp),
    ...ipv4Bytes(header.destinationIp),
  ];
}

/** ICMPv4 covers its header and data, without an IP pseudo-header. */
export function serializeIcmpMessage(header: IcmpEchoHeader): number[] {
  return [
    header.type,
    header.code,
    ...word(header.checksum),
    ...word(header.identifier),
    ...word(header.sequence),
    ...header.payloadBytes,
  ];
}

export function createArpHeader(
  fields: Pick<
    ArpHeader,
    "operation" | "senderMac" | "senderIp" | "targetMac" | "targetIp"
  >,
): ArpHeader {
  return {
    hardwareType: 1,
    protocolType: 0x0800,
    hardwareLength: 6,
    protocolLength: 4,
    byteLength: 28,
    ...fields,
  };
}

export function createPacketHeaders({
  packet,
  frame,
  arp,
  frameContext,
}: {
  packet: IPv4Packet;
  frame: EthernetHeader | null;
  arp: ArpHeader | null;
  frameContext: PacketHeaderSnapshot["frameContext"];
}): PacketHeaderSnapshot {
  if (frame?.payload === "arp" && !arp)
    throw new TypeError("An ARP frame requires its ARP header.");
  if ((frame === null) !== (frameContext === "none"))
    throw new TypeError("Frame context must agree with frame presence.");

  // Fixed model choices make every replay byte-for-byte reproducible.
  const icmp: IcmpEchoHeader = {
    type: 8,
    code: 0,
    checksum: 0,
    identifier: 1,
    sequence: 1,
    payload: "NetLearn",
    payloadBytes: [0x4e, 0x65, 0x74, 0x4c, 0x65, 0x61, 0x72, 0x6e],
    headerLength: 8,
    byteLength: 16,
  };
  icmp.checksum = internetChecksum(serializeIcmpMessage(icmp));
  const ipv4: IPv4Header = {
    version: 4,
    ihl: 5,
    dscp: 0,
    ecn: 0,
    totalLength: 36,
    identification: 1,
    dontFragment: true,
    moreFragments: false,
    fragmentOffset: 0,
    ttl: packet.ttl,
    protocol: 1,
    checksum: 0,
    sourceIp: packet.sourceIp,
    destinationIp: packet.destinationIp,
    headerLength: 20,
  };
  ipv4.checksum = internetChecksum(serializeIpv4Header(ipv4));
  return {
    frameContext,
    ethernet: frame
      ? {
          sourceMac: frame.sourceMac,
          destinationMac: frame.destinationMac,
          etherType: frame.payload === "arp" ? 0x0806 : 0x0800,
          headerLength: 14,
        }
      : null,
    arp: frame?.payload === "arp" && arp ? { ...arp } : null,
    ipv4,
    icmp,
  };
}
