"use client";
import { useSyncExternalStore } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { createAuthStore } from "./auth-store";
import { createCloudProgressRepository } from "@/repositories/progress/cloud-progress-repository";
import { createAccountProgressStore } from "@/features/progress/account-progress-store";

function createRuntime() {
  const client = getSupabaseBrowserClient();
  const auth = createAuthStore(client);
  const progress = createAccountProgressStore(
    client
      ? createCloudProgressRepository(client)
      : {
          load: async () => [],
          add: async () => {
            throw new Error("Accounts unavailable");
          },
        },
  );
  let references = 0;
  let stop = () => {};
  function retain() {
    if (references++ === 0) {
      const syncIdentity = () => {
        void progress.setUser(auth.getSnapshot().user?.id ?? null);
      };
      const unsubscribe = auth.subscribe(syncIdentity);
      const stopAuth = auth.start();
      syncIdentity();
      const refresh = () => {
        if (document.visibilityState === "visible") void refreshAccount();
      };
      const protectPending = (event: BeforeUnloadEvent) => {
        if (progress.getSnapshot().pendingCount) event.preventDefault();
      };
      window.addEventListener("focus", refresh);
      window.addEventListener("online", refresh);
      window.addEventListener("beforeunload", protectPending);
      stop = () => {
        unsubscribe();
        stopAuth();
        window.removeEventListener("focus", refresh);
        window.removeEventListener("online", refresh);
        window.removeEventListener("beforeunload", protectPending);
      };
    }
    return () => {
      if (--references === 0) stop();
    };
  }
  return { auth, progress, retain };
}
let runtime: ReturnType<typeof createRuntime> | undefined;
export function getAccountRuntime() {
  return (runtime ??= createRuntime());
}
const serverAuth = { status: "loading" as const, user: null, error: null };
const serverProgress = {
  userId: null,
  completed: [],
  status: "idle" as const,
  pendingCount: 0,
};
function subscribeAuth(listener: () => void) {
  const state = getAccountRuntime();
  const release = state.retain();
  const unsubscribe = state.auth.subscribe(listener);
  return () => {
    unsubscribe();
    release();
  };
}
function subscribeProgress(listener: () => void) {
  const state = getAccountRuntime();
  const release = state.retain();
  const unsubscribe = state.progress.subscribe(listener);
  return () => {
    unsubscribe();
    release();
  };
}
export function useAccount() {
  return useSyncExternalStore(
    subscribeAuth,
    () => getAccountRuntime().auth.getSnapshot(),
    () => serverAuth,
  );
}
export function useAccountProgress() {
  return useSyncExternalStore(
    subscribeProgress,
    () => getAccountRuntime().progress.getSnapshot(),
    () => serverProgress,
  );
}
export async function refreshAccount() {
  const state = getAccountRuntime();
  const result = await state.auth.refresh();
  if (result.ok) await state.progress.retry();
}
export function AccountSession() {
  useAccount();
  return null;
}
