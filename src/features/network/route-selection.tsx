"use client";
import { useId, useState } from "react";
import { binaryIpv4 } from "@/domain/networking/ipv4";
import { explainRouteSelection } from "@/domain/networking/topology";
import type { RouterDevice } from "@/domain/networking/types";
import styles from "./route-selection.module.css";

const example: RouterDevice = {
  id: "lookup-example",
  name: "Example router",
  kind: "router",
  interfaces: [
    {
      id: "uplink",
      name: "uplink",
      macAddress: "02:00:00:00:00:01",
      ipAddress: "192.0.2.1",
      prefixLength: 24,
    },
  ],
  routes: [
    {
      network: "0.0.0.0",
      prefixLength: 0,
      interfaceId: "uplink",
      nextHop: "192.0.2.2",
    },
    {
      network: "10.20.0.0",
      prefixLength: 16,
      interfaceId: "uplink",
      nextHop: "192.0.2.3",
    },
    {
      network: "10.20.30.0",
      prefixLength: 24,
      interfaceId: "uplink",
      nextHop: "192.0.2.4",
    },
  ],
};
export function RouteSelection({
  router,
  initialDestination,
}: {
  router: RouterDevice;
  initialDestination: string;
}) {
  const id = useId();
  const [destination, setDestination] = useState(initialDestination);
  const [demo, setDemo] = useState(false);
  const current = demo ? example : router;
  const result = explainRouteSelection(current, destination.trim());
  const winner = result.selected;
  const portName = (portId: string) =>
    current.interfaces.find((port) => port.id === portId)?.name ?? portId;
  return (
    <section className={styles.selection} aria-labelledby={id + "-heading"}>
      <h3 id={id + "-heading"}>Route selection</h3>
      <p>
        Match the destination against each network. Among matching routes, the
        longest prefix wins: it identifies the most specific range.
      </p>
      <div className={styles.controls}>
        <label htmlFor={id + "-destination"}>
          Lookup destination IPv4
          <input
            id={id + "-destination"}
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={!result.validDestination}
            aria-describedby={id + "-result"}
          />
        </label>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => {
            setDemo(!demo);
            setDestination(demo ? initialDestination : "10.20.30.42");
          }}
        >
          {demo ? "Use this router's routes" : "Try overlapping routes"}
        </button>
      </div>
      <p className={styles.context}>
        {demo
          ? "Example table only. Your network is unchanged."
          : `Using ${router.name}'s current connected and static routes. Lookup does not send a packet.`}
      </p>
      {demo && (
        <div className={styles.controls} aria-label="Example destinations">
          {["10.20.30.42", "10.20.40.42", "203.0.113.7"].map((ip) => (
            <button
              key={ip}
              className="button button-secondary"
              type="button"
              onClick={() => setDestination(ip)}
            >
              {ip}
            </button>
          ))}
        </div>
      )}
      <p id={id + "-result"} role="status" className={styles.result}>
        {!result.validDestination
          ? "Enter a valid IPv4 address, for example 10.20.30.42."
          : winner
            ? `Selected ${winner.network}/${winner.prefixLength}: ${winner.prefixLength} matching prefix bits. Next hop ${winner.nextHop ?? destination.trim()} via ${portName(winner.interfaceId)}${winner.nextHop ? "." : " (on-link destination)."}`
            : "No matching route. Forwarding would stop at this router; add a matching route or a default route."}
      </p>
      {result.tied && (
        <p>
          Equal longest prefixes: this model keeps the first route in table
          order (connected routes precede static routes). Administrative
          distance, metrics and ECMP are not modeled.
        </p>
      )}
      <div
        className="device-table-wrap"
        tabIndex={0}
        role="region"
        aria-label="Route selection table, scroll horizontally if needed"
      >
        <table>
          <caption>Routing table · longest matching prefix wins</caption>
          <thead>
            <tr>
              <th scope="col">Network</th>
              <th scope="col">Source</th>
              <th scope="col">Next hop</th>
              <th scope="col">Interface</th>
              <th scope="col">Decision</th>
            </tr>
          </thead>
          <tbody>
            {result.candidates.map(
              ({ route, source, matches, valid, selected }, index) => (
                <tr
                  key={index}
                  className={selected ? styles.winner : undefined}
                >
                  <th scope="row">
                    <code>
                      {route.network}/{route.prefixLength}
                    </code>
                  </th>
                  <td>{source}</td>
                  <td>
                    <code>{route.nextHop ?? "On-link"}</code>
                  </td>
                  <td>{portName(route.interfaceId)}</td>
                  <td>
                    {!valid
                      ? "Invalid prefix/address"
                      : !result.validDestination
                        ? "Awaiting valid destination"
                        : selected
                          ? "Selected"
                          : !matches
                            ? "Does not match"
                            : route.prefixLength === winner?.prefixLength
                              ? "Matches; equal prefix, later entry"
                              : "Matches; shorter prefix"}
                    {valid && result.validDestination && (
                      <span className={styles.meter} aria-hidden="true">
                        <span
                          style={{
                            width: `${(route.prefixLength / 32) * 100}%`,
                          }}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ),
            )}
            {result.candidates.length === 0 && (
              <tr>
                <td colSpan={5}>No configured routes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {winner && (
        <details className={styles.bits}>
          <summary>Compare the selected prefix in binary</summary>
          <p>
            The first {winner.prefixLength} bits match. A /0 default matches
            every address; a /32 host route matches one exact address.
          </p>
          <p>
            Destination{" "}
            <code>
              <strong>
                {binaryIpv4(destination.trim()).slice(0, winner.prefixLength)}
              </strong>
              {binaryIpv4(destination.trim()).slice(winner.prefixLength)}
            </code>
          </p>
          <p>
            Route{" "}
            <code>
              <strong>
                {binaryIpv4(winner.network).slice(0, winner.prefixLength)}
              </strong>
              {binaryIpv4(winner.network).slice(winner.prefixLength)}
            </code>
          </p>
        </details>
      )}
      <p className={styles.context}>
        Bars show prefix length, not speed. Route selection does not guarantee
        delivery: interface configuration, ARP, cabling and TTL still matter.{" "}
        <a
          href="https://www.rfc-editor.org/rfc/rfc1812.html#section-5.2.4.3"
          target="_blank"
          rel="noreferrer"
        >
          Reference: RFC 1812, section 5.2.4.3
        </a>
        .
      </p>
    </section>
  );
}
