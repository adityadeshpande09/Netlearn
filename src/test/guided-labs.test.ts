import { describe, expect, it } from "vitest";
import { guidedLabs } from "@/content/guided-labs";
import {
  applyGuidedRepair,
  createGuidedScenario,
  type GuidedLabId,
} from "@/domain/networking/guided-scenarios";
import { simulatePacket } from "@/domain/networking/simulator";

describe("guided troubleshooting scenarios", () => {
  it.each([
    ["gateway", "gateway", "pc-a"],
    ["link", "arp", "pc-a"],
    ["ttl", "ttl", "router-r1"],
  ] as const)(
    "%s starts with the intended observable fault",
    (id, reason, deviceId) => {
      const scenario = createGuidedScenario(id);
      const result = simulatePacket(scenario);
      expect(result.errors).toEqual([]);
      expect(result.outcome).toBe("dropped");
      expect(result.events.at(-1)).toMatchObject({
        type: "dropped",
        reason,
        deviceId,
      });
      expect(result.events.some((event) => event.type === "delivered")).toBe(
        false,
      );
    },
  );

  it("gives each fault distinct evidence in the trace", () => {
    const gateway = simulatePacket(createGuidedScenario("gateway"));
    expect(gateway.events.some((event) => event.type === "arp")).toBe(false);

    const disconnected = simulatePacket(createGuidedScenario("link"));
    expect(
      disconnected.events.some(
        (event) =>
          event.type === "arp" &&
          event.phase === "request" &&
          event.headers.arp?.targetIp === "192.168.1.1",
      ),
    ).toBe(true);
    expect(
      disconnected.events.some(
        (event) => event.type === "arp" && event.phase === "reply",
      ),
    ).toBe(false);

    const ttl = simulatePacket(createGuidedScenario("ttl"));
    expect(
      ttl.events.some(
        (event) => event.type === "arp" && event.phase === "reply",
      ),
    ).toBe(true);
    expect(ttl.events.at(-1)?.headers.ipv4.ttl).toBe(0);
    expect(ttl.events.at(-1)?.headers.ipv4.checksum).not.toBe(
      ttl.events[0]?.headers.ipv4.checksum,
    );
  });

  const cases: readonly (readonly [
    GuidedLabId,
    string,
    "delivered" | "gateway" | "arp" | "ttl",
  ])[] = [
    ["gateway", "local-gateway", "delivered"],
    ["gateway", "remote-gateway", "gateway"],
    ["gateway", "more-ttl", "gateway"],
    ["link", "other-gateway", "arp"],
    ["link", "reconnect-router", "delivered"],
    ["link", "more-ttl", "arp"],
    ["ttl", "wider-prefix", "ttl"],
    ["ttl", "other-gateway", "arp"],
    ["ttl", "enough-ttl", "delivered"],
  ];

  it.each(cases)(
    "%s / %s produces the real expected outcome",
    (id, choiceId, expected) => {
      const lab = guidedLabs.find((candidate) => candidate.id === id)!;
      const choice = lab.choices.find(
        (candidate) => candidate.id === choiceId,
      )!;
      const result = simulatePacket(applyGuidedRepair(id, choice.repair));
      expect(result.errors).toEqual([]);
      if (expected === "delivered") {
        expect(result.outcome).toBe("delivered");
        expect(result.events.at(-1)).toMatchObject({
          type: "delivered",
          deviceId: "pc-b",
          packet: {
            sourceIp: "192.168.1.10",
            destinationIp: "10.0.0.20",
            ttl: id === "ttl" ? 1 : 63,
          },
        });
      } else {
        expect(result.outcome).toBe("dropped");
        expect(result.events.at(-1)).toMatchObject({
          type: "dropped",
          reason: expected,
        });
      }
    },
  );

  it("never retains a previous successful repair or mutates another attempt", () => {
    const original = createGuidedScenario("link");
    const repaired = applyGuidedRepair("link", { kind: "reconnect" });
    const before = structuredClone(repaired);
    const later = applyGuidedRepair("link", { kind: "ttl", value: 128 });
    expect(simulatePacket(repaired).outcome).toBe("delivered");
    expect(simulatePacket(later).events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "arp",
    });
    expect(repaired).toEqual(before);
    expect(createGuidedScenario("link")).toEqual(original);
    expect(later.links).not.toEqual(repaired.links);
    expect(later.devices).not.toBe(original.devices);
  });

  it("starts attempts with empty tables and preserves deterministic evidence", () => {
    for (const lab of guidedLabs) {
      for (const choice of lab.choices) {
        const scenario = applyGuidedRepair(lab.id, choice.repair);
        const result = simulatePacket(scenario);
        expect(
          simulatePacket(applyGuidedRepair(lab.id, choice.repair)),
        ).toEqual(result);
        expect(Object.values(result.events[0]!.tables.arp).flat()).toEqual([]);
        expect(Object.values(result.events[0]!.tables.mac).flat()).toEqual([]);
      }
    }
  });
});
