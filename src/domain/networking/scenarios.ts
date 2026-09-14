import type {
  NetworkInterface,
  NetworkDevice,
  NetworkTopology,
  SimulationScenario,
} from "./types";
export function makeDevice(
  kind: NetworkDevice["kind"],
  sequence: number,
): NetworkDevice {
  const id = kind + "-" + sequence;
  const ports = kind === "switch" ? 4 : kind === "router" ? 2 : 1;
  const interfaces: NetworkInterface[] = Array.from(
    { length: ports },
    (_, index) => ({
      id: "p" + (index + 1),
      name:
        kind === "router"
          ? "G0/" + index
          : kind === "switch"
            ? "Port " + (index + 1)
            : "eth0",
      macAddress:
        "02:00:00:" +
        Math.floor(sequence / 256)
          .toString(16)
          .padStart(2, "0") +
        ":" +
        (sequence % 256).toString(16).padStart(2, "0") +
        ":" +
        (index + 1).toString(16).padStart(2, "0"),
      ...(kind === "switch"
        ? {}
        : {
            ipAddress:
              kind === "host"
                ? "192.168.1." + (10 + sequence)
                : index === 0
                  ? "192.168.1.1"
                  : "10.0.0.1",
            prefixLength: 24,
          }),
    }),
  );
  if (kind === "router")
    return { kind, id, name: "Router " + sequence, interfaces, routes: [] };
  if (kind === "host")
    return {
      kind,
      id,
      name: "PC " + sequence,
      interfaces,
      defaultGateway: "192.168.1.1",
    };
  return { kind, id, name: "Switch " + sequence, interfaces };
}
export function routedTopology(): NetworkTopology {
  const a = makeDevice("host", 1);
  const sa = makeDevice("switch", 2);
  const r = makeDevice("router", 3);
  const sb = makeDevice("switch", 4);
  const b = makeDevice("host", 5);
  a.id = "pc-a";
  a.name = "PC-A";
  a.interfaces[0] = { ...a.interfaces[0]!, ipAddress: "192.168.1.10" };
  sa.id = "switch-a";
  sa.name = "Switch A";
  r.id = "router-r1";
  r.name = "Router R1";
  sb.id = "switch-b";
  sb.name = "Switch B";
  b.id = "pc-b";
  b.name = "PC-B";
  b.interfaces[0] = { ...b.interfaces[0]!, ipAddress: "10.0.0.20" };
  if (b.kind === "host") b.defaultGateway = "10.0.0.1";
  return {
    devices: [a, sa, r, sb, b],
    links: [
      {
        id: "link-a",
        source: { deviceId: a.id, interfaceId: "p1" },
        target: { deviceId: sa.id, interfaceId: "p1" },
      },
      {
        id: "link-ar",
        source: { deviceId: sa.id, interfaceId: "p2" },
        target: { deviceId: r.id, interfaceId: "p1" },
      },
      {
        id: "link-rb",
        source: { deviceId: r.id, interfaceId: "p2" },
        target: { deviceId: sb.id, interfaceId: "p1" },
      },
      {
        id: "link-b",
        source: { deviceId: sb.id, interfaceId: "p2" },
        target: { deviceId: b.id, interfaceId: "p1" },
      },
    ],
  };
}
export function localTopology(): NetworkTopology {
  const topology = routedTopology();
  const a = topology.devices[0]!;
  const sw = topology.devices[1]!;
  const b = topology.devices[4]!;
  b.interfaces[0] = { ...b.interfaces[0]!, ipAddress: "192.168.1.20" };
  if (a.kind === "host") delete a.defaultGateway;
  if (b.kind === "host") delete b.defaultGateway;
  return {
    devices: [a, sw, b],
    links: [
      topology.links[0]!,
      {
        id: "link-b",
        source: { deviceId: sw.id, interfaceId: "p2" },
        target: { deviceId: b.id, interfaceId: "p1" },
      },
    ],
  };
}
export function packetJourneyScenario(): SimulationScenario {
  return {
    ...routedTopology(),
    sourceId: "pc-a",
    destinationId: "pc-b",
    ttl: 64,
  };
}
