import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createCloudProgressRepository } from "@/repositories/progress/cloud-progress-repository";

let clientSequence = 0;
function setup(response: () => Promise<Response>) {
  const requests: Request[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return response();
  };
  const client = createClient<Database>(
    "https://netlearn-test.supabase.co",
    "public-test-key",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: "progress-test-" + clientSequence++,
      },
      global: { fetch: fetcher },
    },
  );
  return { repository: createCloudProgressRepository(client), requests };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Supabase progress adapter", () => {
  it("accepts new lesson rows together with earlier account completions", async () => {
    const { repository } = setup(async () =>
      json([
        { lesson_slug: "subnetting" },
        { lesson_slug: "network-basics" },
        { lesson_slug: "icmp-ping" },
        { lesson_slug: "arp" },
      ]),
    );
    expect(await repository.load("account-a")).toEqual([
      "network-basics",
      "arp",
      "icmp-ping",
      "subnetting",
    ]);
  });

  it("writes every new lesson with the same append-only completion contract", async () => {
    const { repository, requests } = setup(
      async () => new Response(null, { status: 201 }),
    );
    await repository.add("account-a", ["arp", "icmp-ping", "subnetting"]);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.headers.get("Prefer")).toContain(
      "resolution=ignore-duplicates",
    );
    expect(await requests[0]!.json()).toEqual([
      { user_id: "account-a", lesson_slug: "arp" },
      { user_id: "account-a", lesson_slug: "icmp-ping" },
      { user_id: "account-a", lesson_slug: "subnetting" },
    ]);
  });

  it("requests only the selected account's lesson rows and validates and normalizes them", async () => {
    const { repository, requests } = setup(async () =>
      json([
        { lesson_slug: "routers" },
        { lesson_slug: "network-basics" },
        { lesson_slug: "routers" },
      ]),
    );
    expect(await repository.load("account-a")).toEqual([
      "network-basics",
      "routers",
    ]);
    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]!.url);
    expect(url.pathname).toBe("/rest/v1/lesson_completions");
    expect(url.searchParams.get("select")).toBe("lesson_slug");
    expect(url.searchParams.get("user_id")).toBe("eq.account-a");
    expect(requests[0]!.method).toBe("GET");
  });

  it("inserts only requested completions with duplicate-ignore rather than update semantics", async () => {
    const { repository, requests } = setup(
      async () => new Response(null, { status: 201 }),
    );
    await repository.add("account-a", ["routers", "switches", "routers"]);
    const request = requests[0]!;
    expect(requests).toHaveLength(1);
    expect(request.method).toBe("POST");
    expect(new URL(request.url).searchParams.get("on_conflict")).toBe(
      "user_id,lesson_slug",
    );
    expect(request.headers.get("Prefer")).toContain(
      "resolution=ignore-duplicates",
    );
    expect(request.headers.get("Prefer")).not.toContain(
      "return=representation",
    );
    expect(await request.json()).toEqual([
      { user_id: "account-a", lesson_slug: "switches" },
      { user_id: "account-a", lesson_slug: "routers" },
    ]);
  });

  it("does not make a request for an empty completion list", async () => {
    const { repository, requests } = setup(
      async () => new Response(null, { status: 201 }),
    );
    await repository.add("account-a", []);
    expect(requests).toHaveLength(0);
  });

  it.each([
    null,
    {},
    [{ lesson_slug: 3 }],
    [{ lesson_slug: "unknown-lesson" }],
    [null],
  ])("rejects invalid remote completion data", async (data) => {
    const { repository } = setup(async () => json(data));
    await expect(repository.load("account-a")).rejects.toThrow(
      "Could not load your account progress. Try again.",
    );
  });

  it("returns sanitized read and write failures instead of backend details", async () => {
    const { repository } = setup(async () =>
      json(
        { code: "42501", message: "Internal private database details" },
        403,
      ),
    );
    await expect(repository.load("account-a")).rejects.toThrow(
      "Could not load your account progress. Try again.",
    );
    await expect(repository.add("account-a", ["routers"])).rejects.toThrow(
      "Could not save your account progress. Try again.",
    );
  });

  it("sanitizes transport failures and prevents requests without an account ID", async () => {
    const { repository, requests } = setup(async () => {
      throw new Error("Private connection information");
    });
    await expect(repository.load("")).rejects.toThrow(
      "Could not load your account progress. Try again.",
    );
    await expect(repository.add("", ["routers"])).rejects.toThrow(
      "Could not save your account progress. Try again.",
    );
    expect(requests).toHaveLength(0);
    vi.useFakeTimers();
    try {
      const failure = expect(repository.load("account-a")).rejects.toThrow(
        "Could not load your account progress. Try again.",
      );
      // Exercise the SDK's 1s, 2s and 4s backoff without seven seconds of wall time.
      await vi.runAllTimersAsync();
      await failure;
      expect(requests).toHaveLength(4);
      expect(
        requests.map((request) => request.headers.get("X-Retry-Count")),
      ).toEqual([null, "1", "2", "3"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
