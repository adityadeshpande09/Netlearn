import {
  Laptop,
  Printer,
  Network,
  Router,
  Server,
  ArrowRight,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lesson } from "@/content/model";
import { ProtocolDiagram } from "./protocol-diagrams";
function Device({
  icon: Icon,
  name,
  detail,
}: {
  icon: LucideIcon;
  name: string;
  detail: string;
}) {
  return (
    <div className="diagram-device">
      <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
      <strong>{name}</strong>
      <span>{detail}</span>
    </div>
  );
}
export function LessonDiagram({ type }: { type: Lesson["diagram"] }) {
  if (type === "arp" || type === "echo" || type === "subnet")
    return <ProtocolDiagram type={type} />;
  if (type === "addresses")
    return (
      <figure className="lesson-diagram">
        <p className="diagram-eyebrow">TWO ADDRESSES. TWO DIFFERENT JOBS.</p>
        <div className="frame-envelope">
          <p>
            ETHERNET FRAME <span>Local delivery</span>
          </p>
          <div className="address-pair">
            <span>Your laptop&apos;s MAC</span>
            <ArrowRight size={17} />
            <strong>Gateway&apos;s MAC</strong>
          </div>
          <div className="ip-envelope">
            <p>
              IP PACKET <span>Final destination</span>
            </p>
            <div className="address-pair">
              <span>192.168.1.10</span>
              <ArrowRight size={17} />
              <strong>10.0.0.20</strong>
            </div>
          </div>
        </div>
        <figcaption>
          The gateway receives the frame. The remote server remains the
          packet&apos;s destination.
        </figcaption>
      </figure>
    );
  if (type === "router")
    return (
      <figure className="lesson-diagram">
        <p className="diagram-eyebrow">
          DESTINATION <span className="mono">10.0.0.20</span>
        </p>
        <table className="diagram-table">
          <caption>Which route matches most specifically?</caption>
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            <tr className="selected-route">
              <td>
                <span className="mono">10.0.0.0/24</span>
              </td>
              <td>
                <Check size={15} /> Selected · most specific
              </td>
            </tr>
            <tr>
              <td className="mono">10.0.0.0/8</td>
              <td>A broader match</td>
            </tr>
            <tr>
              <td className="mono">0.0.0.0/0</td>
              <td>Default fallback</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          A longer matching prefix identifies a smaller destination range.
        </figcaption>
      </figure>
    );
  if (type === "switch")
    return (
      <figure className="lesson-diagram">
        <p className="diagram-eyebrow">A SWITCH LEARNS WHO IS WHERE</p>
        <div className="diagram-flow">
          <Device icon={Laptop} name="Laptop" detail="Port 1" />
          <ArrowRight size={20} />
          <Device icon={Network} name="Switch" detail="One VLAN" />
          <ArrowRight size={20} />
          <Device icon={Printer} name="Printer" detail="Port 2" />
        </div>
        <table className="diagram-table">
          <caption>Example learned MAC table · VLAN 10</caption>
          <thead>
            <tr>
              <th scope="col">Source seen</th>
              <th scope="col">Learned port</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Laptop&apos;s MAC</td>
              <td>Port 1</td>
            </tr>
            <tr>
              <td>Printer&apos;s MAC</td>
              <td>Port 2</td>
            </tr>
          </tbody>
        </table>
        <figcaption>
          Learn from the source address. Forward using the destination address.
        </figcaption>
      </figure>
    );
  const journey = type === "journey";
  return (
    <figure className="lesson-diagram">
      <p className="diagram-eyebrow">
        {journey ? "ONE PACKET. TWO LOCAL DELIVERIES." : "ONE LOCAL NETWORK"}
      </p>
      <div className="diagram-flow">
        <Device
          icon={Laptop}
          name="Laptop"
          detail={journey ? "192.168.1.10/24" : "Requests a service"}
        />
        <ArrowRight size={20} />
        <Device
          icon={journey ? Router : Network}
          name={journey ? "Router" : "Switch"}
          detail={journey ? "Connects the subnets" : "Connects the devices"}
        />
        <ArrowRight size={20} />
        <Device
          icon={journey ? Server : Printer}
          name={journey ? "Server" : "Printer"}
          detail={journey ? "10.0.0.20/24" : "Provides a service"}
        />
      </div>
      {journey && (
        <div className="journey-facts">
          <span>
            IP endpoints stay the same{" "}
            <small>In this example without NAT</small>
          </span>
          <span>
            Example TTL: 64 → 63 <small>One forwarding router</small>
          </span>
        </div>
      )}
      <figcaption>
        {journey
          ? "The router creates a new Ethernet frame for the outgoing network. Local switches are omitted from this diagram."
          : "A local printing service can work without an internet connection."}
      </figcaption>
    </figure>
  );
}
