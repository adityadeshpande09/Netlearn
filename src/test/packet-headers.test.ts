import { describe, expect, it } from "vitest";
import {
  createPacketHeaders,
  internetChecksum,
  serializeArpHeader,
  serializeEthernetHeader,
  serializeIcmpMessage,
  serializeIpv4Header,
} from "@/domain/networking/packet-headers";
import {
  packetJourneyScenario,
  localTopology,
} from "@/domain/networking/scenarios";
import { simulatePacket } from "@/domain/networking/simulator";
import type { SimulationEvent } from "@/domain/networking/types";

function findEvent(predicate: (event: SimulationEvent) => boolean) {
  const event = simulatePacket(packetJourneyScenario()).events.find(predicate);
  if (!event) throw new Error("Missing expected scenario event.");
  return event;
}

describe("Internet checksum", () => {
  it("matches the independent RFC 1071 example", () => {
    // RFC 1071 section 3 gives a folded sum of 0xddf2 for these octets.
    expect(
      internetChecksum([0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7]),
    ).toBe(0x220d);
  });

  it("pads an odd final octet on the right without changing the data", () => {
    const bytes = [1, 2, 3];
    expect(internetChecksum(bytes)).toBe(0xfbfd);
    expect(bytes).toEqual([1, 2, 3]);
  });

  it("folds repeated carry and permits a valid zero checksum", () => {
    expect(internetChecksum([255, 255, 255, 255, 0, 1])).toBe(0xfffe);
    expect(internetChecksum([255, 255])).toBe(0);
  });

  it.each([-1, 256, 0.5, NaN])("rejects a non-octet value %s", (value) => {
    expect(() => internetChecksum([value])).toThrow(RangeError);
  });
});

