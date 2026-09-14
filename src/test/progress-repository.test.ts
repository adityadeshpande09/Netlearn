import { describe, expect, it, vi } from "vitest";
import {
  createProgressRepository,
  decodeProgress,
  progressKey,
} from "@/repositories/progress/progress-repository";
describe("versioned browser progress", () => {
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
