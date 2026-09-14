"use client";
import { useCallback, useMemo } from "react";
import {
  Background,
  ConnectionMode,
  Controls,
  ReactFlow,
  type Connection,
  type NodeChange,
} from "@xyflow/react";
import type {
  NetworkTopology,
  SimulationEvent,
} from "@/domain/networking/types";
import { NetworkDeviceNode, type DeviceNode } from "./network-device-node";
import { PacketEdge, type PacketEdgeType } from "./packet-edge";
import { useReducedMotionPreference } from "@/components/motion/use-reduced-motion-preference";
import "@xyflow/react/dist/style.css";
import {
  initialPositions,
  type Point,
  type Positions,
} from "./topology-layout";
const nodeTypes = { networkDevice: NetworkDeviceNode };
const edgeTypes = { packet: PacketEdge };
export interface CanvasProps {
  topology: NetworkTopology;
  positions?: Positions;
  event?: SimulationEvent;
  playing?: boolean;
  duration?: number;
  selectedId?: string;
  editable?: boolean;
  onSelect?: (id: string) => void;
  onMove?: (id: string, position: Point) => void;
  onConnect?: (connection: Connection) => void;
}
export function TopologyCanvas({
  topology,
  positions = initialPositions,
  event,
  playing = false,
  duration = 1600,
  selectedId,
  editable = false,
  onSelect,
  onMove,
  onConnect,
}: CanvasProps) {
  const reduce = useReducedMotionPreference();
  const nodes: DeviceNode[] = useMemo(
    () =>
      topology.devices.map((device, index) => ({
        id: device.id,
        type: "networkDevice",
        position: positions[device.id] ?? {
          x: (index % 3) * 245,
          y: Math.floor(index / 3) * 200,
        },
        data: { device, active: event?.deviceId === device.id, editable },
        selected: selectedId === device.id,
        ariaLabel:
          device.name +
          ", " +
          device.kind +
          (device.kind !== "switch"
            ? ", " +
              device.interfaces
                .map((port) => port.ipAddress + "/" + port.prefixLength)
                .join(", ")
            : ""),
        draggable: editable,
      })),
    [topology.devices, positions, event?.deviceId, selectedId, editable],
  );
  const edges: PacketEdgeType[] = useMemo(
    () =>
      topology.links.map((link) => ({
        id: link.id,
        source: link.source.deviceId,
        target: link.target.deviceId,
        sourceHandle: link.source.interfaceId,
        targetHandle: link.target.interfaceId,
        type: "packet",
        animated: playing && !reduce && event?.linkId === link.id,
        data: {
          active: event?.linkId === link.id,
          playing,
          duration,
          reduce,
          reverse: event?.deviceId === link.source.deviceId,
          eventId: event?.id ?? "initial",
        },
        ariaLabel:
          "Cable from " +
          link.source.deviceId +
          " " +
          link.source.interfaceId +
          " to " +
          link.target.deviceId +
          " " +
          link.target.interfaceId,
      })),
    [topology.links, event, playing, duration, reduce],
  );
  const handleChanges = useCallback(
    (changes: NodeChange<DeviceNode>[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position)
          onMove?.(change.id, change.position);
        if (change.type === "select" && change.selected) onSelect?.(change.id);
      }
    },
    [onMove, onSelect],
  );
  return (
    <div
      role="group"
      className="topology-canvas"
      aria-label={
        editable ? "Editable network topology" : "Packet journey topology"
      }
    >
      <ReactFlow<DeviceNode, PacketEdgeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        onNodesChange={handleChanges}
        onNodeClick={(_, node) => onSelect?.(node.id)}
        {...(onConnect ? { onConnect } : {})}
        nodesConnectable={editable}
        nodesDraggable={editable}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.25}
        maxZoom={1.7}
        colorMode="light"
        preventScrolling={false}
        zoomOnScroll={false}
        ariaLabelConfig={{
          "controls.zoomIn.ariaLabel": "Zoom in on network",
          "controls.zoomOut.ariaLabel": "Zoom out of network",
          "controls.fitView.ariaLabel": "Fit network in view",
        }}
      >
        <Background gap={22} size={1} color="var(--border)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <p className="topology-keyboard-note">
        {editable
          ? "Drag devices and connect ports, or use the forms below."
          : "Select a device to inspect it. Zoom or pan to read the diagram."}
      </p>
    </div>
  );
}
