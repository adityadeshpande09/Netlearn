import { useRef, useState } from "react";
import { Cable, Unplug } from "lucide-react";
import type {
  Endpoint,
  NetworkLink,
  NetworkTopology,
} from "@/domain/networking/types";
import { endpointKey } from "@/domain/networking/topology";
export function CableEditor({
  topology,
  onConnect,
  onRemove,
}: {
  topology: NetworkTopology;
  onConnect: (source: Endpoint, target: Endpoint) => boolean;
  onRemove: (id: string) => void;
}) {
  const firstPortRef = useRef<HTMLSelectElement>(null);
  const [firstPort, setFirstPort] = useState("");
  const [secondPort, setSecondPort] = useState("");
  const used = new Set(
    topology.links.flatMap((link) => [
      endpointKey(link.source),
      endpointKey(link.target),
    ]),
  );
  const ports = topology.devices.flatMap((device) =>
    device.interfaces.map((port) => ({
      endpoint: { deviceId: device.id, interfaceId: port.id },
      label: device.name + " · " + port.name,
    })),
  );
  const name = (endpoint: Endpoint) =>
    ports.find((port) => endpointKey(port.endpoint) === endpointKey(endpoint))
      ?.label ?? "Missing port";
  function connect(form: FormData) {
    const source = ports.find(
      (port) => endpointKey(port.endpoint) === form.get("cable-source"),
    );
    const target = ports.find(
      (port) => endpointKey(port.endpoint) === form.get("cable-target"),
    );
    if (source && target && onConnect(source.endpoint, target.endpoint)) {
      setFirstPort("");
      setSecondPort("");
    }
  }
  return (
    <section>
      <p className="eyebrow">CONNECT THE NETWORK</p>
      <h2>Cables & ports</h2>
      <p>
        Each Ethernet port holds one cable. The connection works in both
        directions.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          connect(new FormData(event.currentTarget));
        }}
      >
        <label>
          First port
          <select
            ref={firstPortRef}
            name="cable-source"
            value={
              used.has(firstPort) ||
              !ports.some((p) => endpointKey(p.endpoint) === firstPort)
                ? ""
                : firstPort
            }
            onChange={(event) => setFirstPort(event.target.value)}
            required
          >
            <option value="" disabled>
              Choose a free port
            </option>
            {ports.map((port) => (
              <option
                key={endpointKey(port.endpoint)}
                value={endpointKey(port.endpoint)}
                disabled={used.has(endpointKey(port.endpoint))}
              >
                {port.label}
                {used.has(endpointKey(port.endpoint)) ? " — connected" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Second port
          <select
            name="cable-target"
            value={
              used.has(secondPort) ||
              !ports.some((p) => endpointKey(p.endpoint) === secondPort)
                ? ""
                : secondPort
            }
            onChange={(event) => setSecondPort(event.target.value)}
            required
          >
            <option value="" disabled>
              Choose a free port
            </option>
            {ports.map((port) => (
              <option
                key={endpointKey(port.endpoint)}
                value={endpointKey(port.endpoint)}
                disabled={used.has(endpointKey(port.endpoint))}
              >
                {port.label}
                {used.has(endpointKey(port.endpoint)) ? " — connected" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-secondary" type="submit">
          <Cable size={17} /> Connect ports
        </button>
      </form>
      <div className="connection-divider" />
      {topology.links.length ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const id = new FormData(event.currentTarget).get("remove-cable");
            if (typeof id === "string") {
              if (topology.links.length === 1) firstPortRef.current?.focus();
              onRemove(id);
            }
          }}
        >
          <label>
            Connected cable
            <select name="remove-cable">
              {topology.links.map((link: NetworkLink) => (
                <option key={link.id} value={link.id}>
                  {name(link.source)} ↔ {name(link.target)}
                </option>
              ))}
            </select>
          </label>
          <button className="danger-button" type="submit">
            <Unplug size={15} /> Remove cable
          </button>
        </form>
      ) : (
        <p>No cables connected yet.</p>
      )}
    </section>
  );
}
