import { describe, expect, it, vi } from "vitest";
import {
  createProgressRepository,
  decodeProgress,
  progressKey,
} from "@/repositories/progress/progress-repository";
describe("versioned browser progress", () => {
  it("retains original completions and adds new lessons in the same versioned record", () => {
    const original = [
      "network-basics",
      "mac-vs-ip",
      "switches",
      "routers",
      "packet-travel",
    ];
    let stored = JSON.stringify({ version: 1, completed: original });
    const repository = createProgressRepository({
      getItem: () => stored,
      setItem: (_key, value) => {
        stored = value;
      },
    });
    expect(repository.load()).toEqual({
      completed: original,
      persistence: "saved",
    });
    expect(
      repository.save([
        ...repository.load().completed,
        "subnetting",
        "arp",
        "icmp-ping",
      ]),
    ).toBe(true);
    expect(repository.load().completed).toEqual([
      ...original,
      "arp",
      "icmp-ping",
      "subnetting",
    ]);
    expect(JSON.parse(stored)).toEqual({
      version: 1,
      completed: [...original, "arp", "icmp-ping", "subnetting"],
    });
  });
  it("starts empty and normalizes duplicate, unknown, and out-of-order lesson IDs", () => {
    expect(decodeProgress(null)).toEqual({
      completed: [],
      persistence: "saved",
    });
    expect(
      decodeProgress(
        JSON.stringify({
          version: 1,
          completed: ["routers", "unknown", "network-basics", "routers"],
        }),
      ),
    ).toEqual({
      completed: ["network-basics", "routers"],
      persistence: "saved",
    });
  });
  it.each([
    "broken JSON",
    "null",
    '{"version":2,"completed":[]}',
    '{"version":1,"completed":[2]}',
  ])("rejects unreadable or unsupported data: %s", (raw) => {
    expect(decodeProgress(raw)).toEqual({
      completed: [],
      persistence: "memory",
    });
  });
  it("handles blocked reads and full storage without throwing", () => {
    const denied = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    const repo = createProgressRepository({ getItem: denied, setItem: denied });
    expect(repo.load().persistence).toBe("memory");
    expect(repo.save(["network-basics"])).toBe(false);
    expect(createProgressRepository().load().persistence).toBe("memory");
  });
  it("writes only a versioned, normalized completion record", () => {
    const setItem = vi.fn();
    expect(
      createProgressRepository({ getItem: () => null, setItem }).save([
        "switches",
        "switches",
      ]),
    ).toBe(true);
    expect(setItem).toHaveBeenCalledWith(
      progressKey,
      JSON.stringify({ version: 1, completed: ["switches"] }),
    );
  });
});
