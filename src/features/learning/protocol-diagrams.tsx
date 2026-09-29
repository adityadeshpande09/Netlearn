import { ArrowDown, ArrowRight, ArrowLeft } from "lucide-react";
import styles from "./protocol-diagrams.module.css";

function ArpDiagram() {
  return (
    <figure className="lesson-diagram">
      <p className="diagram-eyebrow">RESOLVE THE LOCAL NEXT HOP</p>
      <ol className={styles.exchange}>
        <li>
          <strong>1 · Request on the laptop&apos;s LAN</strong>
          <span className={styles.direction}>
            <span>Laptop</span>
            <ArrowRight size={18} aria-hidden="true" />
            <span>Ethernet broadcast</span>
          </span>
          <p>Who has 192.168.1.1? Tell 192.168.1.10.</p>
          <small>
            Ethernet destination: FF:FF:FF:FF:FF:FF · ARP operation 1
          </small>
        </li>
        <li>
          <strong>2 · Reply directly to the laptop</strong>
          <span className={styles.direction}>
            <span>Laptop</span>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>Gateway</span>
          </span>
          <p>192.168.1.1 is at 02:00:00:00:01:01.</p>
          <small>
            Ethernet destination: laptop&apos;s MAC · ARP operation 2
          </small>
        </li>
      </ol>
      <div className={styles.result}>
        <ArrowDown size={18} aria-hidden="true" />
        <p>
          Send the waiting IPv4 packet to the gateway&apos;s MAC.
          <strong>Its destination IP is still 10.0.0.20.</strong>
        </p>
      </div>
      <figcaption>
        One local exchange, with an illustrative gateway MAC. The request is
        broadcast; the ordinary reply is unicast. The remote server is not this
        ARP exchange&apos;s target.
      </figcaption>
    </figure>
  );
}

function EchoDiagram() {
  return (
    <figure className="lesson-diagram">
      <p className="diagram-eyebrow">PING NEEDS TWO DIRECTIONS</p>
      <ol className={styles.exchange}>
        <li>
          <strong>Echo request · type 8, code 0</strong>
          <span className={styles.direction}>
            <span>From 192.168.1.10</span>
            <ArrowRight size={18} aria-hidden="true" />
            <span>To 10.0.0.20</span>
          </span>
          <p>Identifier 42 · sequence 1 · data: NetLearn</p>
        </li>
        <li>
          <strong>Echo reply · type 0, code 0</strong>
          <span className={styles.direction}>
            <span>To 192.168.1.10</span>
            <ArrowLeft size={18} aria-hidden="true" />
            <span>From 10.0.0.20</span>
          </span>
          <p>Identifier 42 · sequence 1 · data: NetLearn</p>
        </li>
      </ol>
      <div className={styles.result}>
        <p>
          Both messages travel inside IPv4 with Protocol = 1.
          <strong>The reply needs a working route back.</strong>
        </p>
      </div>
      <figcaption>
        A conceptual complete echo exchange; intermediate routers are omitted.
        Packet Journey currently simulates only the request, not this reply or
        round-trip timing.
      </figcaption>
    </figure>
  );
}

function SubnetDiagram() {
  return (
    <figure className="lesson-diagram">
      <p className="diagram-eyebrow">ONE /24 BECOMES FOUR /26 BLOCKS</p>
      <p className={styles.rangeIntro}>
        Within <span className="mono">192.168.10.0/24</span>, group the final
        octet into blocks of 64 addresses:
      </p>
      <ol className={styles.blocks}>
        <li>
          <strong>0–63</strong>
          <span>First /26</span>
        </li>
        <li className={styles.selectedBlock}>
          <strong>64–127</strong>
          <span>Contains .70</span>
        </li>
        <li>
          <strong>128–191</strong>
          <span>Contains .130</span>
        </li>
        <li>
          <strong>192–255</strong>
          <span>Fourth /26</span>
        </li>
      </ol>
      <table className={`diagram-table ${styles.rangeTable}`}>
        <caption>192.168.10.70/26 · mask 255.255.255.192</caption>
        <tbody>
          <tr>
            <th scope="row">Network</th>
            <td>192.168.10.64</td>
          </tr>
          <tr>
            <th scope="row">First host</th>
            <td>192.168.10.65</td>
          </tr>
          <tr>
            <th scope="row">Last host</th>
            <td>192.168.10.126</td>
          </tr>
          <tr>
            <th scope="row">Broadcast</th>
            <td>192.168.10.127</td>
          </tr>
          <tr>
            <th scope="row">Usable hosts</th>
            <td>62 of 64 addresses</td>
          </tr>
        </tbody>
      </table>
      <figcaption>
        Six host bits give 64 addresses. This ordinary /26 reserves its first
        and last addresses. The labeled blocks put .70 and .130 in different
        subnets, even though their first three octets match.
      </figcaption>
    </figure>
  );
}

export function ProtocolDiagram({ type }: { type: "arp" | "echo" | "subnet" }) {
  if (type === "arp") return <ArpDiagram />;
  if (type === "echo") return <EchoDiagram />;
  return <SubnetDiagram />;
}
