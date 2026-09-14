import { describe, expect, it } from "vitest";
import { simulatePacket } from "@/domain/networking/simulator";
import {
  localTopology,
  makeDevice,
  packetJourneyScenario,
} from "@/domain/networking/scenarios";
import { selectRoute, validateTopology } from "@/domain/networking/topology";
import type {
  SimulationScenario,
  RouterDevice,
} from "@/domain/networking/types";
const run = (scenario = packetJourneyScenario()) => simulatePacket(scenario);
function router(scenario: SimulationScenario): RouterDevice {
  const value = scenario.devices.find((d) => d.kind === "router");
  if (value?.kind !== "router") throw new Error("Missing fixture router");
  return value;
}
describe("packet simulation", () => {
  it("delivers across a router, preserving IP endpoints and changing MACs and TTL", () => {
    const result = run();
    expect(result.outcome).toBe("delivered");
    expect(result.errors).toEqual([]);
    expect(
      result.events.every(
        (e) =>
          e.packet.sourceIp === "192.168.1.10" &&
          e.packet.destinationIp === "10.0.0.20",
      ),
    ).toBe(true);
    const first = result.events.find(
      (e) => e.type === "frame" && e.phase === "created",
    )!;
    const routed = result.events.find(
      (e) => e.type === "frame" && e.phase === "reencapsulated",
    )!;
    expect(first.frame).toMatchObject({
      sourceMac: "02:00:00:00:01:01",
      destinationMac: "02:00:00:00:03:01",
      payload: "ipv4",
    });
    expect(routed.frame).toMatchObject({
      sourceMac: "02:00:00:00:03:02",
      destinationMac: "02:00:00:00:05:01",
      payload: "ipv4",
    });
    expect(first.packet.ttl).toBe(64);
    expect(routed.packet.ttl).toBe(63);
    expect(result.events.at(-1)?.type).toBe("delivered");
    expect(result.events[0]?.tables.arp["pc-a"]).toEqual([]);
    expect(result.events.at(-1)?.tables.mac["switch-a"]).toHaveLength(2);
  });
  it("is deterministic and leaves input and earlier snapshots unchanged", () => {
    const scenario = packetJourneyScenario();
    const before = structuredClone(scenario);
    const result = run(scenario);
    expect(run(scenario)).toEqual(result);
    expect(scenario).toEqual(before);
    expect(result.events[0]?.tables.mac["switch-a"]).toEqual([]);
  });
  it("delivers directly on a LAN with TTL 1 and no gateway", () => {
    const scenario = {
      ...localTopology(),
      sourceId: "pc-a",
      destinationId: "pc-b",
      ttl: 1,
    };
    for (const d of scenario.devices)
      if (d.kind === "host") delete d.defaultGateway;
    const result = run(scenario);
    expect(result.outcome).toBe("delivered");
    expect(result.events.at(-1)?.packet.ttl).toBe(1);
    expect(
      result.events
        .filter((e) => e.type === "decision")
        .map((e) => (e.type === "decision" ? e.decision : "")),
    ).toEqual(["subnet"]);
  });
  it("stops remote traffic without a gateway", () => {
    const s = packetJourneyScenario();
    const source = s.devices[0]!;
    if (source.kind === "host") delete source.defaultGateway;
    expect(run(s).events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "gateway",
    });
  });
  it("broadcasts ARP before reporting an unanswered gateway", () => {
    const s = packetJourneyScenario();
    const source = s.devices[0]!;
    if (source.kind === "host") source.defaultGateway = "192.168.1.99";
    const result = run(s);
    expect(
      result.events.some((e) => e.type === "arp" && e.phase === "request"),
    ).toBe(true);
    expect(result.events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "arp",
    });
    expect(result.events.at(-1)?.tables.mac["switch-a"]).toContainEqual({
      macAddress: source.interfaces[0]!.macAddress,
      interfaceId: "p1",
    });
  });
  it("expires TTL before creating an outgoing data frame", () => {
    const s = packetJourneyScenario();
    s.ttl = 1;
    const result = run(s);
    expect(result.events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "ttl",
      packet: { ttl: 0 },
    });
    expect(
      result.events.some(
        (e) => e.type === "frame" && e.phase === "reencapsulated",
      ),
    ).toBe(false);
  });
  it("reports a missing route", () => {
    const s = packetJourneyScenario();
    router(s).interfaces[1]!.ipAddress = "172.16.0.1";
    expect(run(s).events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "route",
    });
  });
  it("reports a disconnected cable", () => {
    const s = packetJourneyScenario();
    s.links = s.links.filter((l) => l.id !== "link-b");
    expect(run(s).events.at(-1)).toMatchObject({
      type: "dropped",
      reason: "arp",
    });
  });
  it("learns broadcasts on switch branches outside the destination path", () => {
    const s = packetJourneyScenario();
    const branch = makeDevice("switch", 9);
    s.devices.push(branch);
    s.links.push({
      id: "branch",
      source: { deviceId: "switch-a", interfaceId: "p3" },
      target: { deviceId: branch.id, interfaceId: "p1" },
    });
    const result = run(s);
    expect(result.outcome).toBe("delivered");
    expect(result.events.at(-1)?.tables.mac[branch.id]).toContainEqual({
      macAddress: "02:00:00:00:01:01",
      interfaceId: "p1",
    });
    expect(
      result.events.some(
        (e) =>
          e.deviceId === "switch-b" &&
          e.type === "arp" &&
          e.phase === "request" &&
          e.frame?.sourceMac === "02:00:00:00:01:01",
      ),
    ).toBe(false);
  });
  it.each(["constructor", "__proto__", "toString"])(
    "supports the device ID %s without inherited table entries",
    (id) => {
      const s = packetJourneyScenario();
      s.devices[0]!.id = id;
      s.sourceId = id;
      s.links[0]!.source.deviceId = id;
      const result = run(s);
      expect(result.outcome).toBe("delivered");
      expect(result.events[0]?.tables.arp[id]).toEqual([]);
      expect(result.events.at(-1)?.tables.arp[id]).toHaveLength(1);
    },
  );
  it("chooses a more specific static route over a default route", () => {
    const s = packetJourneyScenario();
    const r = router(s);
    r.routes = [
      {
        network: "0.0.0.0",
        prefixLength: 0,
        interfaceId: "p1",
        nextHop: "192.168.1.2",
      },
      {
        network: "203.0.113.0",
        prefixLength: 24,
        interfaceId: "p2",
        nextHop: "10.0.0.2",
      },
    ];
    expect(selectRoute(r, "203.0.113.7")).toEqual(r.routes[1]);
    expect(selectRoute(r, "8.8.8.8")).toEqual(r.routes[0]);
    expect(selectRoute(r, "10.0.0.20")).toMatchObject({
      network: "10.0.0.0",
      prefixLength: 24,
      interfaceId: "p2",
    });
  });
  it("rejects duplicate IPs and occupied ports before simulating", () => {
    const s = packetJourneyScenario();
    s.devices[4]!.interfaces[0]!.ipAddress = "192.168.1.10";
    s.links.push({ ...s.links[0]!, id: "duplicate" });
    const result = run(s);
    expect(result.outcome).toBe("invalid");
    expect(result.events).toEqual([]);
    expect(result.errors.join(" ")).toMatch(/Duplicate IP address/);
    expect(result.errors.join(" ")).toMatch(/only one cable/);
  });
  it("detects switch loops", () => {
    const s = packetJourneyScenario();
    const sw = makeDevice("switch", 9);
    s.devices.push(sw);
    s.links.push(
      {
        id: "extra-a",
        source: { deviceId: "switch-a", interfaceId: "p3" },
        target: { deviceId: sw.id, interfaceId: "p1" },
      },
      {
        id: "extra-b",
        source: { deviceId: "switch-a", interfaceId: "p4" },
        target: { deviceId: sw.id, interfaceId: "p2" },
      },
    );
    expect(validateTopology(s).join(" ")).toMatch(/Remove the loop/);
  });
  it.each([0, 256, 1.5, NaN])("rejects invalid TTL %s", (ttl) => {
    const s = packetJourneyScenario();
    s.ttl = ttl;
    expect(run(s).outcome).toBe("invalid");
  });
});
