import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const [mode, ...args] = process.argv.slice(2);
if (mode !== "guest" && mode !== "accounts") {
  process.stderr.write("Choose guest or accounts for the browser suite.\n");
  process.exit(1);
}

// Explicit empty values override .env.local; fixture builds cannot reach a live
// Supabase project. The separate build directory preserves the normal preview.
const env = {
  ...process.env,
  NETLEARN_TEST_BUILD: "1",
  NEXT_PUBLIC_SUPABASE_URL: mode === "accounts" ? "http://127.0.0.1:54329" : "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    mode === "accounts" ? "sb_publishable_browser_fixture" : "",
};

function run(entry, arguments_) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [entry, ...arguments_], {
      cwd: root,
      env,
      stdio: "inherit",
    });
    child.on("error", () => {
      process.stderr.write("Could not start the browser validation command.\n");
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

process.stdout.write(`Building the isolated ${mode} browser-test app.\n`);
let status = await run(require.resolve("next/dist/bin/next"), ["build"]);
if (status === 0) {
  status = await run(require.resolve("@playwright/test/cli"), [
    "test",
    "--config",
    mode === "accounts"
      ? "playwright.accounts.config.ts"
      : "playwright.config.ts",
    ...args,
  ]);
}
process.exitCode = status;
