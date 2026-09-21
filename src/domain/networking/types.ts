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
export type ChangedField =
  "sourceMac" | "destinationMac" | "ttl" | "ipv4Checksum";
interface EventBase {
  id: string;
  title: string;
  explanation: string;
  deviceId: string;
  packet: IPv4Packet;
  frame: EthernetHeader | null;
  headers: PacketHeaderSnapshot;
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

export interface EthernetIIHeader {
  sourceMac: string;
  destinationMac: string;
  etherType: 0x0800 | 0x0806;
  headerLength: 14;
}
export interface ArpHeader {
  hardwareType: 1;
  protocolType: 0x0800;
  hardwareLength: 6;
  protocolLength: 4;
  operation: 1 | 2;
  senderMac: string;
  senderIp: string;
  targetMac: string;
  targetIp: string;
  byteLength: 28;
}
export interface IPv4Header {
  version: 4;
  ihl: 5;
  dscp: 0;
  ecn: 0;
  totalLength: 36;
  identification: 1;
  dontFragment: true;
  moreFragments: false;
  fragmentOffset: 0;
  ttl: number;
  protocol: 1;
  checksum: number;
  sourceIp: string;
  destinationIp: string;
  headerLength: 20;
}
export interface IcmpEchoHeader {
  type: 8;
  code: 0;
  checksum: number;
  identifier: 1;
  sequence: 1;
  payload: "NetLearn";
  payloadBytes: readonly number[];
  headerLength: 8;
  byteLength: 16;
}
export interface PacketHeaderSnapshot {
  /** A current frame is represented at this step, not necessarily being sent.
   * Cached/drop events can retain the previous frame for inspection as "last".
   */
  frameContext: "none" | "current" | "last";
  ethernet: EthernetIIHeader | null;
  arp: ArpHeader | null;
  /** The tracked datagram remains separate while an ARP frame is inspected. */
  ipv4: IPv4Header;
  icmp: IcmpEchoHeader;
}
