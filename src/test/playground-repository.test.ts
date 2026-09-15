import { describe, expect, it, vi } from "vitest";
import { routedTopology } from "@/domain/networking/scenarios";
import {
  decodeWorkspace,
  type WorkspaceSnapshot,
} from "@/repositories/playgrounds/workspace-snapshot";
import {
  createPlaygroundRepository,
  MAX_PLAYGROUNDS,
  playgroundKey,
  type SavedPlayground,
} from "@/repositories/playgrounds/playground-repository";

function workspace(): WorkspaceSnapshot {
  return {
    topology: routedTopology(),
    positions: { "pc-a": { x: 31, y: 92 }, removed: { x: 1, y: 2 } },
    sourceId: "pc-a",
    destinationId: "pc-b",
    ttl: 17,
  };
}

function entry(id = "saved-1", name = "My network"): SavedPlayground {
  return {
    id,
    name,
    updatedAt: "2026-09-13T12:00:00.000Z",
    workspace: workspace(),
  };
}

function memory(initial: string | null = null) {
  let raw = initial;
  return {
    getItem: vi.fn(() => raw),
    setItem: vi.fn((_key: string, value: string) => {
      raw = value;
    }),
    raw: () => raw,
  };
}

describe("saved workspace decoding", () => {
  it("copies the entire network and packet settings while normalizing positions", () => {
    const original = workspace();
    const restored = decodeWorkspace(original);
    expect(restored).toMatchObject({
      topology: original.topology,
      sourceId: "pc-a",
      destinationId: "pc-b",
      ttl: 17,
      positions: { "pc-a": { x: 31, y: 92 }, "switch-a": { x: 245, y: 0 } },
    });
    expect(restored?.positions).not.toHaveProperty("removed");
    expect(restored?.topology.devices).not.toBe(original.topology.devices);
    expect(restored?.topology.devices[0]?.interfaces[0]).not.toBe(
      original.topology.devices[0]?.interfaces[0],
    );
    expect(original.positions).toHaveProperty("removed");
  });

  it("round-trips blank workspaces and unfinished or broken network configuration", () => {
    const blank: WorkspaceSnapshot = {
      topology: { devices: [], links: [] },
      positions: {},
      sourceId: "",
      destinationId: "",
      ttl: 64,
    };
    expect(decodeWorkspace(blank)).toEqual(blank);
    const broken = workspace();
    const host = broken.topology.devices[0]!;
    host.interfaces[0]!.ipAddress = "still working on this";
    host.interfaces[0]!.prefixLength = -1;
    if (host.kind === "host") host.defaultGateway = "not an address";
    broken.topology.links.push({
      ...broken.topology.links[0]!,
      id: "repeated-port",
    });
    broken.sourceId = "";
    expect(decodeWorkspace(broken)?.topology).toEqual(broken.topology);
  });

  it.each([null, [], {}, { topology: { devices: {}, links: [] } }])(
    "rejects incomplete shapes",
    (value) => {
      expect(decodeWorkspace(value)).toBeNull();
    },
  );

  it.each([
    "constructor",
    "__proto__",
    "toString",
    "host:port",
    "x".repeat(81),
  ])("rejects unsafe device IDs: %s", (id) => {
    const value = workspace();
    value.topology.devices[0]!.id = id;
    expect(decodeWorkspace(value)).toBeNull();
  });

  it("rejects duplicate device, interface and cable IDs", () => {
    const duplicateDevice = workspace();
    duplicateDevice.topology.devices[1]!.id = "pc-a";
    expect(decodeWorkspace(duplicateDevice)).toBeNull();
    const duplicatePort = workspace();
    duplicatePort.topology.devices[1]!.interfaces[1]!.id = "p1";
    expect(decodeWorkspace(duplicatePort)).toBeNull();
    const duplicateCable = workspace();
    duplicateCable.topology.links[1]!.id = "link-a";
    expect(decodeWorkspace(duplicateCable)).toBeNull();
  });

  it("rejects missing port references and packet selections that are not hosts", () => {
    const cable = workspace();
    cable.topology.links[0]!.target.interfaceId = "missing";
    expect(decodeWorkspace(cable)).toBeNull();
    const route = workspace();
    const router = route.topology.devices.find(
      (device) => device.kind === "router",
    );
    if (router?.kind === "router")
      router.routes.push({
        network: "0.0.0.0",
        prefixLength: 0,
        interfaceId: "missing",
      });
    expect(decodeWorkspace(route)).toBeNull();
    expect(
      decodeWorkspace({ ...workspace(), sourceId: "switch-a" }),
    ).toBeNull();
    expect(
      decodeWorkspace({ ...workspace(), destinationId: "missing" }),
    ).toBeNull();
  });

  it.each([0, 256, 1.5, Infinity, NaN, "64"])(
    "rejects invalid TTL %s",
    (ttl) => {
      expect(decodeWorkspace({ ...workspace(), ttl })).toBeNull();
    },
  );

  it.each([Infinity, NaN, 1_000_001, "10"])(
    "rejects invalid coordinates %s",
    (x) => {
      expect(
        decodeWorkspace({ ...workspace(), positions: { "pc-a": { x, y: 0 } } }),
      ).toBeNull();
    },
  );

  it("bounds devices, interfaces, routes, links and text", () => {
    const devices = workspace();
    devices.topology.devices = Array.from({ length: 9 }, (_, index) => ({
      ...devices.topology.devices[0]!,
      id: "host-" + index,
    }));
    expect(decodeWorkspace(devices)).toBeNull();
    const ports = workspace();
    ports.topology.devices[0]!.interfaces.push({
      ...ports.topology.devices[0]!.interfaces[0]!,
      id: "p2",
    });
    expect(decodeWorkspace(ports)).toBeNull();
    const routes = workspace();
    const router = routes.topology.devices.find(
      (device) => device.kind === "router",
    );
    if (router?.kind === "router")
      router.routes = Array.from({ length: 65 }, () => ({
        network: "0.0.0.0",
        prefixLength: 0,
        interfaceId: "p1",
      }));
    expect(decodeWorkspace(routes)).toBeNull();
    const links = workspace();
    links.topology.links = Array.from({ length: 17 }, (_, index) => ({
      ...links.topology.links[0]!,
      id: "cable-" + index,
    }));
    expect(decodeWorkspace(links)).toBeNull();
    const text = workspace();
    text.topology.devices[0]!.interfaces[0]!.ipAddress = "x".repeat(65);
    expect(decodeWorkspace(text)).toBeNull();
  });
});

