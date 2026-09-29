"use client";
import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { runHostCommand } from "@/domain/networking/host-commands";
import type { NetworkTopology, TableSnapshot } from "@/domain/networking/types";
import styles from "./host-terminal.module.css";

type Entry = { command: string; output: string };
type Session = { entries: Entry[]; tables?: TableSnapshot };
const emptySession: Session = { entries: [] };

export function HostTerminal({
  topology,
  selectedId,
  tables,
  onSelect,
}: {
  topology: NetworkTopology;
  selectedId: string;
  tables: TableSnapshot;
  onSelect: (id: string) => void;
}) {
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const command = Object.hasOwn(drafts, selectedId)
    ? (drafts[selectedId] ?? "")
    : "";
  function setCommand(value: string) {
    setDrafts((current) => ({ ...current, [selectedId]: value }));
  }
  const [announcement, setAnnouncement] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLDivElement>(null);
  const hosts = topology.devices.filter((device) => device.kind === "host");
  const host = hosts.find((device) => device.id === selectedId);
  const session = Object.hasOwn(sessions, selectedId)
    ? (sessions[selectedId] ?? emptySession)
    : emptySession;
  useEffect(() => {
    if (output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [session.entries]);
  const target = hosts.find((device) => device.id !== selectedId)?.interfaces[0]
    ?.ipAddress;
  function run() {
    if (!host || !command.trim()) return;
    const result = runHostCommand(
      command,
      topology,
      host.id,
      session.tables ?? tables,
    );
    setSessions((current) => ({
      ...current,
      [host.id]: {
        entries: result.clear
          ? []
          : [
              ...session.entries,
              { command: command.trim(), output: result.output },
            ].slice(-30),
        ...(result.tables || session.tables
          ? { tables: result.tables ?? session.tables }
          : {}),
      },
    }));
    setAnnouncement(result.clear ? "Terminal output cleared." : result.output);
    setCommand("");
    input.current?.focus();
  }
  function prepare(value: string) {
    setCommand(value);
    input.current?.focus();
  }
  return (
    <section
      id="host-terminal"
      className={styles.terminal}
      aria-labelledby="terminal-heading"
    >
      <div className={styles.heading}>
        <div>
          <Terminal size={22} aria-hidden="true" />
          <h2 id="terminal-heading">Host terminal</h2>
          <span>Simulated Linux-style CLI</span>
        </div>
        <label>
          Terminal host
          <select
            value={host?.id ?? ""}
            onChange={(event) => {
              onSelect(event.target.value);
              setCommand("");
              setAnnouncement("");
            }}
          >
            <option value="" disabled>
              Choose a computer
            </option>
            {hosts.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.intro}>
        Inspect a computer with familiar commands. Nothing runs on your machine
        or sends real traffic. Ping reports one-way delivery; traceroute shows
        observed TTL drops, without reply packets or timings.
      </p>
      {host ? (
        <>
          <div className={styles.examples} aria-label="Command examples">
            {[
              "ip addr",
              "ip route",
              "ip neigh",
              ...(target ? [`ping ${target}`, `traceroute ${target}`] : []),
              "help",
            ].map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => prepare(value)}
                title="Insert command"
              >
                <code>{value}</code>
              </button>
            ))}
          </div>
          <div
            ref={output}
            className={styles.output}
            role="region"
            aria-label={`${host.name} terminal output`}
            tabIndex={0}
          >
            {session.entries.length === 0 ? (
              <p>
                Choose a command above, then press Enter. Type help for
                supported syntax.
              </p>
            ) : (
              session.entries.map((entry, index) => (
                <div key={index}>
                  <p className={styles.prompt}>
                    {host.name}$ {entry.command}
                  </p>
                  <pre>{entry.output}</pre>
                </div>
              ))
            )}
          </div>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              run();
            }}
          >
            <label htmlFor="host-command">
              {host.name}$ <span className={styles.srOnly}>Command</span>
            </label>
            <input
              ref={input}
              id="host-command"
              aria-label={`Command for ${host.name}`}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              maxLength={160}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Try ip addr"
            />
            <button className="button" type="submit" disabled={!command.trim()}>
              Run command
            </button>
          </form>
          <p className={styles.note}>
            ARP source:{" "}
            {session.tables
              ? "latest terminal probe"
              : "selected simulation step"}
            . Each probe starts with empty tables. History is separate for each
            host (last 30 commands), and resets when the network configuration
            changes or you reload.
          </p>
        </>
      ) : (
        <p className={styles.empty}>
          Select a computer on the canvas or above to open its terminal.
          Switches and routers do not have a shell in this version.
        </p>
      )}
      <p role="status" className={styles.srOnly}>
        {announcement}
      </p>
    </section>
  );
}
