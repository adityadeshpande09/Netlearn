"use client";
import { Laptop, Network, Router } from "lucide-react";
import { SimulationSession } from "@/features/network/simulation-session";
import { DeviceEditor } from "./device-editor";
import { CableEditor } from "./cable-editor";
import { useNetworkWorkspace } from "./use-network-workspace";
export function NetworkPlayground() {
  const {
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
  } = useNetworkWorkspace();
  return (
    <>
      <section className="playground-controls" aria-label="Network setup">
        <div className="playground-palette">
          <label>
            Start with
            <select
              value={preset}
              onChange={(event) => loadPreset(event.target.value)}
            >
              <option value="routed">Two networks & a router</option>
              <option value="local">Two computers on a LAN</option>
              <option value="blank">Empty workspace</option>
            </select>
          </label>
          <button
            className="button button-secondary"
            type="button"
            disabled={topology.devices.length >= 8}
            onClick={() => addDevice("host")}
          >
            <Laptop size={16} /> Add computer
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={topology.devices.length >= 8}
            onClick={() => addDevice("switch")}
          >
            <Network size={16} /> Add switch
          </button>
          <button
            className="button button-secondary"
            type="button"
            disabled={topology.devices.length >= 8}
            onClick={() => addDevice("router")}
          >
            <Router size={16} /> Add router
          </button>
        </div>
        <div className="playground-packet-fields">
          <label>
            Source computer
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
            >
              <option value="">Choose a computer</option>
              {hosts.map((device) => (
                <option value={device.id} key={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Destination computer
            <select
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
            >
              <option value="">Choose a computer</option>
              {hosts.map((device) => (
                <option value={device.id} key={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </label>
          <label className="ttl-field">
            Initial TTL
            <input
              type="number"
              min={1}
              max={255}
              value={ttl}
              onChange={(event) => setTtl(Number(event.target.value))}
            />
          </label>
          <a href="#network-configuration" className="text-link">
            Configure devices & cables ↓
          </a>
          <p>
            Up to 8 devices. Each run starts with empty learning tables. This
            workspace lasts until you reload.
          </p>
        </div>
      </section>
      {error && (
        <p className="simulation-errors" role="alert">
          {error}
        </p>
      )}
      <p className="configuration-status" role="status">
        {message}
      </p>
      <SimulationSession
        scenario={scenario}
        canvas={{
          positions,
          selectedId,
          editable: true,
          onSelect: setSelectedId,
          onMove: move,
          onConnect: connectCanvas,
        }}
      >
        <div className="network-configuration" id="network-configuration">
          {selected ? (
            <DeviceEditor
              key={revision + ":" + selected.id}
              device={selected}
              onSave={saveDevice}
              onRemove={removeDevice}
            />
          ) : (
            <section>
              <p className="eyebrow">YOUR FIRST DEVICE</p>
              <h2>Add a computer to begin.</h2>
              <p>
                Add a second computer and a switch, connect their ports, then
                send a packet between the computers.
              </p>
            </section>
          )}
          <CableEditor
            key={revision}
            topology={topology}
            onConnect={connect}
            onRemove={(id) => {
              setTopology({
                ...topology,
                links: topology.links.filter((link) => link.id !== id),
              });
              setMessage("Cable removed. The journey has been recalculated.");
            }}
          />
        </div>
      </SimulationSession>
      <details className="lab-model-notes">
        <summary>Model boundaries & suggested experiments</summary>
        <p>
          Build a LAN, then connect a second network through a router. Remove a
          cable, clear a gateway, or lower TTL to see where delivery stops. The
          canvas and the forms edit the same network.
        </p>
        <p>
          This model uses Ethernet interfaces with /1–/30 prefixes, one VLAN per
          group of switches, one-way ICMP echo requests, and connected or static
          routes. It does not emulate NAT, DHCP, spanning tree, IPv6, or a Cisco
          CLI. Switch loops are detected and must be removed before simulation.
          Addresses must be distinct within this workspace.
        </p>
      </details>
    </>
  );
}
