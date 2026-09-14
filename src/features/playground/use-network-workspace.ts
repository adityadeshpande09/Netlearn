import { useCallback, useMemo, useRef, useState } from "react";
import type { Connection } from "@xyflow/react";
import {
  localTopology,
  makeDevice,
  routedTopology,
} from "@/domain/networking/scenarios";
import type { Endpoint, NetworkDevice } from "@/domain/networking/types";
import { endpointKey } from "@/domain/networking/topology";
import {
  initialPositions,
  type Point,
  type Positions,
} from "@/features/network/topology-layout";
export function useNetworkWorkspace() {
  const [topology, setTopology] = useState(routedTopology);
  const [positions, setPositions] = useState<Positions>(initialPositions);
  const [selectedId, setSelectedId] = useState("pc-a");
  const [sourceId, setSourceId] = useState("pc-a");
  const [destinationId, setDestinationId] = useState("pc-b");
  const [ttl, setTtl] = useState(64);
  const [revision, setRevision] = useState(0);
  const [preset, setPreset] = useState("routed");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const sequence = useRef(6);
  const selected = topology.devices.find((device) => device.id === selectedId);
  const hosts = topology.devices.filter((device) => device.kind === "host");
  const scenario = useMemo(
    () => ({ ...topology, sourceId, destinationId, ttl }),
    [topology, sourceId, destinationId, ttl],
  );
  function loadPreset(value: string) {
    setPreset(value);
    setRevision((current) => current + 1);
    setTopology(
      value === "local"
        ? localTopology()
        : value === "blank"
          ? { devices: [], links: [] }
          : routedTopology(),
    );
    setPositions(initialPositions);
    setSelectedId(value === "blank" ? "" : "pc-a");
    setSourceId(value === "blank" ? "" : "pc-a");
    setDestinationId(value === "blank" ? "" : "pc-b");
    setError("");
    setMessage("Example loaded. Configure the network or send a packet.");
  }
  function addDevice(kind: NetworkDevice["kind"]) {
    if (topology.devices.length >= 8) return;
    const device = makeDevice(kind, sequence.current++);
    setTopology({ ...topology, devices: [...topology.devices, device] });
    setPositions({
      ...positions,
      [device.id]: {
        x: (topology.devices.length % 3) * 245,
        y: Math.floor(topology.devices.length / 3) * 210 + 35,
      },
    });
    setSelectedId(device.id);
    if (kind === "host") {
      if (!sourceId) setSourceId(device.id);
      else if (!destinationId) setDestinationId(device.id);
    }
    setMessage(
      device.name + " added. Configure its address and connect a free port.",
    );
    setError("");
  }
  function saveDevice(device: NetworkDevice) {
    setTopology({
      ...topology,
      devices: topology.devices.map((item) =>
        item.id === device.id ? device : item,
      ),
    });
    setMessage(
      device.name +
        " configuration applied. The journey has been recalculated.",
    );
    setError("");
  }
  function removeDevice() {
    if (!selected) return;
    const devices = topology.devices.filter(
      (device) => device.id !== selectedId,
    );
    setTopology({
      devices,
      links: topology.links.filter(
        (link) =>
          link.source.deviceId !== selectedId &&
          link.target.deviceId !== selectedId,
      ),
    });
    setSelectedId(devices[0]?.id ?? "");
    if (sourceId === selectedId) setSourceId("");
    if (destinationId === selectedId) setDestinationId("");
    setMessage(selected.name + " and its cables removed.");
  }
  function connect(source: Endpoint, target: Endpoint) {
    if (source.deviceId === target.deviceId) {
      setError("Connect ports on two different devices.");
      return false;
    }
    const used = new Set(
      topology.links.flatMap((link) => [
        endpointKey(link.source),
        endpointKey(link.target),
      ]),
    );
    if (used.has(endpointKey(source)) || used.has(endpointKey(target))) {
      setError("That port already has a cable. Choose a free port.");
      return false;
    }
    setTopology({
      ...topology,
      links: [
        ...topology.links,
        { id: "cable-" + sequence.current++, source, target },
      ],
    });
    setMessage("Cable connected. The journey has been recalculated.");
    setError("");
    return true;
  }
  function connectCanvas(connection: Connection) {
    if (
      connection.source &&
      connection.target &&
      connection.sourceHandle &&
      connection.targetHandle
    )
      connect(
        { deviceId: connection.source, interfaceId: connection.sourceHandle },
        { deviceId: connection.target, interfaceId: connection.targetHandle },
      );
  }
  const move = useCallback(
    (id: string, position: Point) =>
      setPositions((current) => ({ ...current, [id]: position })),
    [],
  );

  return {
    revision,
    topology,
    setTopology,
    positions,
    selectedId,
    setSelectedId,
    sourceId,
    setSourceId,
    destinationId,
    setDestinationId,
    ttl,
    setTtl,
    preset,
    message,
    setMessage,
    error,
    selected,
    hosts,
    scenario,
    loadPreset,
    addDevice,
    saveDevice,
    removeDevice,
    connect,
    connectCanvas,
    move,
  };
}
