import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Laptop, Network, Router } from "lucide-react";
import type { NetworkDevice } from "@/domain/networking/types";
export type DeviceNode = Node<
  { device: NetworkDevice; active: boolean; editable: boolean },
  "networkDevice"
>;
const positions = [
  Position.Left,
  Position.Right,
  Position.Top,
  Position.Bottom,
];
export function NetworkDeviceNode({ data, selected }: NodeProps<DeviceNode>) {
  const device = data.device;
  const Icon =
    device.kind === "host"
      ? Laptop
      : device.kind === "router"
        ? Router
        : Network;
  return (
    <div
      className={
        "topology-device " +
        (data.active ? "is-active " : "") +
        (selected ? "is-selected" : "")
      }
    >
      <div className="topology-device-heading">
        <Icon size={23} strokeWidth={1.6} />
        <span>
          {device.kind === "host" ? "COMPUTER" : device.kind.toUpperCase()}
        </span>
        {data.active && <span className="device-active-label">ACTIVE</span>}
      </div>
      <strong>{device.name}</strong>
      {device.kind === "switch" ? (
        <p>One VLAN · {device.interfaces.length} ports</p>
      ) : (
        device.interfaces.map((port) => (
          <p key={port.id} className="mono">
            {device.kind === "router" && <span>{port.name} </span>}
            {port.ipAddress}/{port.prefixLength}
          </p>
        ))
      )}
      {device.interfaces.map((port, index) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={positions[index] ?? Position.Bottom}
          isConnectable={data.editable}
          title={device.name + " · " + port.name}
        />
      ))}
    </div>
  );
}