describe("packet header snapshots", () => {
  it("serializes a real ICMP echo request and its complete IPv4 header", () => {
    const event = findEvent(
      (value) => value.type === "frame" && value.phase === "created",
    );
    const { ipv4, icmp, ethernet, arp } = event.headers;
    expect(ipv4).toMatchObject({
      version: 4,
      ihl: 5,
      dscp: 0,
      ecn: 0,
      totalLength: 36,
      identification: 1,
      dontFragment: true,
      moreFragments: false,
      fragmentOffset: 0,
      ttl: 64,
      protocol: 1,
      checksum: 0x6f12,
      headerLength: 20,
    });
    expect(icmp).toMatchObject({
      type: 8,
      code: 0,
      checksum: 0x5d7c,
      identifier: 1,
      sequence: 1,
      payload: "NetLearn",
      byteLength: 16,
    });
    expect(icmp.payloadBytes).toEqual([
      0x4e, 0x65, 0x74, 0x4c, 0x65, 0x61, 0x72, 0x6e,
    ]);
    expect(serializeIpv4Header(ipv4)).toEqual([
      0x45, 0, 0, 36, 0, 1, 0x40, 0, 64, 1, 0x6f, 0x12, 192, 168, 1, 10, 10, 0,
      0, 20,
    ]);
    expect(serializeIcmpMessage(icmp)).toEqual([
      8, 0, 0x5d, 0x7c, 0, 1, 0, 1, 0x4e, 0x65, 0x74, 0x4c, 0x65, 0x61, 0x72,
      0x6e,
    ]);
    expect(internetChecksum(serializeIpv4Header(ipv4))).toBe(0);
    expect(internetChecksum(serializeIcmpMessage(icmp))).toBe(0);
    expect(ethernet?.etherType).toBe(0x0800);
    expect(arp).toBeNull();
  });

  it("encodes Ethernet destination first and excludes padding and the FCS trailer", () => {
    const event = findEvent(
      (value) => value.type === "frame" && value.phase === "created",
    );
    const header = event.headers.ethernet;
    if (!header) throw new Error("Missing Ethernet header.");
    expect(serializeEthernetHeader(header)).toEqual([
      2, 0, 0, 0, 3, 1, 2, 0, 0, 0, 1, 1, 8, 0,
    ]);
    expect(serializeEthernetHeader(header)).toHaveLength(14);
  });

  it("shows local ARP next-hop fields separately from the waiting IPv4 datagram", () => {
    const request = findEvent(
      (value) => value.type === "arp" && value.phase === "request",
    );
    expect(request.headers.frameContext).toBe("current");
    expect(request.headers.ethernet).toMatchObject({
      etherType: 0x0806,
      destinationMac: "ff:ff:ff:ff:ff:ff",
    });
    const arp = request.headers.arp;
    if (!arp) throw new Error("Missing ARP request.");
    expect(arp).toMatchObject({
      operation: 1,
      senderMac: "02:00:00:00:01:01",
      senderIp: "192.168.1.10",
      targetMac: "00:00:00:00:00:00",
      targetIp: "192.168.1.1",
    });
    expect(serializeArpHeader(arp)).toEqual([
      0, 1, 8, 0, 6, 4, 0, 1, 2, 0, 0, 0, 1, 1, 192, 168, 1, 10, 0, 0, 0, 0, 0,
      0, 192, 168, 1, 1,
    ]);
    expect(request.headers.ipv4.destinationIp).toBe("10.0.0.20");
    expect(arp).not.toHaveProperty("checksum");
    expect(request.headers.icmp).not.toHaveProperty("sourcePort");
    expect(request.headers.icmp).not.toHaveProperty("destinationPort");
  });

  it("swaps ARP sender/target roles in the unicast reply", () => {
    const reply = findEvent(
      (value) => value.type === "arp" && value.phase === "reply",
    );
    expect(reply.headers.arp).toMatchObject({
      operation: 2,
      senderMac: "02:00:00:00:03:01",
      senderIp: "192.168.1.1",
      targetMac: "02:00:00:00:01:01",
      targetIp: "192.168.1.10",
    });
    expect(reply.headers.ethernet?.destinationMac).toBe("02:00:00:00:01:01");
  });

  it("uses the router's outgoing interface in the second ARP exchange", () => {
    const request = findEvent(
      (value) =>
        value.type === "arp" &&
        value.phase === "request" &&
        value.deviceId === "router-r1" &&
        value.linkId === undefined,
    );
    expect(request.headers.arp).toMatchObject({
      senderIp: "10.0.0.1",
      senderMac: "02:00:00:00:03:02",
      targetIp: "10.0.0.20",
    });
    expect(request.headers.ipv4.sourceIp).toBe("192.168.1.10");
  });

  it("recomputes only the IPv4 checksum after TTL changes", () => {
    const events = simulatePacket(packetJourneyScenario()).events;
    const first = events[0]!;
    const routed = events.find(
      (event) => event.type === "frame" && event.phase === "reencapsulated",
    )!;
    expect(first.headers.ipv4.checksum).toBe(0x6f12);
    expect(routed.headers.ipv4.checksum).toBe(0x7012);
    expect(
      events.find(
        (event) => event.type === "decision" && event.decision === "ttl",
      )?.changed,
    ).toEqual(["ttl", "ipv4Checksum"]);
    expect(
      events.every((event) => event.headers.icmp.checksum === 0x5d7c),
    ).toBe(true);
    expect(
      events.every(
        (event) =>
          internetChecksum(serializeIpv4Header(event.headers.ipv4)) === 0,
      ),
    ).toBe(true);
    expect(routed.headers.ethernet?.sourceMac).toBe("02:00:00:00:03:02");
    expect(routed.headers.arp).toBeNull();
  });

  it("keeps same-LAN TTL unchanged and computes a valid checksum for its actual destination", () => {
    const result = simulatePacket({
      ...localTopology(),
      sourceId: "pc-a",
      destinationId: "pc-b",
      ttl: 1,
    });
    expect(result.outcome).toBe("delivered");
    for (const event of result.events) {
      expect(event.headers.ipv4.ttl).toBe(1);
      expect(event.headers.ipv4.destinationIp).toBe("192.168.1.20");
      expect(internetChecksum(serializeIpv4Header(event.headers.ipv4))).toBe(0);
    }
  });

  it("labels cached ARP and failed ARP as last frames, with no fabricated transmission", () => {
    const cached = findEvent(
      (event) => event.type === "arp" && event.phase === "cached",
    );
    expect(cached.headers.frameContext).toBe("last");
    expect(cached.headers.arp?.operation).toBe(2);
    const scenario = packetJourneyScenario();
    scenario.links = scenario.links.filter((link) => link.id !== "link-ar");
    const dropped = simulatePacket(scenario).events.at(-1)!;
    expect(dropped).toMatchObject({ type: "dropped", reason: "arp" });
    expect(dropped.headers.frameContext).toBe("last");
    expect(dropped.headers.arp?.operation).toBe(1);
  });

  it("has no frame before encapsulation or after router removal and TTL expiry", () => {
    const scenario = packetJourneyScenario();
    scenario.ttl = 1;
    const result = simulatePacket(scenario);
    const dropped = result.events.at(-1)!;
    expect(result.events[0]!.headers).toMatchObject({
      frameContext: "none",
      ethernet: null,
      arp: null,
    });
    expect(dropped).toMatchObject({ type: "dropped", reason: "ttl" });
    expect(dropped.headers).toMatchObject({
      frameContext: "none",
      ethernet: null,
      arp: null,
      ipv4: { ttl: 0 },
    });
    expect(internetChecksum(serializeIpv4Header(dropped.headers.ipv4))).toBe(0);
  });

  it("does not share mutable header objects or payload arrays between events", () => {
    const scenario = packetJourneyScenario();
    const before = structuredClone(scenario);
    const result = simulatePacket(scenario);
    const first = result.events[0]!;
    const second = result.events[1]!;
    expect(first.headers.ipv4).not.toBe(second.headers.ipv4);
    expect(first.headers.icmp.payloadBytes).not.toBe(
      second.headers.icmp.payloadBytes,
    );
    first.headers.ipv4.ttl = 7;
    first.headers.icmp.checksum = 0;
    expect(second.headers.ipv4.ttl).toBe(64);
    expect(second.headers.icmp.checksum).toBe(0x5d7c);
    expect(scenario).toEqual(before);
    expect(simulatePacket(scenario).events[0]!.headers.ipv4.ttl).toBe(64);
  });

  it("rejects a claimed ARP frame without ARP fields", () => {
    expect(() =>
      createPacketHeaders({
        packet: {
          sourceIp: "192.168.1.10",
          destinationIp: "10.0.0.20",
          ttl: 64,
          protocol: "icmp",
        },
        frame: {
          sourceMac: "02:00:00:00:01:01",
          destinationMac: "ff:ff:ff:ff:ff:ff",
          payload: "arp",
        },
        arp: null,
        frameContext: "current",
      }),
    ).toThrow(TypeError);
  });
});
