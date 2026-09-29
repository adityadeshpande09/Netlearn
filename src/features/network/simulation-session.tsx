"use client";
import { useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";

import { ChevronRight, Check, AlertCircle } from "lucide-react";
import { PlaybackToolbar } from "./playback-toolbar";
import { simulatePacket } from "@/domain/networking/simulator";
import type {
  SimulationScenario,
  SimulationEvent,
} from "@/domain/networking/types";
import { PacketInspector } from "./packet-inspector";
import { DeviceInspector } from "./device-inspector";
import { usePlayback } from "./use-playback";
import type { CanvasProps } from "./topology-canvas";
import "./network.css";
const TopologyCanvas = dynamic(
  () => import("./topology-canvas").then((module) => module.TopologyCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="topology-loading" role="status">
        Loading the network canvas…
      </div>
    ),
  },
);
export function SimulationSession({
  scenario,
  canvas = {},
  children,
  renderTools,
}: {
  scenario: SimulationScenario;
  children?: ReactNode;
  renderTools?: (event: SimulationEvent | undefined) => ReactNode;
  canvas?: Omit<CanvasProps, "topology" | "event" | "playing" | "duration">;
}) {
  const result = useMemo(() => simulatePacket(scenario), [scenario]);
  const playback = usePlayback(result.events.length, JSON.stringify(scenario));
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const event = result.events[playback.index];
  const selectedId =
    canvas.selectedId ?? inspectedId ?? event?.deviceId ?? scenario.sourceId;
  const selected = scenario.devices.find((device) => device.id === selectedId);
  function select(id: string) {
    setInspectedId(id);
    canvas.onSelect?.(id);
  }
  return (
    <div className="simulation-session">
      <details className="simulation-guide">
        <summary>First time here? How to read the simulation</summary>
        <ol>
          <li>
            <strong>Follow the packet.</strong> Use Send packet for playback, or
            Next simulation step to move at your own pace.
          </li>
          <li>
            <strong>Look inside.</strong> The packet inspector explains the
            current headers. Expand a layer to see every field.
          </li>
          <li>
            <strong>Check the evidence.</strong> Select a device for its tables,
            or choose an event in the timeline to revisit a decision.
          </li>
        </ol>
        <p>
          Reset simulation rewinds the trace. It does not remove your devices or
          change their settings.
        </p>
      </details>
      {result.errors.length > 0 && (
        <div className="simulation-errors" role="alert">
          <strong>Check the network configuration</strong>
          <ul>
            {result.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      <PlaybackToolbar playback={playback} count={result.events.length} />
      <div className="simulation-main">
        <div className="simulation-visual">
          <TopologyCanvas
            topology={scenario}
            {...canvas}
            {...(event ? { event } : {})}
            selectedId={selectedId}
            onSelect={select}
            playing={playback.playing}
            duration={playback.duration}
          />
          {event && (
            <section
              className={
                "event-explanation " +
                (event.type === "dropped" ? "event-error" : "")
              }
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="event-symbol">
                {event.type === "delivered" ? (
                  <Check size={22} />
                ) : event.type === "dropped" ? (
                  <AlertCircle size={22} />
                ) : (
                  String(playback.index + 1).padStart(2, "0")
                )}
              </span>
              <div>
                <p className="eyebrow">
                  {event.type === "delivered"
                    ? "DELIVERED"
                    : event.type === "dropped"
                      ? "DELIVERY STOPPED"
                      : event.type.toUpperCase()}
                </p>
                <h2>{event.title}</h2>
                <p>{event.explanation}</p>
              </div>
            </section>
          )}
        </div>
        {event && <PacketInspector event={event} />}
      </div>
      {renderTools?.(event)}
      {children}
      <div className="inspect-device-control">
        <label htmlFor="inspect-device">Inspect a device</label>
        <select
          id="inspect-device"
          value={selectedId}
          onChange={(change) => select(change.target.value)}
        >
          {scenario.devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <p>Tables reflect the selected timeline step.</p>
      </div>
      {selected && (
        <DeviceInspector
          device={selected}
          tables={event?.tables ?? { arp: {}, mac: {} }}
        />
      )}
      {event && (
        <section
          className="simulation-timeline"
          aria-labelledby="timeline-heading"
        >
          <div className="subsection-heading">
            <div>
              <p className="eyebrow">EVERY DECISION, IN ORDER</p>
              <h2 id="timeline-heading">Journey timeline</h2>
            </div>
            <span>{result.events.length} events</span>
          </div>
          <ol>
            {result.events.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-current={index === playback.index ? "step" : undefined}
                  className={index === playback.index ? "current-event" : ""}
                  onClick={() => playback.goTo(index)}
                >
                  <span className="timeline-index mono">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {
                        scenario.devices.find(
                          (device) => device.id === item.deviceId,
                        )?.name
                      }{" "}
                      · {item.type === "decision" ? item.decision : item.type}
                    </small>
                  </span>
                  <ChevronRight size={17} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
