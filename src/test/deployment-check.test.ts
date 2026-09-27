import { afterEach, describe, expect, it, vi } from "vitest";
import { checkDeployment } from "../../scripts/deployment-check";
import { parseSupabaseConfig } from "@/lib/supabase/config";

const settings = {
  url: "https://example.supabase.co",
  key: "sb_publishable_preflight_fixture",
  parseConfig: parseSupabaseConfig,
};
const authSettings = {
  external: { email: true },
  disable_signup: false,
  mailer_autoconfirm: false,
};
const denied = { code: "42501", message: "permission denied" };

function service(auth = authSettings, tableStatus = 401, tableBody = denied) {
  return vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const isAuth = String(input).endsWith("/auth/v1/settings");
    return Response.json(isAuth ? auth : tableBody, {
      status: isAuth ? 200 : tableStatus,
    });
  });
}

afterEach(() => vi.useRealTimers());

describe("deployment configuration checks", () => {
  it.each([undefined, ""])(
    "allows intentionally empty guest settings without making requests",
    async (empty) => {
      const fetchImplementation = vi.fn<typeof fetch>();
      const checks = await checkDeployment({
        url: empty,
        key: empty,
        parseConfig: parseSupabaseConfig,
        online: true,
        fetchImplementation,
      });
      expect(checks).toMatchObject([{ status: "pass", id: "configuration" }]);
      expect(fetchImplementation).not.toHaveBeenCalled();
    },
  );

  it("fails missing configuration when accounts are required", async () => {
    const checks = await checkDeployment({
      url: undefined,
      key: undefined,
      parseConfig: parseSupabaseConfig,
      requireAccounts: true,
    });
    expect(checks).toMatchObject([{ status: "fail", id: "configuration" }]);
  });

  it.each([
    { url: settings.url, key: undefined },
    { url: undefined, key: settings.key },
    { url: " ", key: " " },
    { url: "http://example.supabase.co", key: settings.key },
    { url: settings.url, key: "sb_secret_do_not_echo_fixture" },
  ])("rejects partial or invalid settings without a request", async (input) => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const checks = await checkDeployment({
      ...input,
      parseConfig: parseSupabaseConfig,
      online: true,
      fetchImplementation,
    });
    expect(checks).toMatchObject([{ status: "fail", id: "configuration" }]);
    expect(fetchImplementation).not.toHaveBeenCalled();
    expect(JSON.stringify(checks)).not.toContain("do_not_echo");
  });

  it("keeps the default valid-configuration check offline", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    const checks = await checkDeployment({ ...settings, fetchImplementation });
    expect(checks).toMatchObject([{ status: "pass", id: "configuration" }]);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});

describe("read-only online deployment checks", () => {
  it.each([401, 403])(
    "accepts verified permission denial (%i), without claiming authenticated RLS was tested",
    async (status) => {
      const fetchImplementation = service(authSettings, status);
      const checks = await checkDeployment({
        ...settings,
        online: true,
        fetchImplementation,
      });
      expect(checks.map((check) => check.status)).toEqual([
        "pass",
        "pass",
        "pass",
      ]);
      expect(checks[2]?.message).toContain("separate testing");
      expect(fetchImplementation).toHaveBeenCalledTimes(2);
      for (const [url, options] of fetchImplementation.mock.calls) {
        expect(String(url)).toMatch(
          /^https:\/\/example\.supabase\.co\/(auth\/v1\/settings|rest\/v1\/lesson_completions\?select=lesson_slug&limit=0)$/,
        );
        expect(options).toMatchObject({
          method: "GET",
          redirect: "error",
          cache: "no-store",
          headers: { apikey: settings.key, Accept: "application/json" },
        });
        expect(options?.headers).not.toHaveProperty("Authorization");
        expect(options?.signal).toBeInstanceOf(AbortSignal);
        expect(options?.body).toBeUndefined();
      }
      expect(JSON.stringify(checks)).not.toContain(settings.key);
      expect(JSON.stringify(checks)).not.toContain(settings.url);
    },
  );

  it.each([
    { ...authSettings, external: { email: false } },
    { ...authSettings, disable_signup: true },
    { ...authSettings, mailer_autoconfirm: true },
  ])("rejects incompatible email authentication settings", async (auth) => {
    const checks = await checkDeployment({
      ...settings,
      online: true,
      fetchImplementation: service(auth),
    });
    expect(checks[1]).toMatchObject({ id: "auth", status: "fail" });
    expect(checks[2]?.status).toBe("pass");
  });

  it.each(["PGRST205", "42P01"])(
    "reports an absent table/schema cache distinctly (%s)",
    async (code) => {
      const checks = await checkDeployment({
        ...settings,
        online: true,
        fetchImplementation: service(authSettings, 404, {
          code,
          message: "private upstream details",
        }),
      });
      expect(checks[2]).toMatchObject({ status: "fail" });
      expect(checks[2]?.message).toContain("missing");
      expect(JSON.stringify(checks)).not.toContain("private upstream");
    },
  );

  it("does not mistake a rejected API key for correct table grants", async () => {
    const checks = await checkDeployment({
      ...settings,
      online: true,
      fetchImplementation: service(authSettings, 401, {
        code: "invalid_api_key",
        message: "private upstream details",
      }),
    });
    expect(checks[2]).toMatchObject({ status: "fail" });
    expect(checks[2]?.message).toContain("could not be verified");
  });

  it("rejects anonymous table access even when no rows are returned", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        Response.json(
          String(input).endsWith("/auth/v1/settings") ? authSettings : [],
        ),
      );
    const checks = await checkDeployment({
      ...settings,
      online: true,
      fetchImplementation,
    });
    expect(checks[2]).toMatchObject({ status: "fail" });
    expect(checks[2]?.message).toContain("reads were accepted");
  });

  it("sanitizes fetch failures without echoing their messages", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("private upstream token=example"));
    const checks = await checkDeployment({
      ...settings,
      online: true,
      fetchImplementation,
    });
    expect(checks.slice(1).every((check) => check.status === "fail")).toBe(
      true,
    );
    expect(JSON.stringify(checks)).not.toContain("private upstream");
  });

  it.each([
    () => new Response("not JSON", { status: 200 }),
    () => Response.json(null, { status: 503 }),
    () => Response.json({}, { status: 302 }),
  ])(
    "fails safely on malformed, unavailable, or redirected responses",
    async (response) => {
      const checks = await checkDeployment({
        ...settings,
        online: true,
        fetchImplementation: vi
          .fn<typeof fetch>()
          .mockImplementation(async () => response()),
      });
      expect(checks.slice(1).every((check) => check.status === "fail")).toBe(
        true,
      );
    },
  );

  it("bounds both requests and aborts them when the timeout expires", async () => {
    vi.useFakeTimers();
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise<Response>(() => {}));
    const result = checkDeployment({
      ...settings,
      online: true,
      fetchImplementation,
      timeoutMs: 50,
    });
    await vi.advanceTimersByTimeAsync(50);
    expect(
      (await result).slice(1).every((check) => check.status === "fail"),
    ).toBe(true);
    expect(
      fetchImplementation.mock.calls.every(([, init]) => init?.signal?.aborted),
    ).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
