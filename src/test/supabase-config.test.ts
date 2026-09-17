import { describe, expect, it } from "vitest";
import { parseSupabaseConfig } from "@/lib/supabase/config";
describe("public account configuration", () => {
  it("leaves accounts unavailable without both public settings", () => {
    expect(parseSupabaseConfig(undefined, undefined)).toBeNull();
    expect(
      parseSupabaseConfig("https://example.supabase.co", undefined),
    ).toBeNull();
  });
  it("accepts HTTPS projects and loopback development URLs", () => {
    expect(
      parseSupabaseConfig(
        "https://example.supabase.co/",
        "sb_publishable_example",
      ),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_example",
    });
    expect(
      parseSupabaseConfig("http://127.0.0.1:54321", "sb_publishable_example"),
    ).not.toBeNull();
  });
  it.each([
    "http://example.com",
    "https://user:password@example.com",
    "https://example.com/path",
    "https://example.com?key=1",
    "not a URL",
  ])("rejects insecure or malformed project URLs: %s", (url) => {
    expect(parseSupabaseConfig(url, "sb_publishable_example")).toBeNull();
  });
  it.each(["sb_secret_example", "legacy-jwt", "", "sb_publishable_\ninvalid"])(
    "never accepts secret or unrecognized keys",
    (key) => {
      expect(
        parseSupabaseConfig("https://example.supabase.co", key),
      ).toBeNull();
    },
  );
});
