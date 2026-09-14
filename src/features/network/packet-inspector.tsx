import type { SimulationEvent } from "@/domain/networking/types";
export function PacketInspector({ event }: { event: SimulationEvent }) {
  const { packet, frame, changed } = event;
  return (
    <section
      className="packet-inspector"
      aria-labelledby="packet-inspector-heading"
    >
      <div className="inspector-heading">
        <p className="eyebrow">INSIDE THE JOURNEY</p>
        <h2 id="packet-inspector-heading">Packet inspector</h2>
      </div>
      <div className="inspector-layer">
        <h3>
          Ethernet{" "}
          <span>
            {frame?.payload === "arp"
              ? "ARP frame"
              : frame
                ? "IPv4 frame"
                : "No current frame"}
          </span>
        </h3>
        <dl>
          <div className={changed.includes("sourceMac") ? "field-changed" : ""}>
            <dt>
              Source MAC {changed.includes("sourceMac") && <span>Changed</span>}
            </dt>
            <dd>{frame?.sourceMac ?? "—"}</dd>
          </div>
          <div
            className={
              changed.includes("destinationMac") ? "field-changed" : ""
            }
          >
            <dt>
              Destination MAC{" "}
              {changed.includes("destinationMac") && <span>Changed</span>}
            </dt>
            <dd>{frame?.destinationMac ?? "—"}</dd>
          </div>
        </dl>
      </div>
      <div className="inspector-layer ip-layer">
        <h3>
          IPv4{" "}
          <span>
            {frame?.payload === "arp" ? "Waiting for ARP" : "ICMP echo request"}
          </span>
        </h3>
        <dl>
          <div>
            <dt>Source IP</dt>
            <dd>{packet.sourceIp}</dd>
          </div>
          <div>
            <dt>Destination IP</dt>
            <dd>{packet.destinationIp}</dd>
          </div>
          <div className={changed.includes("ttl") ? "field-changed" : ""}>
            <dt>TTL {changed.includes("ttl") && <span>Changed</span>}</dt>
            <dd>{packet.ttl}</dd>
          </div>
        </dl>
      </div>
      <p className="inspector-note">
        MAC addresses describe the current local delivery. IP addresses identify
        the endpoints in this example without NAT.
      </p>
    </section>
  );
}
