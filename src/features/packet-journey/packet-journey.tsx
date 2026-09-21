"use client";
import { useMemo, useState } from "react";
import { packetJourneyScenario } from "@/domain/networking/scenarios";
import { SimulationSession } from "@/features/network/simulation-session";
export function PacketJourney() {
  const [experiment, setExperiment] = useState("normal");
  const scenario = useMemo(() => {
    const value = packetJourneyScenario();
    if (experiment === "ttl") value.ttl = 1;
    if (experiment === "gateway") {
      const source = value.devices.find(
        (device) => device.id === value.sourceId,
      );
      if (source?.kind === "host") delete source.defaultGateway;
    }
    return value;
  }, [experiment]);
  return (
    <>
      <div className="lab-experiment">
        <label htmlFor="journey-experiment">Try a scenario</label>
        <select
          id="journey-experiment"
          value={experiment}
          onChange={(event) => setExperiment(event.target.value)}
        >
          <option value="normal">A packet crosses two networks</option>
          <option value="gateway">What if the gateway is missing?</option>
          <option value="ttl">What if TTL starts at 1?</option>
        </select>
        <p>
          PC-A <span className="mono">192.168.1.10</span> → PC-B{" "}
          <span className="mono">10.0.0.20</span>
        </p>
      </div>
      <SimulationSession key={experiment} scenario={scenario} />
      <details className="lab-model-notes">
        <summary>What this model includes</summary>
        <p>
          One ICMP echo request across Ethernet links, one VLAN per connected
          group of switches, empty ARP and MAC tables at the start, directly
          connected routes, and one forwarding router. ARP broadcasts stay
          local. Switches learn source MAC addresses. The router changes the
          Ethernet header, TTL, and IPv4 header checksum while preserving the IP
          endpoints and ICMP message. Expand the packet inspector to see field
          sizes, explanations, and hexadecimal bytes. The fixed payload is
          “NetLearn”; both IPv4 and ICMP checksums are computed from the modeled
          bytes.
        </p>
        <p>
          This is a teaching model. It does not send real network traffic or
          model a reply, NAT, packet corruption, queues, spanning tree, or
          protocol timing. Use the Playground to change the topology and
          addressing.
        </p>
      </details>
    </>
  );
}
