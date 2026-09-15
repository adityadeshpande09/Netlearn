import type {
  Endpoint,
  NetworkDevice,
  NetworkInterface,
  NetworkLink,
  NetworkTopology,
  RouteEntry,
} from "@/domain/networking/types";

export interface WorkspaceSnapshot {
  topology: NetworkTopology;
  positions: Record<string, { x: number; y: number }>;
  sourceId: string;
  destinationId: string;
  ttl: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}

function isId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value) &&
    value !== "prototype" &&
    !Object.hasOwn(Object.prototype, value)
  );
}

function isPrefix(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= -1024 &&
    value <= 1024
  );
}

function decodeInterface(value: unknown): NetworkInterface | null {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isText(value.name, 40) ||
    !isText(value.macAddress, 64) ||
    (value.ipAddress !== undefined && !isText(value.ipAddress, 64)) ||
    (value.prefixLength !== undefined && !isPrefix(value.prefixLength))
  )
    return null;
  return {
    id: value.id,
    name: value.name,
    macAddress: value.macAddress,
    ...(value.ipAddress !== undefined ? { ipAddress: value.ipAddress } : {}),
    ...(value.prefixLength !== undefined
      ? { prefixLength: value.prefixLength }
      : {}),
  };
}

function decodeRoute(value: unknown, ports: Set<string>): RouteEntry | null {
  if (
    !isRecord(value) ||
    !isText(value.network, 64) ||
    !isPrefix(value.prefixLength) ||
    !isId(value.interfaceId) ||
    !ports.has(value.interfaceId) ||
    (value.nextHop !== undefined && !isText(value.nextHop, 64))
  )
    return null;
  return {
    network: value.network,
    prefixLength: value.prefixLength,
    interfaceId: value.interfaceId,
    ...(value.nextHop !== undefined ? { nextHop: value.nextHop } : {}),
  };
}

function decodeDevice(value: unknown): NetworkDevice | null {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isText(value.name, 40) ||
    (value.kind !== "host" &&
      value.kind !== "switch" &&
      value.kind !== "router") ||
    !Array.isArray(value.interfaces)
  )
    return null;
  const maxPorts = value.kind === "host" ? 1 : value.kind === "switch" ? 4 : 2;
  if (value.interfaces.length < 1 || value.interfaces.length > maxPorts)
    return null;
  const interfaces: NetworkInterface[] = [];
  const ports = new Set<string>();
  for (const raw of value.interfaces) {
    const port = decodeInterface(raw);
    if (!port || ports.has(port.id)) return null;
    interfaces.push(port);
    ports.add(port.id);
  }
  const base = { id: value.id, name: value.name, interfaces };
  if (value.kind === "host") {
    if (value.defaultGateway !== undefined && !isText(value.defaultGateway, 64))
      return null;
    return {
      ...base,
      kind: "host",
      ...(value.defaultGateway !== undefined
        ? { defaultGateway: value.defaultGateway }
        : {}),
    };
  }
  if (value.kind === "switch") return { ...base, kind: "switch" };
  if (
    value.kind !== "router" ||
    !Array.isArray(value.routes) ||
    value.routes.length > 64
  )
    return null;
  const routes: RouteEntry[] = [];
  for (const raw of value.routes) {
    const route = decodeRoute(raw, ports);
    if (!route) return null;
    routes.push(route);
  }
  return { ...base, kind: "router", routes };
}

function decodeEndpoint(
  value: unknown,
  devices: NetworkDevice[],
): Endpoint | null {
  if (!isRecord(value) || !isId(value.deviceId) || !isId(value.interfaceId))
    return null;
  const device = devices.find((item) => item.id === value.deviceId);
  if (!device?.interfaces.some((port) => port.id === value.interfaceId))
    return null;
  return { deviceId: value.deviceId, interfaceId: value.interfaceId };
}

// Saving a draft requires safe data, not a network that can deliver a packet.
export function decodeWorkspace(value: unknown): WorkspaceSnapshot | null {
  if (
    !isRecord(value) ||
    !isRecord(value.topology) ||
    !Array.isArray(value.topology.devices) ||
    value.topology.devices.length > 8 ||
    !Array.isArray(value.topology.links) ||
    value.topology.links.length > 16 ||
    !isRecord(value.positions) ||
    typeof value.sourceId !== "string" ||
    typeof value.destinationId !== "string" ||
    typeof value.ttl !== "number" ||
    !Number.isInteger(value.ttl) ||
    value.ttl < 1 ||
    value.ttl > 255
  )
    return null;
  const devices: NetworkDevice[] = [];
  const deviceIds = new Set<string>();
  for (const raw of value.topology.devices) {
    const device = decodeDevice(raw);
    if (!device || deviceIds.has(device.id)) return null;
    devices.push(device);
    deviceIds.add(device.id);
  }
  for (const id of [value.sourceId, value.destinationId]) {
    if (
      id !== "" &&
      !devices.some((device) => device.id === id && device.kind === "host")
    )
      return null;
  }
  const links: NetworkLink[] = [];
  const linkIds = new Set<string>();
  for (const raw of value.topology.links) {
    if (!isRecord(raw) || !isId(raw.id) || linkIds.has(raw.id)) return null;
    const source = decodeEndpoint(raw.source, devices);
    const target = decodeEndpoint(raw.target, devices);
    if (!source || !target) return null;
    links.push({ id: raw.id, source, target });
    linkIds.add(raw.id);
  }
  const positions: WorkspaceSnapshot["positions"] = {};
  for (const [index, device] of devices.entries()) {
    if (!Object.hasOwn(value.positions, device.id)) {
      positions[device.id] = {
        x: (index % 3) * 245,
        y: Math.floor(index / 3) * 200,
      };
      continue;
    }
    const point = value.positions[device.id];
    if (
      !isRecord(point) ||
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      Math.abs(point.x) > 1_000_000 ||
      Math.abs(point.y) > 1_000_000
    )
      return null;
    positions[device.id] = { x: point.x, y: point.y };
  }
  return {
    topology: { devices, links },
    positions,
    sourceId: value.sourceId,
    destinationId: value.destinationId,
    ttl: value.ttl,
  };
}
