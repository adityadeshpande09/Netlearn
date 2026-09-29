import { formatIpv4, networkNumber, parseIpv4, validPrefix } from "./ipv4";
import { simulatePacket } from "./simulator";
import type {
  HostDevice,
  NetworkTopology,
  SimulationResult,
  TableSnapshot,
} from "./types";

export interface TerminalResult {
  output: string;
  tables?: TableSnapshot;
  clear?: boolean;
}
const help = [
  "NetLearn simulated Linux-style terminal (not a real shell)",
  "ip addr                 Show this host's configured interfaces",
  "ip route                Show connected routes and default gateway",
  "ip neigh                Show ARP entries from the selected trace or latest probe",
  "ping <IPv4>             Send one modeled echo request, TTL 64",
  "traceroute [-I] <IPv4>   Probe TTL 1–16 using the ICMP request engine",
  "help                    Show these commands",
  "clear                   Clear this host's terminal output",
  "Targets must be other hosts in this workspace. No DNS, real traffic, reply packets, RTT, pipes, or configuration commands.",
].join("\n");

function diagnosticTables(result: SimulationResult): TableSnapshot {
  return result.events.at(-1)?.tables ?? { arp: {}, mac: {} };
}

/** Whitelisted teaching commands only: never forwarded to an operating-system shell. */
export function runHostCommand(
  command: string,
  topology: NetworkTopology,
  hostId: string,
  tables: TableSnapshot,
): TerminalResult {
  if (command.length > 160)
    return { output: "Command too long. Use help for supported commands." };
  const args = command.trim().split(/\s+/);
  const normalized = args.join(" ");
  if (!command.trim()) return { output: "" };
  if (normalized === "help") return { output: help };
  if (normalized === "clear") return { output: "", clear: true };
  const host = topology.devices.find(
    (device): device is HostDevice =>
      device.id === hostId && device.kind === "host",
  );
  if (!host) return { output: "Select a computer to open its terminal." };
  if (normalized === "ip addr" || normalized === "ip addr show") {
    return {
      output:
        host.interfaces
          .map((port, index) => {
            const connected = topology.links.some((link) =>
              [link.source, link.target].some(
                (end) =>
                  end.deviceId === host.id && end.interfaceId === port.id,
              ),
            );
            return `${index + 1}: ${port.name}: state ${connected ? "UP" : "DOWN"}\n    link/ether ${port.macAddress}\n    inet ${port.ipAddress ?? "unconfigured"}/${port.prefixLength ?? "?"}`;
          })
          .join("\n") +
        "\n# State indicates a connected cable; Linux interface flags are not modeled.",
    };
  }
  if (normalized === "ip route" || normalized === "ip route show") {
    const rows: string[] = [];
    if (host.defaultGateway && host.interfaces[0])
      rows.push(
        `default via ${host.defaultGateway} dev ${host.interfaces[0].name}`,
      );
    for (const port of host.interfaces) {
      const ip = parseIpv4(port.ipAddress ?? "");
      if (
        ip !== null &&
        port.prefixLength !== undefined &&
        validPrefix(port.prefixLength)
      )
        rows.push(
          `${formatIpv4(networkNumber(ip, port.prefixLength))}/${port.prefixLength} dev ${port.name} proto kernel scope link src ${port.ipAddress}`,
        );
    }
    return { output: rows.join("\n") || "# No configured IPv4 routes." };
  }
  if (normalized === "ip neigh" || normalized === "ip neigh show") {
    const entries = Object.hasOwn(tables.arp, host.id)
      ? (tables.arp[host.id] ?? [])
      : [];
    return {
      output:
        entries
          .map(
            (entry) =>
              `${entry.ipAddress} dev ${host.interfaces.find((port) => port.id === entry.interfaceId)?.name ?? entry.interfaceId} lladdr ${entry.macAddress}`,
          )
          .join("\n") ||
        "# ARP cache is empty at this step. Try ping to another host, then ip neigh.",
    };
  }
  const isPing = args[0] === "ping";
  const isTrace = args[0] === "traceroute";
  if (!isPing && !isTrace)
    return {
      output:
        "Unsupported command. Type help. This is a read-only simulator, not a system shell.",
    };
  const target =
    isTrace && args[1] === "-I" && args.length === 3
      ? args[2]
      : args.length === 2
        ? args[1]
        : undefined;
  if (!target || parseIpv4(target) === null)
    return {
      output: `Usage: ${isPing ? "ping <IPv4>" : "traceroute [-I] <IPv4>"}. Enter an IPv4 address, not a hostname.`,
    };
  const destination = topology.devices.find(
    (device) =>
      device.kind === "host" && device.interfaces[0]?.ipAddress === target,
  );
  if (!destination)
    return {
      output: `No modeled host has address ${target}. Choose a computer in this workspace; router targets and external addresses are not supported.`,
    };
  if (destination.id === host.id)
    return {
      output: "Choose another host. Local loopback delivery is not modeled.",
    };
  const probe = (ttl: number) =>
    simulatePacket({
      ...topology,
      sourceId: host.id,
      destinationId: destination.id,
      ttl,
    });
  if (isPing) {
    const result = probe(64);
    const last = result.events.at(-1);
    return {
      output: [
        `PING ${target} — simulated echo request`,
        result.outcome === "delivered"
          ? `Request delivered to ${target}, remaining ttl=${last?.packet.ttl}.`
          : result.outcome === "invalid"
            ? `Invalid network: ${result.errors.join(" ")}`
            : `Request stopped: ${last?.explanation ?? "No delivery."}`,
        "No echo reply or timing is simulated; this is not proof of a successful round-trip ping.",
      ].join("\n"),
      tables: diagnosticTables(result),
    };
  }
  const rows = [
    `traceroute to ${target}, 16 hops max (simulated ICMP probes)`,
    "Hop addresses are observed ingress interfaces, not received ICMP replies. No RTT is measured.",
  ];
  let finalTables: TableSnapshot = { arp: {}, mac: {} };
  for (let ttl = 1; ttl <= 16; ttl++) {
    const result = probe(ttl);
    finalTables = diagnosticTables(result);
    const last = result.events.at(-1);
    if (result.outcome === "invalid") {
      rows.push(`Invalid network: ${result.errors.join(" ")}`);
      break;
    }
    if (result.outcome === "delivered") {
      rows.push(`${ttl}  ${target}  destination reached (request only)`);
      break;
    }
    if (last?.type !== "dropped" || last.reason !== "ttl") {
      rows.push(`${ttl}  stopped: ${last?.explanation ?? "No delivery."}`);
      break;
    }
    const router = topology.devices.find(
      (device) => device.id === last.deviceId,
    );
    const incoming = result.events.findLast(
      (event) =>
        event.deviceId === last.deviceId &&
        event.type === "frame" &&
        event.phase === "forwarded" &&
        event.frame?.payload === "ipv4",
    );
    const address = router?.interfaces.find(
      (port) => port.macAddress === incoming?.frame?.destinationMac,
    )?.ipAddress;
    rows.push(
      `${ttl}  ${address ?? "unknown interface"}  ${router?.name ?? last.deviceId} — TTL expired (observed)`,
    );
    if (ttl === 16)
      rows.push("Hop limit reached. Destination not reached within 16 probes.");
  }
  return { output: rows.join("\n"), tables: finalTables };
}
