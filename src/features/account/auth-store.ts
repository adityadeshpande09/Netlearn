import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  type AuthChangeEvent,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface AuthSnapshot {
  status: "disabled" | "loading" | "guest" | "signed-in" | "error";
  user: { id: string; email: string } | null;
  error: string | null;
}
export type AuthResult = { ok: true } | { ok: false; error: string };
type AuthClient = {
  auth: Pick<
    SupabaseClient<Database>["auth"],
    "getUser" | "onAuthStateChange" | "signInWithOtp" | "verifyOtp" | "signOut"
  >;
};

const messages = {
  disabled: "Accounts are not configured yet.",
  refresh: "We couldn’t check your account. Please try again.",
  send: "We couldn’t send a sign-in code. Wait a moment and try again.",
  verify: "We couldn’t verify that code. Try again or request a new code.",
  signOut: "We couldn’t finish signing out. Please try again.",
  changed: "Your sign-in state changed. Please try again.",
};
function failure(error: string): AuthResult {
  return { ok: false, error };
}

export function createAuthStore(client: AuthClient | null) {
  let snapshot: AuthSnapshot = {
    status: client ? "loading" : "disabled",
    user: null,
    error: null,
  };
  const listeners = new Set<() => void>();
  let generation = 0;
  let lifecycle = 0;
  let starts = 0;
  let action = 0;
  let expectedId: string | null | undefined;
  let unsubscribe: (() => void) | undefined;
  let queued = false;
  let queuedGeneration = 0;
  let pending: { generation: number; promise: Promise<AuthResult> } | null =
    null;

  function publish(next: AuthSnapshot) {
    if (
      next.status === snapshot.status &&
      next.user?.id === snapshot.user?.id &&
      next.user?.email === snapshot.user?.email &&
      next.error === snapshot.error
    )
      return;
    snapshot = next;
    listeners.forEach((listener) => listener());
  }
  function report(error: string) {
    publish({
      ...snapshot,
      status: snapshot.status === "loading" ? "error" : snapshot.status,
      error,
    });
    return failure(error);
  }
  function guest() {
    expectedId = null;
    generation++;
    publish({ status: "guest", user: null, error: null });
  }

  function refresh(): Promise<AuthResult> {
    if (!client) return Promise.resolve(failure(messages.disabled));
    if (pending?.generation === generation) return pending.promise;
    const version = generation;
    publish({
      status: snapshot.user ? "signed-in" : "loading",
      user: snapshot.user,
      error: null,
    });
    // Assign pending before calling the SDK: getUser can itself emit auth events.
    const promise = Promise.resolve().then(async (): Promise<AuthResult> => {
      try {
        const { data, error } = await client.auth.getUser();
        if (version !== generation) return failure(messages.changed);
        if (error) throw error;
        if (!data.user) {
          guest();
          return { ok: true };
        }
        if (expectedId !== undefined && expectedId !== data.user.id) {
          publish({ status: "error", user: null, error: messages.changed });
          return failure(messages.changed);
        }
        expectedId = data.user.id;
        publish({
          status: "signed-in",
          user: { id: data.user.id, email: data.user.email ?? "" },
          error: null,
        });
        return { ok: true };
      } catch (error) {
        if (version !== generation) return failure(messages.changed);
        if (isAuthSessionMissingError(error)) {
          guest();
          return { ok: true };
        }
        const transient =
          !isAuthError(error) ||
          isAuthRetryableFetchError(error) ||
          (error.status ?? 0) >= 500;
        const user = transient ? snapshot.user : null;
        publish({
          status: user ? "signed-in" : "error",
          user,
          error: messages.refresh,
        });
        return failure(messages.refresh);
      }
    });
    pending = { generation: version, promise };
    void promise.finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    return promise;
  }

  function scheduleRefresh() {
    queuedGeneration = generation;
    if (queued) return;
    queued = true;
    const cycle = lifecycle;
    queueMicrotask(() => {
      if (cycle !== lifecycle) return;
      queued = false;
      if (queuedGeneration === generation && starts > 0) void refresh();
    });
  }
  function onAuthChange(event: AuthChangeEvent, session: Session | null) {
    const id = event === "SIGNED_OUT" ? null : (session?.user.id ?? null);
    if (!id) {
      guest();
      return;
    }
    if (id !== expectedId) {
      expectedId = id;
      generation++;
    }
    // Session payloads only invalidate old identity; getUser verifies the new one.
    const user = snapshot.user?.id === id ? snapshot.user : null;
    publish({ status: user ? "signed-in" : "loading", user, error: null });
    // A synchronous callback must return before another SDK method acquires its lock.
    scheduleRefresh();
  }

  function start() {
    if (!client) return () => {};
    starts++;
    if (starts === 1) {
      lifecycle++;
      const cycle = lifecycle;
      expectedId = undefined;
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (cycle === lifecycle && starts > 0) onAuthChange(event, session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      scheduleRefresh();
    }
    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      starts--;
      if (starts === 0) {
        lifecycle++;
        generation++;
        action++;
        queued = false;
        unsubscribe?.();
        unsubscribe = undefined;
      }
    };
  }

  async function sendCode(email: string): Promise<AuthResult> {
    if (!client) return failure(messages.disabled);
    const request = ++action;
    const version = generation;
    try {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (request !== action || version !== generation)
        return failure(messages.changed);
      if (error) return report(messages.send);
      publish({ ...snapshot, error: null });
      return { ok: true };
    } catch {
      return request === action && version === generation
        ? report(messages.send)
        : failure(messages.changed);
    }
  }

  async function verifyCode(email: string, code: string): Promise<AuthResult> {
    if (!client) return failure(messages.disabled);
    const request = ++action;
    const version = generation;
    try {
      const { data, error } = await client.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (request !== action) return failure(messages.changed);
      if (error || !data.user || !data.session)
        return version === generation
          ? report(messages.verify)
          : failure(messages.changed);
      const verifiedId = data.user.id;
      const result = await refresh();
      if (request !== action) return failure(messages.changed);
      if (!result.ok) return result;
      return snapshot.user?.id === verifiedId
        ? { ok: true }
        : failure(messages.changed);
    } catch {
      return request === action && version === generation
        ? report(messages.verify)
        : failure(messages.changed);
    }
  }

  async function signOut(): Promise<AuthResult> {
    if (!client) return failure(messages.disabled);
    const request = ++action;
    const previousId = snapshot.user?.id;
    const version = ++generation;
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (
        request !== action ||
        (version !== generation &&
          expectedId !== null &&
          expectedId !== previousId)
      )
        return failure(messages.changed);
      if (error) return report(messages.signOut);
      if (version !== generation && expectedId !== null)
        return failure(messages.changed);
      guest();
      return { ok: true };
    } catch {
      return request === action &&
        (version === generation || expectedId === null)
        ? report(messages.signOut)
        : failure(messages.changed);
    }
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    start,
    sendCode,
    verifyCode,
    signOut,
    refresh,
  };
}
