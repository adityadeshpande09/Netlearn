import { useRef, useState } from "react";
import type { NetworkDevice, RouterDevice } from "@/domain/networking/types";
import { calculateSubnet } from "@/domain/networking/subnet";
export function RouteEditor({
  router,
  onSave,
}: {
  router: RouterDevice;
  onSave: (device: NetworkDevice) => void;
}) {
  const addButton = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState("");
  return (
    <details className="route-editor">
      <summary>Static routes (optional)</summary>
      <p>
        Connected routes are automatic. Use a static route to reach a network
        through another router.
      </p>
      <ul>
        {router.routes.map((route, index) => (
          <li key={index}>
            <span className="mono">
              {route.network}/{route.prefixLength} via {route.nextHop ?? "link"}
            </span>
            <button
              className="danger-button"
              type="button"
              aria-label={
                "Remove route " + route.network + "/" + route.prefixLength
              }
              onClick={() => {
                onSave({
                  ...router,
                  routes: router.routes.filter((_, i) => i !== index),
                });
                addButton.current?.focus();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const result = calculateSubnet(String(form.get("route-network")));
          if (!result.ok) {
            setError(result.error);
            return;
          }
          const nextHop = String(form.get("route-next-hop") ?? "").trim();
          onSave({
            ...router,
            routes: [
              ...router.routes,
              {
                network: result.value.network,
                prefixLength: result.value.prefix,
                interfaceId: String(form.get("route-interface")),
                ...(nextHop ? { nextHop } : {}),
              },
            ],
          });
          setError("");
        }}
      >
        <label>
          Destination network / prefix
          <input
            name="route-network"
            placeholder="172.16.0.0/24"
            required
            spellCheck={false}
          />
        </label>
        <label>
          Next-hop IPv4 address
          <input
            name="route-next-hop"
            placeholder="Leave blank for on-link delivery"
            spellCheck={false}
          />
        </label>
        <label>
          Outgoing interface
          <select name="route-interface">
            {router.interfaces.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name} · {port.ipAddress}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          ref={addButton}
          className="button button-secondary"
          type="submit"
        >
          Add static route
        </button>
      </form>
    </details>
  );
}