describe("saved playground library", () => {
  it("saves a trimmed name and reopens a sanitized independent snapshot", () => {
    const storage = memory();
    const repo = createPlaygroundRepository(storage);
    expect(repo.load()).toEqual({ ok: true, items: [] });
    const saved = repo.save(entry("saved-1", "  My network  "));
    expect(saved).toMatchObject({
      ok: true,
      items: [{ name: "My network", workspace: { ttl: 17 } }],
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      playgroundKey,
      expect.any(String),
    );
    if (saved.ok)
      saved.items[0]!.workspace.topology.devices[0]!.name =
        "Changed outside storage";
    expect(repo.load()).toMatchObject({
      ok: true,
      items: [
        {
          workspace: {
            topology: {
              devices: [
                expect.objectContaining({ name: "PC-A" }),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
              ],
            },
          },
        },
      ],
    });
  });

  it("rejects duplicate IDs and names without replacing an existing save", () => {
    const storage = memory();
    const repo = createPlaygroundRepository(storage);
    expect(repo.save(entry()).ok).toBe(true);
    const before = storage.raw();
    expect(repo.save(entry("saved-1", "Different name")).ok).toBe(false);
    expect(repo.save(entry("saved-2", " MY NETWORK ")).ok).toBe(false);
    expect(storage.raw()).toBe(before);
  });

  it.each(["", "   ", "x".repeat(61)])("rejects invalid save names", (name) => {
    const storage = memory();
    expect(
      createPlaygroundRepository(storage).save(entry("saved-1", name)).ok,
    ).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("requires a real ISO timestamp and valid workspace before saving", () => {
    const storage = memory();
    const repo = createPlaygroundRepository(storage);
    expect(
      repo.save({ ...entry(), updatedAt: "2026-02-30T12:00:00.000Z" }).ok,
    ).toBe(false);
    expect(
      repo.save({ ...entry(), workspace: { ...workspace(), ttl: 0 } }).ok,
    ).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it.each([
    "broken JSON",
    "null",
    '{"version":2,"items":[]}',
    '{"version":1,"items":[{}]}',
    " ".repeat(1_000_001),
  ])("preserves unreadable, future or oversized stored data", (raw) => {
    const storage = memory(raw);
    const repo = createPlaygroundRepository(storage);
    expect(repo.load().ok).toBe(false);
    expect(repo.save(entry()).ok).toBe(false);
    expect(repo.remove("saved-1").ok).toBe(false);
    expect(storage.raw()).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("rejects ambiguous persisted duplicates and libraries beyond the limit", () => {
    for (const items of [
      [entry(), entry()],
      Array.from({ length: MAX_PLAYGROUNDS + 1 }, (_, index) =>
        entry("save-" + index, "Network " + index),
      ),
    ]) {
      const storage = memory(JSON.stringify({ version: 1, items }));
      const repo = createPlaygroundRepository(storage);
      expect(repo.load().ok).toBe(false);
      expect(repo.save(entry("another", "Another")).ok).toBe(false);
      expect(storage.setItem).not.toHaveBeenCalled();
    }
  });

  it("enforces twenty saves and frees space after deleting one", () => {
    const storage = memory(
      JSON.stringify({
        version: 1,
        items: Array.from({ length: MAX_PLAYGROUNDS }, (_, index) =>
          entry("save-" + index, "Network " + index),
        ),
      }),
    );
    const repo = createPlaygroundRepository(storage);
    expect(repo.save(entry("extra", "Extra")).ok).toBe(false);
    const removed = repo.remove("save-0");
    expect(removed.ok && removed.items).toHaveLength(19);
    expect(repo.save(entry("extra", "Extra")).ok).toBe(true);
  });

  it("reads the latest library for every save and deletion across tabs", () => {
    const storage = memory();
    const firstTab = createPlaygroundRepository(storage);
    const secondTab = createPlaygroundRepository(storage);
    firstTab.load();
    secondTab.load();
    firstTab.save(entry("one", "One"));
    secondTab.save(entry("two", "Two"));
    firstTab.remove("one");
    expect(secondTab.load()).toMatchObject({
      ok: true,
      items: [{ id: "two" }],
    });
    secondTab.save(entry("three", "Three"));
    expect(firstTab.load()).toMatchObject({
      ok: true,
      items: [{ id: "two" }, { id: "three" }],
    });
  });

  it("reports blocked reads, missing storage and quota failures without claiming success", () => {
    const denied = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    const blocked = createPlaygroundRepository({
      getItem: denied,
      setItem: denied,
    });
    expect(blocked.load().ok).toBe(false);
    expect(blocked.save(entry()).ok).toBe(false);
    expect(blocked.remove("saved-1").ok).toBe(false);
    expect(createPlaygroundRepository().load().ok).toBe(false);
    const existing = JSON.stringify({ version: 1, items: [entry()] });
    const quota = createPlaygroundRepository({
      getItem: () => existing,
      setItem: () => {
        throw new DOMException("Full", "QuotaExceededError");
      },
    });
    expect(quota.save(entry("two", "Two")).ok).toBe(false);
    expect(quota.remove("saved-1").ok).toBe(false);
    expect(quota.load()).toMatchObject({
      ok: true,
      items: [{ id: "saved-1" }],
    });
  });
});
