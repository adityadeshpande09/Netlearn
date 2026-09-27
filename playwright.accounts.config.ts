import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
// pnpm test:accounts builds with matching public fixtures in .next-test.
export default defineConfig({
  ...base,
  testDir: "./tests/accounts",
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_browser_fixture",
    },
  },
});
