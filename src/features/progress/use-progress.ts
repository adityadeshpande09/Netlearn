"use client";
import type { LessonSlug } from "@/content/model";
import {
  getAccountRuntime,
  useAccount,
  useAccountProgress,
} from "@/features/account/use-account";
import { completeGuestLesson, useGuestProgress } from "./use-guest-progress";
export function completeLesson(slug: LessonSlug) {
  const runtime = getAccountRuntime();
  const auth = runtime.auth.getSnapshot();
  if (auth.user) {
    void runtime.progress.complete(slug);
  } else if (auth.status === "guest" || auth.status === "disabled")
    completeGuestLesson(slug);
}
export function useProgress() {
  const guest = useGuestProgress();
  const auth = useAccount();
  const account = useAccountProgress();
  if (auth.user)
    return {
      completed: account.completed,
      persistence: "saved" as const,
      ready: account.userId === auth.user.id,
      scope: "account" as const,
      syncStatus: account.status,
      pendingCount: account.pendingCount,
    };
  return {
    ...guest,
    ready:
      guest.ready && (auth.status === "guest" || auth.status === "disabled"),
    scope: "browser" as const,
    syncStatus:
      auth.status === "error"
        ? ("error" as const)
        : auth.status === "loading"
          ? ("loading" as const)
          : ("idle" as const),
    pendingCount: 0,
  };
}
