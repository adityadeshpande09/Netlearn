import { formatIpv4, networkNumber, parseIpv4, validPrefix } from "./ipv4";
import type {
  Endpoint,
  NetworkDevice,
  NetworkInterface,
  NetworkTopology,
  RouterDevice,
  RouteEntry,
} from "./types";
export function endpointKey(endpoint: Endpoint): string {
  return endpoint.deviceId + ":" + endpoint.interfaceId;
}
export function deviceById(
  topology: NetworkTopology,
  id: string,
): NetworkDevice | undefined {
  return topology.devices.find((device) => device.id === id);
}
export function interfaceAt(
  topology: NetworkTopology,
  endpoint: Endpoint,
): NetworkInterface | undefined {
  return deviceById(topology, endpoint.deviceId)?.interfaces.find(
    (port) => port.id === endpoint.interfaceId,
  );
}
export function routerRoutes(router: RouterDevice): RouteEntry[] {
  const connected = router.interfaces.flatMap((port) => {
    const ip = parseIpv4(port.ipAddress ?? "");
    if (
      ip === null ||
      port.prefixLength === undefined ||
      !validPrefix(port.prefixLength)
    )
      return [];
    return [
      {
        network: formatIpv4(networkNumber(ip, port.prefixLength)),
        prefixLength: port.prefixLength,
        interfaceId: port.id,
      },
    ];
  });
  return [...connected, ...router.routes];
}
export interface RouteCandidate {
  route: RouteEntry;
  source: "Connected" | "Static";
  matches: boolean;
  valid: boolean;
  selected: boolean;
}
/** Shared lookup for forwarding and explanation; equal prefixes keep table order. */
export function explainRouteSelection(
  router: RouterDevice,
  destination: string,
) {
  const ip = parseIpv4(destination);
  const routes = routerRoutes(router);
  const connectedCount = routes.length - router.routes.length;
  let winner = -1;
  const candidates: RouteCandidate[] = routes.map((route, index) => {
    const network = parseIpv4(route.network);
    const valid = network !== null && validPrefix(route.prefixLength);
    const matches =
      ip !== null &&
      network !== null &&
      valid &&
      networkNumber(ip, route.prefixLength) ===
        networkNumber(network, route.prefixLength);
    if (
      matches &&
      (winner === -1 || route.prefixLength > routes[winner]!.prefixLength)
    )
      winner = index;
    return {
      route,
      source: index < connectedCount ? "Connected" : "Static",
      matches,
      valid,
      selected: false,
    };
  });
  const selected = candidates[winner];
  if (selected) selected.selected = true;
  return {
    validDestination: ip !== null,
    candidates,
    selected: selected?.route,
    tied: selected
      ? candidates.filter(
          (candidate) =>
            candidate.matches &&
            candidate.route.prefixLength === selected.route.prefixLength,
        ).length > 1
      : false,
  };
}
export function selectRoute(
  router: RouterDevice,
  destination: string,
): RouteEntry | undefined {
  return explainRouteSelection(router, destination).selected;
}
export function validateTopology(topology: NetworkTopology): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const addresses = new Set<string>();
  const macs = new Set<string>();
  for (const device of topology.devices) {
    if (!device.id || ids.has(device.id))
      errors.push("Each device needs a unique ID.");
    ids.add(device.id);
    if (!device.name.trim()) errors.push("Every device needs a name.");
    if (device.kind === "host" && device.interfaces.length !== 1)
      errors.push(
        device.name + " needs exactly one Ethernet interface in this lab.",
      );
    const ports = new Set<string>();
    for (const port of device.interfaces) {
      if (!port.id || ports.has(port.id))
        errors.push(device.name + " has duplicate interface IDs.");
      ports.add(port.id);
      const mac = port.macAddress.toLowerCase();
      if (
        !/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac) ||
        macs.has(mac) ||
        (parseInt(mac.slice(0, 2), 16) & 1) !== 0
      )
        errors.push(device.name + " needs distinct unicast MAC addresses.");
      macs.add(mac);
      if (device.kind === "switch") continue;
      const ip = parseIpv4(port.ipAddress ?? "");
      const prefix = port.prefixLength;
      if (
        ip === null ||
        prefix === undefined ||
        !validPrefix(prefix) ||
        prefix < 1 ||
        prefix > 30
      ) {
        errors.push(
          device.name +
            " · " +
            port.name +
            ": enter a valid IPv4 address and /1–/30 prefix for this Ethernet lab.",
        );
        continue;
      }
      const first = networkNumber(ip, prefix);
      const last = first + 2 ** (32 - prefix) - 1;
      if (
        ip === first ||
        ip === last ||
        ip < 16777216 ||
        Math.floor(ip / 16777216) === 127 ||
        ip >= 3758096384
      )
        errors.push(
          device.name +
            " · " +
            port.name +
            ": choose a unicast host address, not a network, broadcast, loopback, or multicast address.",
        );
      if (addresses.has(port.ipAddress!))
        errors.push(
          "Duplicate IP address: " +
            port.ipAddress +
            ". Use a distinct address on each interface.",
        );
      addresses.add(port.ipAddress!);
    }
    if (
      device.kind === "host" &&
      device.defaultGateway &&
      parseIpv4(device.defaultGateway) === null
    )
      errors.push(device.name + " has an invalid default gateway address.");
    if (device.kind === "router")
      for (const route of device.routes) {
        if (
          parseIpv4(route.network) === null ||
          !validPrefix(route.prefixLength) ||
          !ports.has(route.interfaceId) ||
          (route.nextHop !== undefined && parseIpv4(route.nextHop) === null)
        )
          errors.push(device.name + " has an invalid static route.");
      }
  }
  const connectedPorts = new Set<string>();
  const linkIds = new Set<string>();
  const parent = new Map<string, string>();
  function group(endpoint: Endpoint) {
    return deviceById(topology, endpoint.deviceId)?.kind === "switch"
      ? endpoint.deviceId
      : endpointKey(endpoint);
  }
  function find(key: string): string {
    const next = parent.get(key);
    return next === undefined || next === key ? key : find(next);
  }
  for (const link of topology.links) {
    if (linkIds.has(link.id)) errors.push("Each cable needs a unique ID.");
    linkIds.add(link.id);
    if (
      !interfaceAt(topology, link.source) ||
      !interfaceAt(topology, link.target)
    ) {
      errors.push("A cable references a missing interface.");
      continue;
    }
    if (link.source.deviceId === link.target.deviceId)
      errors.push("Connect two different devices.");
    for (const endpoint of [link.source, link.target]) {
      const key = endpointKey(endpoint);
      if (connectedPorts.has(key))
        errors.push(
          "An Ethernet port can connect to only one cable. Choose a free port.",
        );
      connectedPorts.add(key);
    }
    const source = find(group(link.source));
    const target = find(group(link.target));
    if (source === target)
      errors.push(
        "Remove the loop between switches. Spanning Tree Protocol is outside this introductory lab.",
      );
    else parent.set(source, target);
  }
  return [...new Set(errors)];
}
export interface EthernetHop {
  from: Endpoint;
  to: Endpoint;
  linkId: string;
}
export interface EthernetPath {
  hops: EthernetHop[];
  target: Endpoint;
}
export function findEthernetPath(
  topology: NetworkTopology,
  start: Endpoint,
  targetIp: string,
): EthernetPath | null {
  const queue: { endpoint: Endpoint; hops: EthernetHop[] }[] = [
    { endpoint: start, hops: [] },
  ];
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const device = deviceById(topology, current.endpoint.deviceId);
    if (!device) continue;
    const key =
      device.kind === "switch" ? device.id : endpointKey(current.endpoint);
    if (visited.has(key)) continue;
    visited.add(key);
    if (
      current.hops.length &&
      interfaceAt(topology, current.endpoint)?.ipAddress === targetIp
    )
      return { hops: current.hops, target: current.endpoint };
    if (current.hops.length && device.kind !== "switch") continue;
    for (const link of topology.links) {
      for (const [from, to] of [
        [link.source, link.target],
        [link.target, link.source],
      ] as const) {
        if (
          from.deviceId !== device.id ||
          (device.kind !== "switch" &&
            from.interfaceId !== current.endpoint.interfaceId)
        )
          continue;
        queue.push({
          endpoint: to,
          hops: [...current.hops, { from, to, linkId: link.id }],
        });
      }
    }
  }
  return null;
}

export function broadcastHops(
  topology: NetworkTopology,
  start: Endpoint,
): EthernetHop[] {
  const queue: Endpoint[] = [start];
  const visitedLinks = new Set<string>();
  const visitedSwitches = new Set<string>();
  const hops: EthernetHop[] = [];
  while (queue.length) {
    const endpoint = queue.shift()!;
    const device = deviceById(topology, endpoint.deviceId)!;
    if (device.kind === "switch") {
      if (visitedSwitches.has(device.id)) continue;
      visitedSwitches.add(device.id);
    } else if (endpointKey(endpoint) !== endpointKey(start)) continue;
    for (const link of topology.links) {
      if (visitedLinks.has(link.id)) continue;
      for (const [from, to] of [
        [link.source, link.target],
        [link.target, link.source],
      ] as const) {
        if (
          from.deviceId !== device.id ||
          (device.kind !== "switch" &&
            from.interfaceId !== endpoint.interfaceId)
        )
          continue;
        visitedLinks.add(link.id);
        hops.push({ from, to, linkId: link.id });
        queue.push(to);
      }
    }
  }
  return hops;
}
