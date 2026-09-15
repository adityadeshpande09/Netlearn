import { makeDevice } from "@/domain/networking/scenarios";
import type { NetworkDevice, NetworkTopology } from "@/domain/networking/types";

export function nextWorkspaceDevice(
  topology: NetworkTopology,
  kind: NetworkDevice["kind"],
) {
  const ids = new Set(topology.devices.map((device) => device.id));
  const macs = new Set(
    topology.devices.flatMap((device) =>
      device.interfaces.map((port) => port.macAddress.toLowerCase()),
    ),
  );
  // Loaded presets rename their IDs, so their MAC addresses must also be checked.
  for (let sequence = 6; sequence < 256; sequence++) {
    const device = makeDevice(kind, sequence);
    if (
      !ids.has(device.id) &&
      device.interfaces.every(
        (port) => !macs.has(port.macAddress.toLowerCase()),
      )
    )
      return device;
  }
  throw new Error("No available device identifier in this workspace.");
}
export function nextCableId(topology: NetworkTopology) {
  const ids = new Set(topology.links.map((link) => link.id));
  let sequence = 1;
  while (ids.has(`cable-${sequence}`)) sequence++;
  return `cable-${sequence}`;
}
