import { describe, expect, it } from "vitest";
import { runHostCommand } from "@/domain/networking/host-commands";
import {
  routedTopology,
  localTopology,
  makeDevice,
  missingGatewayTopology,
} from "@/domain/networking/scenarios";
import { simulatePacket } from "@/domain/networking/simulator";
import type { NetworkTopology } from "@/domain/networking/types";
const empty = { arp: {}, mac: {} };
const run = (
  command: string,
  topology: NetworkTopology = routedTopology(),
  host = "pc-a",
) => runHostCommand(command, topology, host, empty);

describe("host teaching commands", () => {
  it("formats configured addresses and connected/default routes without mutating topology", () => {
    const topology = routedTopology();
    const original = structuredClone(topology);
    expect(run("ip addr", topology).output).toContain("inet 192.168.1.10/24");
    expect(run("ip route", topology).output).toContain(
      "default via 192.168.1.1 dev eth0",
    );
    expect(run("ip route", topology).output).toContain(
      "192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10",
    );
    run("traceroute 10.0.0.20", topology);
    expect(topology).toEqual(original);
  });
  it("uses exactly the selected host's ARP snapshot", () => {
    const topology = routedTopology();
    const result = simulatePacket({
      ...topology,
      sourceId: "pc-a",
      destinationId: "pc-b",
      ttl: 64,
    });
    const tables = result.events.at(-1)!.tables;
    const output = runHostCommand("ip neigh", topology, "pc-a", tables).output;
    expect(output).toContain("192.168.1.1 dev eth0 lladdr 02:00:00:00:03:01");
    expect(output).not.toContain("10.0.0.1");
    expect(run("ip neigh").output).toContain("ARP cache is empty");
  });
  it("reports outgoing ping delivery honestly and returns learned tables", () => {
    const result = run("ping 10.0.0.20");
    expect(result.output).toContain("remaining ttl=63");
    expect(result.output).toContain("No echo reply or timing is simulated");
    expect(result.tables?.arp["pc-a"]).toHaveLength(1);
  });
  it("probes a routed path by increasing TTL and identifies the ingress interface", () => {
    const output = run("traceroute -I 10.0.0.20").output;
    expect(output).toContain("1  192.168.1.1  Router R1 — TTL expired");
    expect(output).toContain("2  10.0.0.20  destination reached");
    expect(output).not.toContain("3  ");
    const reverse = run(
      "traceroute 192.168.1.10",
      routedTopology(),
      "pc-b",
    ).output;
    expect(reverse).toContain("1  10.0.0.1  Router R1 — TTL expired");
  });
  it("reaches a same-subnet host on the first probe without listing switches", () => {
    const output = run("traceroute 192.168.1.20", localTopology()).output;
    expect(output).toContain("1  192.168.1.20  destination reached");
    expect(output).not.toContain("TTL expired");
  });
  it("traces multiple routers and bounds a routing loop at 16 probes", () => {
    const topology = routedTopology();
    const first = topology.devices.find((device) => device.kind === "router")!;
    const second = makeDevice("router", 6);
    if (first.kind !== "router" || second.kind !== "router")
      throw new Error("Expected routers");
    first.interfaces[1]!.ipAddress = "172.16.0.1";
    second.interfaces[0]!.ipAddress = "172.16.0.2";
    first.routes = [
      {
        network: "10.0.0.0",
        prefixLength: 24,
        interfaceId: "p2",
        nextHop: "172.16.0.2",
      },
    ];
    topology.devices.push(second);
    topology.links.find((link) => link.id === "link-rb")!.source.deviceId =
      second.id;
    topology.links.push({
      id: "routers",
      source: { deviceId: first.id, interfaceId: "p2" },
      target: { deviceId: second.id, interfaceId: "p1" },
    });
    const trace = run("traceroute 10.0.0.20", topology).output;
    expect(trace).toContain("1  192.168.1.1  Router R1");
    expect(trace).toContain("2  172.16.0.2  Router 6");
    expect(trace).toContain("3  10.0.0.20  destination reached");
    second.routes = [
      {
        network: "10.0.0.20",
        prefixLength: 32,
        interfaceId: "p1",
        nextHop: "172.16.0.1",
      },
    ];
    const loop = run("traceroute 10.0.0.20", topology).output;
    expect(loop).toContain("16  172.16.0.2  Router 6");
    expect(loop).toContain("Hop limit reached");
    expect(loop).not.toContain("destination reached");
  });
  it("explains missing gateways and broken links without fake timeout replies", () => {
    const topology = routedTopology();
    const source = topology.devices.find((device) => device.id === "pc-a")!;
    if (source.kind === "host") delete source.defaultGateway;
    expect(run("traceroute 10.0.0.20", topology).output).toContain(
      "No default gateway",
    );
    const broken = routedTopology();
    broken.links = broken.links.filter((link) => link.id !== "link-ar");
    expect(run("ping 10.0.0.20", broken).output).toContain(
      "No device answers ARP",
    );
  });
  it.each([
    "ping example.com",
    "ping 999.1.1.1",
    "ping -c 3 10.0.0.20",
    "traceroute -m 999 10.0.0.20",
  ])("rejects unsupported diagnostic syntax: %s", (command) => {
    expect(run(command).output).toContain("Usage:");
  });
  it("rejects external, router, self targets, shell syntax and configuration commands", () => {
    expect(run("ping 8.8.8.8").output).toContain("No modeled host");
    expect(run("ping 192.168.1.1").output).toContain("router targets");
    expect(run("ping 192.168.1.10").output).toContain("loopback");
    expect(run("ip addr; whoami").output).toContain("Unsupported");
    expect(run("ip addr add 192.168.1.2/24").output).toContain("Unsupported");
    expect(run("a".repeat(161)).output).toContain("too long");
    expect(run("clear").clear).toBe(true);
  });
});

