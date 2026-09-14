export interface NetworkInterface {
  id: string;
  name: string;
  macAddress: string;
  ipAddress?: string;
  prefixLength?: number;
}
interface BaseDevice {
  id: string;
  name: string;
  interfaces: NetworkInterface[];
}
export interface HostDevice extends BaseDevice {
  kind: "host";
  defaultGateway?: string;
}
export interface SwitchDevice extends BaseDevice {
  kind: "switch";
}
export interface RouteEntry {
  network: string;
  prefixLength: number;
  interfaceId: string;
  nextHop?: string;
}
export interface RouterDevice extends BaseDevice {
  kind: "router";
  routes: RouteEntry[];
}
export type NetworkDevice = HostDevice | SwitchDevice | RouterDevice;
export interface Endpoint {
  deviceId: string;
  interfaceId: string;
}
export interface NetworkLink {
  id: string;
  source: Endpoint;
  target: Endpoint;
}
export interface NetworkTopology {
  devices: NetworkDevice[];
  links: NetworkLink[];
}
export interface SimulationScenario extends NetworkTopology {
  sourceId: string;
  destinationId: string;
  ttl: number;
}
export interface IPv4Packet {
  sourceIp: string;
  destinationIp: string;
  ttl: number;
  protocol: "icmp";
}
export interface EthernetHeader {
  sourceMac: string;
  destinationMac: string;
  payload: "ipv4" | "arp";
}
export interface ArpEntry {
  ipAddress: string;
  macAddress: string;
  interfaceId: string;
}
export interface MacEntry {
  macAddress: string;
  interfaceId: string;
}
export interface TableSnapshot {
  arp: Record<string, ArpEntry[]>;
  mac: Record<string, MacEntry[]>;
}
export type ChangedField = "sourceMac" | "destinationMac" | "ttl";
interface EventBase {
  id: string;
  title: string;
  explanation: string;
  deviceId: string;
  packet: IPv4Packet;
  frame: EthernetHeader | null;
  tables: TableSnapshot;
  linkId?: string;
  changed: ChangedField[];
}
export type SimulationEvent = EventBase &
  (
    | { type: "decision"; decision: "subnet" | "gateway" | "route" | "ttl" }
    | { type: "arp"; phase: "request" | "reply" | "cached" }
    | {
        type: "frame";
        phase: "created" | "forwarded" | "removed" | "reencapsulated";
      }
    | { type: "delivered" }
    | {
        type: "dropped";
        reason: "gateway" | "arp" | "route" | "ttl" | "destination";
      }
  );
export interface SimulationResult {
  events: SimulationEvent[];
  outcome: "delivered" | "dropped" | "invalid";
  errors: string[];
}
