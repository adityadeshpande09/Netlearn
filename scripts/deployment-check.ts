import type {
  parseSupabaseConfig,
  SupabaseConfig,
} from "../src/lib/supabase/config";

interface DeploymentCheckOptions {
  url: string | undefined;
  key: string | undefined;
  parseConfig: typeof parseSupabaseConfig;
  requireAccounts?: boolean;
  online?: boolean;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export interface DeploymentCheck {
  id: "configuration" | "auth" | "anonymous-access";
  status: "pass" | "fail" | "skip";
  message: string;
}

export const onlineCheckLimitations =
  "Public checks cannot verify authenticated row ownership, email templates, SMTP delivery, or cross-device sync. Complete the live account checks before release.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function request(
  config: SupabaseConfig,
  path: string,
  fetchImplementation: typeof fetch,
  timeoutMs: number,
): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImplementation(config.url + path, {
          method: "GET",
          headers: {
            apikey: config.publishableKey,
            Accept: "application/json",
          },
          redirect: "error",
          signal: controller.signal,
          cache: "no-store",
        });
        const body: unknown = await response.json();
        return { status: response.status, body };
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Request timed out"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function checkAuth(
  config: SupabaseConfig,
  fetchImplementation: typeof fetch,
  timeoutMs: number,
): Promise<DeploymentCheck> {
  const failed: DeploymentCheck = {
    id: "auth",
    status: "fail",
    message:
      "Auth settings could not be verified. Check project availability, the public key, and network access.",
  };
  try {
    const { status, body } = await request(
      config,
      "/auth/v1/settings",
      fetchImplementation,
      timeoutMs,
    );
    if (status !== 200 || !isRecord(body) || !isRecord(body.external))
      return failed;
    if (
      body.external.email !== true ||
      body.disable_signup !== false ||
      body.mailer_autoconfirm !== false
    )
      return {
        ...failed,
        message:
          "Auth must enable email sign-in and new signups, with email confirmation required. Verify these settings in Supabase.",
      };
    return {
      id: "auth",
      status: "pass",
      message:
        "Auth settings are reachable; email sign-in and signups are enabled with email confirmation required.",
    };
  } catch {
    return failed;
  }
}

async function checkAnonymousAccess(
  config: SupabaseConfig,
  fetchImplementation: typeof fetch,
  timeoutMs: number,
): Promise<DeploymentCheck> {
  const failed: DeploymentCheck = {
    id: "anonymous-access",
    status: "fail",
    message:
      "Anonymous database access could not be verified. Check project availability, the public key, and the applied migration.",
  };
  try {
    const { status, body } = await request(
      config,
      "/rest/v1/lesson_completions?select=lesson_slug&limit=0",
      fetchImplementation,
      timeoutMs,
    );
    if (isRecord(body) && ["PGRST205", "42P01"].includes(String(body.code)))
      return {
        ...failed,
        message:
          "The lesson completion table is missing or absent from the API schema cache. Check the migration and schema exposure.",
      };
    if (
      (status === 401 || status === 403) &&
      isRecord(body) &&
      body.code === "42501"
    )
      return {
        id: "anonymous-access",
        status: "pass",
        message:
          "Anonymous lesson completion reads are denied, as required by the migration. Authenticated ownership still needs separate testing.",
      };
    if (status >= 200 && status < 300)
      return {
        ...failed,
        message:
          "Anonymous lesson completion reads were accepted. Restore the migration's restricted table grants and verify row policies.",
      };
    return failed;
  } catch {
    return failed;
  }
}

export async function checkDeployment({
  url,
  key,
  parseConfig,
  requireAccounts = false,
  online = false,
  fetchImplementation = fetch,
  timeoutMs = 5000,
}: DeploymentCheckOptions): Promise<DeploymentCheck[]> {
  if (!url && !key)
    return [
      {
        id: "configuration",
        status: requireAccounts ? "fail" : "pass",
        message: requireAccounts
          ? "Accounts are required, but both public Supabase settings are empty."
          : "Guest mode: both public Supabase settings are empty. Account checks are skipped.",
      },
    ];

  const config = parseConfig(url, key);
  if (!config)
    return [
      {
        id: "configuration",
        status: "fail",
        message:
          "Public Supabase configuration is partial or invalid. Supply a valid project URL and publishable key together, or leave both empty for guest mode.",
      },
    ];

  const checks: DeploymentCheck[] = [
    {
      id: "configuration",
      status: "pass",
      message: "Both public Supabase settings have valid formats.",
    },
  ];
  if (!online) return checks;
  checks.push(
    ...(await Promise.all([
      checkAuth(config, fetchImplementation, timeoutMs),
      checkAnonymousAccess(config, fetchImplementation, timeoutMs),
    ])),
  );
  return checks;
}
