// Uses the shared browser test setup; NextRequest remains the real server request type.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
const mocks = vi.hoisted(() => ({
  configured: true,
  getClaims: vi.fn<(cookies: CookieMethodsServer) => Promise<void>>(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () =>
    mocks.configured
      ? {
          url: "https://example.supabase.co",
          publishableKey: "sb_publishable_fixture",
        }
      : null,
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createClient }));
import { proxy } from "@/proxy";
beforeEach(() => {
  mocks.configured = true;
  mocks.getClaims.mockReset().mockResolvedValue(undefined);
  mocks.createClient
    .mockReset()
    .mockImplementation(
      (
        _url: string,
        _key: string,
        options: { cookies: CookieMethodsServer },
      ) => ({ auth: { getClaims: () => mocks.getClaims(options.cookies) } }),
    );
});
function request(cookie = "sb-example-auth-token=old-session") {
  return new NextRequest("https://netlearn.example/learn", {
    headers: { cookie },
  });
}
describe("cookie session proxy", () => {
  it("keeps unconfigured and signed-out public pages independent of Supabase", async () => {
    mocks.configured = false;
    expect((await proxy(request())).headers.get("x-middleware-next")).toBe("1");
    mocks.configured = true;
    await proxy(request("theme=light"));
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("forwards refreshed cookies to the render and the browser without shared caching", async () => {
    mocks.getClaims.mockImplementation(async (cookies) => {
      expect(await cookies.getAll()).toContainEqual({
        name: "sb-example-auth-token",
        value: "old-session",
      });
      await cookies.setAll?.(
        [
          {
            name: "sb-example-auth-token",
            value: "new-session",
            options: { path: "/", sameSite: "lax", secure: true },
          },
        ],
        {
          "Cache-Control": "private, no-store",
          Expires: "0",
          Pragma: "no-cache",
        },
      );
    });
    const incoming = request();
    const response = await proxy(incoming);
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
    expect(incoming.cookies.get("sb-example-auth-token")?.value).toBe(
      "new-session",
    );
    expect(response.headers.get("x-middleware-request-cookie")).toContain(
      "sb-example-auth-token=new-session",
    );
    expect(response.cookies.get("sb-example-auth-token")).toMatchObject({
      value: "new-session",
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Expires")).toBe("0");
    expect(response.headers.get("Pragma")).toBe("no-cache");
  });
  it("retains earlier cookies when the SDK writes more than one batch", async () => {
    mocks.getClaims.mockImplementation(async (cookies) => {
      await cookies.setAll?.(
        [{ name: "sb-old", value: "", options: { maxAge: 0 } }],
        { "Cache-Control": "private, no-store" },
      );
      await cookies.setAll?.(
        [{ name: "sb-new", value: "replacement", options: { path: "/" } }],
        {},
      );
    });
    const response = await proxy(request());
    expect(response.cookies.get("sb-old")?.maxAge).toBe(0);
    expect(response.cookies.get("sb-new")?.value).toBe("replacement");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("leaves public lessons reachable through an auth outage and keeps cookie responses private", async () => {
    mocks.getClaims.mockRejectedValue(new Error("Service unavailable"));
    const response = await proxy(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("Cache-Control")).toContain(
      "private, no-store",
    );
  });
});
