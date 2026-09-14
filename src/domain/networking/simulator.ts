import { sameSubnet } from "./ipv4";
import {
  broadcastHops,
  deviceById,
  findEthernetPath,
  interfaceAt,
  selectRoute,
  validateTopology,
  type EthernetHop,
} from "./topology";
import type {
  ArpEntry,
  ChangedField,
  EthernetHeader,
  IPv4Packet,
  MacEntry,
  NetworkDevice,
  NetworkInterface,
  SimulationEvent,
  SimulationResult,
  SimulationScenario,
  TableSnapshot,
} from "./types";
type Action =
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
    };
export function simulatePacket(scenario: SimulationScenario): SimulationResult {
  const errors = validateTopology(scenario);
  const source = deviceById(scenario, scenario.sourceId);
  const destination = deviceById(scenario, scenario.destinationId);
  if (
    source?.kind !== "host" ||
    destination?.kind !== "host" ||
    source.id === destination.id
  )
    errors.push("Choose two different computers as source and destination.");
  if (!Number.isInteger(scenario.ttl) || scenario.ttl < 1 || scenario.ttl > 255)
    errors.push("TTL must be an integer from 1 to 255.");
  if (errors.length || !source || !destination)
    return { events: [], outcome: "invalid", errors };
  const sourcePort = source.interfaces[0]!;
  const destinationPort = destination.interfaces[0]!;
  const packet: IPv4Packet = {
    sourceIp: sourcePort.ipAddress!,
    destinationIp: destinationPort.ipAddress!,
    ttl: scenario.ttl,
    protocol: "icmp",
  };
  const events: SimulationEvent[] = [];
  let frame: EthernetHeader | null = null;
  const arp = new Map<string, ArpEntry[]>();
  const mac = new Map<string, MacEntry[]>();
  const snapshot = (): TableSnapshot => ({
    arp: Object.fromEntries(
      scenario.devices.map((device) => [
        device.id,
        (arp.get(device.id) ?? []).map((entry) => ({ ...entry })),
      ]),
    ),
    mac: Object.fromEntries(
      scenario.devices.map((device) => [
        device.id,
        (mac.get(device.id) ?? []).map((entry) => ({ ...entry })),
      ]),
    ),
  });
  function emit(
    action: Action,
    device: NetworkDevice,
    title: string,
    explanation: string,
    linkId?: string,
    changed: ChangedField[] = [],
  ) {
    events.push({
      ...action,
      id: "event-" + (events.length + 1),
      deviceId: device.id,
      title,
      explanation,
      packet: { ...packet },
      frame: frame ? { ...frame } : null,
      tables: snapshot(),
      changed,
      ...(linkId ? { linkId } : {}),
    });
  }
  function drop(
    device: NetworkDevice,
    reason: Extract<Action, { type: "dropped" }>["reason"],
    explanation: string,
  ): SimulationResult {
    emit(
      { type: "dropped", reason },
      device,
      "Packet stopped at " + device.name,
      explanation,
    );
    return { events, outcome: "dropped", errors: [] };
  }
  function learnMac(
    device: NetworkDevice,
    interfaceId: string,
    address: string,
  ) {
    const entries = mac.get(device.id) ?? [];
    mac.set(device.id, [
      ...entries.filter((entry) => entry.macAddress !== address),
      { macAddress: address, interfaceId },
    ]);
  }
  function rememberArp(
    deviceId: string,
    port: NetworkInterface,
    ipAddress: string,
    macAddress: string,
  ) {
    arp.set(deviceId, [
      ...(arp.get(deviceId) ?? []).filter(
        (entry) =>
          entry.ipAddress !== ipAddress || entry.interfaceId !== port.id,
      ),
      { ipAddress, macAddress, interfaceId: port.id },
    ]);
  }
  function traverse(hops: EthernetHop[], mode: "request" | "reply" | "data") {
    for (const hop of hops) {
      const target = deviceById(scenario, hop.to.deviceId)!;
      if (target.kind === "switch") {
        learnMac(target, hop.to.interfaceId, frame!.sourceMac);
        const known = (mac.get(target.id) ?? []).find(
          (entry) => entry.macAddress === frame!.destinationMac,
        );
        const flooding = mode === "request" || !known;
        emit(
          mode === "data"
            ? { type: "frame", phase: "forwarded" }
            : { type: "arp", phase: mode },
          target,
          target.name +
            (flooding ? " floods the frame" : " forwards a known unicast"),
          "It learns source MAC " +
            frame!.sourceMac +
            " on " +
            interfaceAt(scenario, hop.to)!.name +
            ". " +
            (flooding
              ? "It floods to the other connected ports in this VLAN, excluding the incoming port. The broadcast reaches each connected branch of this local network."
              : "Its MAC table identifies the destination port; the IP packet is unchanged."),
          hop.linkId,
        );
      } else
        emit(
          mode === "data"
            ? { type: "frame", phase: "forwarded" }
            : { type: "arp", phase: mode },
          target,
          mode === "data"
            ? "The frame reaches " + target.name
            : (mode === "request"
                ? "ARP request reaches "
                : "ARP reply reaches ") + target.name,
          mode === "data"
            ? target.name + " receives a frame addressed to its interface."
            : "ARP stays on this local Ethernet network. Routers do not forward this broadcast into another subnet.",
          hop.linkId,
        );
    }
  }
  let current = source;
  let outgoing = sourcePort;
  let routed = false;
  emit(
    { type: "decision", decision: "subnet" },
    source,
    source.name + " checks the destination network",
    sameSubnet(packet.sourceIp, packet.destinationIp, sourcePort.prefixLength!)
      ? "The destination is in the same subnet. Send directly to its local MAC address."
      : "The destination is outside the source subnet. A gateway is needed to reach another network.",
  );
  for (let hopCount = 0; hopCount < 256; hopCount++) {
    let nextHopIp: string;
    if (current.kind === "host") {
      if (
        sameSubnet(
          outgoing.ipAddress!,
          packet.destinationIp,
          outgoing.prefixLength!,
        )
      )
        nextHopIp = packet.destinationIp;
      else {
        if (!current.defaultGateway)
          return drop(
            current,
            "gateway",
            "No default gateway is configured. Set the gateway to the router interface on this computer’s local subnet.",
          );
        if (
          !sameSubnet(
            outgoing.ipAddress!,
            current.defaultGateway,
            outgoing.prefixLength!,
          ) ||
          current.defaultGateway === outgoing.ipAddress
        )
          return drop(
            current,
            "gateway",
            "The gateway must be another device on this computer’s local subnet.",
          );
        nextHopIp = current.defaultGateway;
        emit(
          { type: "decision", decision: "gateway" },
          current,
          "Use the default gateway",
          "Resolve " +
            nextHopIp +
            " on the local link. The IP destination stays " +
            packet.destinationIp +
            ".",
        );
      }
    } else if (current.kind === "router") {
      frame = null;
      emit(
        { type: "frame", phase: "removed" },
        current,
        "Remove the incoming Ethernet frame",
        "The router examines the IPv4 packet. The incoming Ethernet header is not carried into the next network.",
      );
      const route = selectRoute(current, packet.destinationIp);
      if (!route)
        return drop(
          current,
          "route",
          "No routing-table entry matches " +
            packet.destinationIp +
            ". Add a connected network or a suitable static route.",
        );
      outgoing = current.interfaces.find(
        (port) => port.id === route.interfaceId,
      )!;
      nextHopIp = route.nextHop ?? packet.destinationIp;
      emit(
        { type: "decision", decision: "route" },
        current,
        "Choose the longest matching route",
        route.network +
          "/" +
          route.prefixLength +
          " uses " +
          outgoing.name +
          (route.nextHop
            ? " via " + route.nextHop + "."
            : ". The destination network is directly connected."),
      );
      packet.ttl--;
      emit(
        { type: "decision", decision: "ttl" },
        current,
        "Decrement TTL",
        "The router reduces TTL by one before forwarding. Source and destination IP addresses stay the same in this example without NAT.",
        undefined,
        ["ttl"],
      );
      if (packet.ttl === 0)
        return drop(
          current,
          "ttl",
          "TTL has reached zero at this router. The packet is discarded instead of being forwarded. An ICMP Time Exceeded reply is outside this one-way demonstration.",
        );
      if (!sameSubnet(outgoing.ipAddress!, nextHopIp, outgoing.prefixLength!))
        return drop(
          current,
          "route",
          "The route’s next hop is not on the selected outgoing interface’s subnet.",
        );
      routed = true;
    } else
      return drop(
        current,
        "destination",
        "A switch cannot originate a routed IP hop.",
      );
    const cached = (arp.get(current.id) ?? []).find(
      (entry) =>
        entry.ipAddress === nextHopIp && entry.interfaceId === outgoing.id,
    );
    if (!cached) {
      frame = {
        sourceMac: outgoing.macAddress,
        destinationMac: "ff:ff:ff:ff:ff:ff",
        payload: "arp",
      };
      emit(
        { type: "arp", phase: "request" },
        current,
        "Ask for the next hop’s MAC address",
        "Who has " +
          nextHopIp +
          "? This is a local ARP broadcast; the IPv4 packet is still waiting to be sent.",
      );
      traverse(
        broadcastHops(scenario, {
          deviceId: current.id,
          interfaceId: outgoing.id,
        }),
        "request",
      );
    }
    const path = findEthernetPath(
      scenario,
      { deviceId: current.id, interfaceId: outgoing.id },
      nextHopIp,
    );
    if (!path)
      return drop(
        current,
        "arp",
        "No device answers ARP for " +
          nextHopIp +
          " on this local link. Check the cables, interface addresses, and gateway.",
      );
    const target = deviceById(scenario, path.target.deviceId)!;
    const targetPort = interfaceAt(scenario, path.target)!;
    if (!cached) {
      rememberArp(
        target.id,
        targetPort,
        outgoing.ipAddress!,
        outgoing.macAddress,
      );
      frame = {
        sourceMac: targetPort.macAddress,
        destinationMac: outgoing.macAddress,
        payload: "arp",
      };
      emit(
        { type: "arp", phase: "reply" },
        target,
        target.name + " answers ARP",
        nextHopIp +
          " is at " +
          targetPort.macAddress +
          ". The reply is sent back as a unicast frame.",
      );
      traverse(
        [...path.hops]
          .reverse()
          .map((hop) => ({ from: hop.to, to: hop.from, linkId: hop.linkId })),
        "reply",
      );
      rememberArp(current.id, outgoing, nextHopIp, targetPort.macAddress);
      emit(
        { type: "arp", phase: "cached" },
        current,
        "Remember the ARP result",
        "The ARP table now maps " +
          nextHopIp +
          " to " +
          targetPort.macAddress +
          " on " +
          outgoing.name +
          ".",
      );
    }
    frame = {
      sourceMac: outgoing.macAddress,
      destinationMac: targetPort.macAddress,
      payload: "ipv4",
    };
    emit(
      { type: "frame", phase: routed ? "reencapsulated" : "created" },
      current,
      routed
        ? "Create a new Ethernet frame"
        : "Wrap the IP packet in an Ethernet frame",
      routed
        ? "The outgoing interface supplies a new source MAC and the next hop supplies a new destination MAC. The IP endpoints are unchanged."
        : "The Ethernet destination is the local next hop. Inside, the IP destination is still " +
            packet.destinationIp +
            ".",
      undefined,
      routed ? ["sourceMac", "destinationMac"] : [],
    );
    traverse(path.hops, "data");
    if (target.kind === "host") {
      if (target.id !== destination.id)
        return drop(
          target,
          "destination",
          "This computer is not the IP destination and does not forward packets as a router.",
        );
      emit(
        { type: "delivered" },
        target,
        "Packet delivered to " + target.name,
        "The destination receives the ICMP echo request with TTL " +
          packet.ttl +
          ". This demonstration ends here; a reply would follow its own return journey.",
      );
      return { events, outcome: "delivered", errors: [] };
    }
    current = target;
  }
  return drop(current, "ttl", "The forwarding limit was reached.");
}
