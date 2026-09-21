import type { SimulationEvent } from "@/domain/networking/types";
import {
  serializeEthernetHeader,
  serializeArpHeader,
} from "@/domain/networking/packet-headers";
import { PacketLayer, hex } from "./packet-fields";
import { InternetPacketLayers } from "./internet-packet-layers";

export function PacketInspector({ event }: { event: SimulationEvent }) {
  const { headers, changed } = event;
  const { ethernet, arp, frameContext } = headers;
  return (
    <section
      className="packet-inspector"
      aria-labelledby="packet-inspector-heading"
    >
      <div className="inspector-heading">
        <p className="eyebrow">INSIDE THE JOURNEY</p>
        <h2 id="packet-inspector-heading">Packet inspector</h2>
        <p className="packet-step-context">
          {event.type === "dropped"
            ? "Delivery stopped · inspect the final state"
            : frameContext === "last"
              ? "Last observed frame · no new transmission"
              : ethernet
                ? "Frame at this step"
                : "Inside the device · no Ethernet frame"}
        </p>
      </div>
      <div className="packet-layers">
        {ethernet ? (
          <PacketLayer
            title="Ethernet"
            subtitle="Link layer · 14-byte header"
            className="ethernet-layer"
            explanation="MAC addresses identify the sender and next receiver on this local link. A router builds a new frame for the next network."
            fields={[
              {
                label: "Source MAC",
                value: ethernet.sourceMac,
                bits: 48,
                changed: changed.includes("sourceMac"),
              },
              {
                label: "Destination MAC",
                value: ethernet.destinationMac,
                bits: 48,
                changed: changed.includes("destinationMac"),
              },
            ]}
            more={[
              {
                label: "EtherType",
                value: hex(ethernet.etherType) + (arp ? " · ARP" : " · IPv4"),
                bits: 16,
                help: "Identifies the protocol carried directly inside this Ethernet II frame.",
              },
            ]}
            bytes={serializeEthernetHeader(ethernet)}
            byteLabel="14 Ethernet II header bytes · destination, source, EtherType"
          />
        ) : (
          <section
            className="inspector-layer ethernet-layer"
            aria-label="Ethernet header"
          >
            <h3>
              Ethernet <span>No current frame</span>
            </h3>
            <p className="packet-layer-explanation">
              The device is working with the IP packet. There is no Ethernet
              header at this step.
            </p>
          </section>
        )}
        {arp && (
          <PacketLayer
            title="ARP"
            subtitle={
              (arp.operation === 1 ? "Request" : "Reply") + " · 28 bytes"
            }
            className="arp-layer"
            explanation={
              event.type === "dropped"
                ? "This was the last ARP frame before delivery stopped. ARP is carried directly by Ethernet; the undelivered IPv4 packet is separate."
                : "ARP is carried directly by Ethernet. The IPv4 packet is waiting; it is not inside this ARP frame."
            }
            fields={[
              {
                label: "Operation",
                value:
                  arp.operation +
                  (arp.operation === 1 ? " · Request" : " · Reply"),
                bits: 16,
              },
              { label: "Sender IP", value: arp.senderIp, bits: 32 },
              {
                label: "Target IP",
                value: arp.targetIp,
                bits: 32,
                help: "The local next hop being resolved, which can be a gateway rather than the final IP destination.",
              },
            ]}
            more={[
              { label: "Sender MAC", value: arp.senderMac, bits: 48 },
              {
                label: "Target MAC",
                value: arp.targetMac,
                bits: 48,
                help:
                  arp.operation === 1
                    ? "Unknown in this request: all zeros. The Ethernet destination is broadcast; this field is not."
                    : "The MAC address of the host or router that asked.",
              },
              {
                label: "Hardware type",
                value: arp.hardwareType + " · Ethernet",
                bits: 16,
              },
              {
                label: "Protocol type",
                value: hex(arp.protocolType) + " · IPv4",
                bits: 16,
              },
              {
                label: "Hardware address length",
                value: arp.hardwareLength + " bytes",
                bits: 8,
              },
              {
                label: "Protocol address length",
                value: arp.protocolLength + " bytes",
                bits: 8,
              },
            ]}
            bytes={serializeArpHeader(arp)}
            byteLabel="28 ARP message bytes · network order · ARP has no checksum field"
          />
        )}
        {arp ? (
          <details className="pending-packet">
            <summary>
              {event.type === "dropped"
                ? "Inspect undelivered IPv4 packet"
                : "Inspect waiting IPv4 packet"}
            </summary>
            <InternetPacketLayers event={event} waiting />
          </details>
        ) : (
          <InternetPacketLayers event={event} />
        )}
      </div>
      <p className="inspector-note">
        One modeled echo request, not a live capture. Expand a layer for field
        sizes and explanations. Ethernet padding, preamble and frame check
        sequence (FCS) are omitted from this view.
      </p>
    </section>
  );
}
