import { describe, expect, it } from "vitest";
import {
  explainRouteSelection,
  selectRoute,
} from "@/domain/networking/topology";
import type { RouteEntry, RouterDevice } from "@/domain/networking/types";

const route = (network: string, prefixLength: number): RouteEntry => ({
  network,
  prefixLength,
  interfaceId: "out",
  nextHop: "192.0.2.2",
});
const router: RouterDevice = {
  id: "r",
  name: "Router",
  kind: "router",
  interfaces: [
    {
      id: "out",
      name: "eth0",
      macAddress: "02:00:00:00:00:01",
      ipAddress: "192.0.2.1",
      prefixLength: 24,
    },
  ],
  routes: [
    route("0.0.0.0", 0),
    route("10.20.0.0", 16),
    route("10.20.30.0", 24),
    route("10.20.30.42", 32),
  ],
};

describe("route selection explanation", () => {
  it.each([
    ["10.20.30.42", 32],
    ["10.20.30.0", 24],
    ["10.20.30.255", 24],
    ["10.20.31.0", 16],
    ["10.21.0.0", 0],
    ["0.0.0.0", 0],
    ["255.255.255.255", 0],
  ])("selects the longest prefix for %s", (destination, prefix) => {
    const before = structuredClone(router);
    const result = explainRouteSelection(router, destination);
    expect(result.selected?.prefixLength).toBe(prefix);
    expect(
      result.candidates.filter((candidate) => candidate.selected),
    ).toHaveLength(1);
    expect(selectRoute(router, destination)).toEqual(result.selected);
    expect(router).toEqual(before);
  });
  it("reports every match and the connected route source", () => {
    const result = explainRouteSelection(router, "10.20.30.42");
    expect(result.candidates.map((candidate) => candidate.matches)).toEqual([
      false,
      true,
      true,
      true,
      true,
    ]);
    expect(result.candidates[0]?.source).toBe("Connected");
    expect(
      result.candidates
        .slice(1)
        .every((candidate) => candidate.source === "Static"),
    ).toBe(true);
    expect(
      explainRouteSelection(router, "192.0.2.15").selected?.nextHop,
    ).toBeUndefined();
  });
  it("handles no route and invalid input without throwing", () => {
    expect(
      explainRouteSelection({ ...router, routes: [] }, "203.0.113.1").selected,
    ).toBeUndefined();
    for (const destination of [
      "",
      "10.20.30.256",
      "010.20.30.42",
      "10.20.30.42/24",
    ]) {
      const result = explainRouteSelection(router, destination);
      expect(result.validDestination).toBe(false);
      expect(result.selected).toBeUndefined();
      expect(result.candidates.some((candidate) => candidate.matches)).toBe(
        false,
      );
    }
  });
  it("preserves stable ties including connected before static", () => {
    const tied = {
      ...router,
      routes: [route("192.0.2.0", 24), route("192.0.2.0", 24)],
    };
    const result = explainRouteSelection(tied, "192.0.2.4");
    expect(result.tied).toBe(true);
    expect(result.candidates[0]?.selected).toBe(true);
    expect(result.selected?.nextHop).toBeUndefined();
    const staticOnly = { ...tied, interfaces: [] };
    expect(explainRouteSelection(staticOnly, "192.0.2.4").selected).toBe(
      tied.routes[0],
    );
  });
  it("ignores malformed routes and masks noncanonical network addresses", () => {
    const result = explainRouteSelection(
      {
        ...router,
        interfaces: [],
        routes: [
          route("bad", 32),
          route("10.20.30.42", 33),
          route("10.20.30.100", 24),
        ],
      },
      "10.20.30.42",
    );
    expect(result.candidates.map((candidate) => candidate.valid)).toEqual([
      false,
      false,
      true,
    ]);
    expect(result.selected?.prefixLength).toBe(24);
  });
});
