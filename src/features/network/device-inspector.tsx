import { routerRoutes } from "@/domain/networking/topology";
import type { NetworkDevice, TableSnapshot } from "@/domain/networking/types";
export function DeviceInspector({
  device,
  tables,
}: {
  device: NetworkDevice;
  tables: TableSnapshot;
}) {
  const arp =
    (Object.hasOwn(tables.arp, device.id)
      ? tables.arp[device.id]
      : undefined) ?? [];
  const mac =
    (Object.hasOwn(tables.mac, device.id)
      ? tables.mac[device.id]
      : undefined) ?? [];
  const portName = (id: string) =>
    device.interfaces.find((port) => port.id === id)?.name ?? id;
  return (
    <section
      className="device-inspector"
      aria-labelledby="device-inspector-heading"
    >
      <div className="subsection-heading">
        <div>
          <p className="eyebrow">DEVICE DETAILS</p>
          <h2 id="device-inspector-heading">{device.name}</h2>
        </div>
        <span className="device-kind">
          {device.kind === "host" ? "Computer" : device.kind}
        </span>
      </div>
      <div
        className="device-table-wrap"
        tabIndex={0}
        role="region"
        aria-label={device.name + " table, scroll horizontally if needed"}
      >
        <table>
          <caption>Ethernet interfaces</caption>
          <thead>
            <tr>
              <th scope="col">Interface</th>
              <th scope="col">MAC address</th>
              <th scope="col">IPv4 / prefix</th>
            </tr>
          </thead>
          <tbody>
            {device.interfaces.map((port) => (
              <tr key={port.id}>
                <th scope="row">{port.name}</th>
                <td className="mono">{port.macAddress}</td>
                <td className="mono">
                  {port.ipAddress
                    ? port.ipAddress + "/" + port.prefixLength
                    : "Layer 2 only"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {device.kind === "host" && (
        <p className="gateway-detail">
          Default gateway:{" "}
          <span className="mono">
            {device.defaultGateway || "Not configured"}
          </span>
        </p>
      )}
      {device.kind === "switch" ? (
        <div
          className="device-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={device.name + " table, scroll horizontally if needed"}
        >
          <table>
            <caption>MAC table at the current step</caption>
            <thead>
              <tr>
                <th scope="col">Learned source MAC</th>
                <th scope="col">Port</th>
              </tr>
            </thead>
            <tbody>
              {mac.length ? (
                mac.map((entry) => (
                  <tr key={entry.macAddress}>
                    <td className="mono">{entry.macAddress}</td>
                    <td>{portName(entry.interfaceId)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2}>
                    Empty. Send a frame to learn its source address.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="device-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={device.name + " table, scroll horizontally if needed"}
        >
          <table>
            <caption>ARP table at the current step</caption>
            <thead>
              <tr>
                <th scope="col">IPv4 address</th>
                <th scope="col">MAC address</th>
                <th scope="col">Interface</th>
              </tr>
            </thead>
            <tbody>
              {arp.length ? (
                arp.map((entry) => (
                  <tr key={entry.interfaceId + entry.ipAddress}>
                    <td className="mono">{entry.ipAddress}</td>
                    <td className="mono">{entry.macAddress}</td>
                    <td>{portName(entry.interfaceId)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    Empty. ARP entries appear as addresses are resolved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {device.kind === "router" && (
        <div
          className="device-table-wrap"
          tabIndex={0}
          role="region"
          aria-label={device.name + " table, scroll horizontally if needed"}
        >
          <table>
            <caption>Routing table · longest matching prefix wins</caption>
            <thead>
              <tr>
                <th scope="col">Network</th>
                <th scope="col">Next hop</th>
                <th scope="col">Interface</th>
              </tr>
            </thead>
            <tbody>
              {routerRoutes(device).map((route, index) => (
                <tr key={index}>
                  <td className="mono">
                    {route.network}/{route.prefixLength}
                  </td>
                  <td className="mono">{route.nextHop ?? "Connected"}</td>
                  <td>{portName(route.interfaceId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
