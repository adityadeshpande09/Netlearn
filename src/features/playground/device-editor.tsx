import { useRef } from "react";
import { Save, Trash2 } from "lucide-react";
import type { NetworkDevice } from "@/domain/networking/types";
import { RouteEditor } from "./route-editor";
export function DeviceEditor({
  device,
  onSave,
  onRemove,
  onDraftChange,
}: {
  device: NetworkDevice;
  onSave: (device: NetworkDevice) => void;
  onRemove: () => void;
  onDraftChange: (dirty: boolean) => void;
}) {
  const drafts = useRef({ configuration: false, route: false });
  function markDraft(field: "configuration" | "route", dirty: boolean) {
    drafts.current[field] = dirty;
    onDraftChange(drafts.current.configuration || drafts.current.route);
  }
  return (
    <section>
      <p className="eyebrow">CONFIGURE A DEVICE</p>
      <h2>{device.name}</h2>
      <form
        onChange={() => markDraft("configuration", true)}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const updated: NetworkDevice = {
            ...device,
            name: String(form.get("name") ?? "").trim(),
            interfaces: device.interfaces.map((port) =>
              device.kind === "switch"
                ? port
                : {
                    ...port,
                    ipAddress: String(form.get(port.id + "-ip") ?? "").trim(),
                    prefixLength: Number(form.get(port.id + "-prefix")),
                  },
            ),
          };
          if (updated.kind === "host") {
            const gateway = String(form.get("gateway") ?? "").trim();
            if (gateway) updated.defaultGateway = gateway;
            else delete updated.defaultGateway;
          }
          onSave(updated);
          markDraft("configuration", false);
        }}
      >
        <label>
          Device name
          <input
            name="name"
            defaultValue={device.name}
            maxLength={40}
            required
          />
        </label>
        {device.kind !== "switch" &&
          device.interfaces.map((port) => (
            <fieldset key={port.id}>
              <legend>{port.name}</legend>
              <div className="port-fields">
                <label>
                  IPv4 address
                  <input
                    name={port.id + "-ip"}
                    defaultValue={port.ipAddress}
                    spellCheck={false}
                    required
                  />
                </label>
                <label>
                  Prefix
                  <input
                    name={port.id + "-prefix"}
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={port.prefixLength}
                    required
                  />
                </label>
              </div>
              <p>
                MAC <span className="mono">{port.macAddress}</span>
              </p>
            </fieldset>
          ))}
        {device.kind === "host" && (
          <label>
            Default gateway
            <input
              name="gateway"
              defaultValue={device.defaultGateway ?? ""}
              placeholder="Optional for local delivery"
              spellCheck={false}
            />
          </label>
        )}
        {device.kind === "switch" && (
          <p>
            This switch bridges its four ports in one VLAN. Connect devices to
            free ports using the cable form.
          </p>
        )}
        <div className="configuration-actions">
          <button className="button" type="submit">
            <Save size={16} /> Apply configuration
          </button>
          <button className="danger-button" type="button" onClick={onRemove}>
            <Trash2 size={14} /> Remove device
          </button>
        </div>
      </form>
      {device.kind === "router" && (
        <RouteEditor
          router={device}
          onSave={onSave}
          onDraftChange={(dirty) => markDraft("route", dirty)}
        />
      )}
    </section>
  );
}
