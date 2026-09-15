import { expect, it } from "vitest";
import { makeDevice, routedTopology } from "@/domain/networking/scenarios";
import {
  nextCableId,
  nextWorkspaceDevice,
} from "@/features/playground/workspace-identifiers";

it("new devices avoid both saved IDs and MACs even after a device has been renamed", () => {
  const topology = routedTopology();
  const existing = makeDevice("host", 6);
  existing.id = "renamed-computer";
  topology.devices.push(existing);
  const next = nextWorkspaceDevice(topology, "switch");
  expect(next.id).toBe("switch-7");
  const macs = topology.devices.flatMap((device) =>
    device.interfaces.map((port) => port.macAddress),
  );
  expect(next.interfaces.every((port) => !macs.includes(port.macAddress))).toBe(
    true,
  );
});
it("new cables never reuse an existing loaded cable ID", () => {
  const topology = routedTopology();
  topology.links[0]!.id = "cable-1";
  topology.links[1]!.id = "cable-2";
  expect(nextCableId(topology)).toBe("cable-3");
});