describe("default gateway repairs", () => {
  it("returns an immutable host update that restores routed delivery", () => {
    const topology = missingGatewayTopology();
    const before = structuredClone(topology);
    expect(run("ping 10.0.0.20", topology).output).toContain(
      "No default gateway",
    );
    const result = run("ip route add default via 192.168.1.1", topology);
    expect(result.updatedHost?.defaultGateway).toBe("192.168.1.1");
    expect(topology).toEqual(before);
    const repaired = {
      ...topology,
      devices: topology.devices.map((device) =>
        device.id === result.updatedHost?.id ? result.updatedHost : device,
      ),
    };
    expect(run("ip route", repaired).output).toContain(
      "default via 192.168.1.1",
    );
    expect(run("traceroute 10.0.0.20", repaired).output).toContain(
      "2  10.0.0.20  destination reached",
    );
    expect(
      run("ip route add default via 192.168.1.254", repaired).updatedHost,
    ).toBeUndefined();
    expect(
      run("ip route add default via 192.168.1.1", repaired).output,
    ).toContain("already exists");
  });
  it.each([
    "garbage",
    "999.1.1.1",
    "192.168.1.0",
    "192.168.1.255",
    "192.168.1.10",
    "10.0.0.1",
    "224.0.0.1",
    "127.0.0.1",
    "0.0.0.0",
  ])("rejects an invalid or off-link gateway: %s", (gateway) => {
    const result = run(
      `ip route add default via ${gateway}`,
      missingGatewayTopology(),
    );
    expect(result.updatedHost).toBeUndefined();
    expect(result.output).toContain("Error:");
  });
  it.each([
    "ip route add default",
    "ip route add default via 192.168.1.1 dev eth0",
    "ip route add default via 192.168.1.1; whoami",
  ])("rejects unsupported syntax: %s", (command) => {
    expect(run(command, missingGatewayTopology()).updatedHost).toBeUndefined();
  });
  it("does not mistake an accepted route for a reachable gateway", () => {
    const topology = missingGatewayTopology();
    const result = run("ip route add default via 192.168.1.254", topology);
    expect(result.updatedHost).toBeDefined();
    topology.devices = topology.devices.map((device) =>
      device.id === result.updatedHost?.id ? result.updatedHost : device,
    );
    expect(run("ping 10.0.0.20", topology).output).toContain(
      "No device answers ARP",
    );
  });
  it("rejects an unconfigured host interface and a non-host selection", () => {
    const topology = missingGatewayTopology();
    delete topology.devices[0]!.interfaces[0]!.ipAddress;
    expect(
      run("ip route add default via 192.168.1.1", topology).output,
    ).toContain("configure one valid");
    expect(
      run("ip route add default via 192.168.1.1", topology, "router-r1")
        .updatedHost,
    ).toBeUndefined();
  });
});
