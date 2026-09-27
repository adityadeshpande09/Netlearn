import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { parseSupabaseConfig } from "../src/lib/supabase/config.ts";
import { checkDeployment, onlineCheckLimitations } from "./deployment-check.ts";

const args = process.argv.slice(2);
const allowed = new Set(["--require-accounts", "--online"]);

if (args.some((argument) => !allowed.has(argument))) {
  console.error(
    "Usage: node scripts/check-deployment.mjs [--require-accounts] [--online]",
  );
  process.exitCode = 1;
} else {
  try {
    const require = createRequire(import.meta.url);
    // Resolve Next's own loader so the preflight follows the installed framework's env rules.
    const nextRequire = createRequire(require.resolve("next/package.json"));
    const { loadEnvConfig } = nextRequire("@next/env");
    let environmentError = false;
    loadEnvConfig(fileURLToPath(new URL("../", import.meta.url)), false, {
      info() {},
      error() {
        environmentError = true;
      },
    });
    if (environmentError) throw new Error("Environment could not be loaded");
    const checks = await checkDeployment({
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      parseConfig: parseSupabaseConfig,
      requireAccounts: args.includes("--require-accounts"),
      online: args.includes("--online"),
    });
    for (const check of checks)
      console.log(`${check.status.toUpperCase()}: ${check.message}`);
    if (args.includes("--online")) console.log(onlineCheckLimitations);
    if (checks.some((check) => check.status === "fail")) process.exitCode = 1;
  } catch {
    console.error(
      "FAIL: Deployment checks could not run. Verify the installed dependencies, supported Node version, and environment files. No configuration values are shown.",
    );
    process.exitCode = 1;
  }
}
