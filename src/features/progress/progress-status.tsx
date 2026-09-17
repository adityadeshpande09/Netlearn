"use client";
import Link from "next/link";
import { refreshAccount, useAccount } from "@/features/account/use-account";
import { useProgress } from "./use-progress";
export function ProgressStatus() {
  const progress = useProgress();
  const auth = useAccount();
  let message: string;
  if (progress.scope === "account") {
    message =
      progress.syncStatus === "synced"
        ? "Progress synced to your account."
        : progress.syncStatus === "error"
          ? progress.pendingCount
            ? "Sync paused. Unsaved progress is kept in this tab only."
            : "Could not load your account progress."
          : "Syncing lesson progress…";
  } else {
    message =
      progress.syncStatus === "error"
        ? "Could not check your sign-in. Retry before saving progress."
        : progress.syncStatus === "loading"
          ? "Checking your sign-in…"
          : progress.persistence === "memory"
            ? "Progress is kept in this tab only."
            : "Saved on this browser. No account needed.";
  }
  return (
    <span className="progress-status-copy">
      <span aria-live="polite">{message}</span>
      {progress.syncStatus === "error" && (
        <button
          type="button"
          className="text-action"
          onClick={() => void refreshAccount()}
        >
          Retry sync
        </button>
      )}
      {(auth.status === "guest" || auth.user) && (
        <Link className="text-action" href="/account">
          {auth.user ? "Manage account" : "Sync across devices"}
        </Link>
      )}
    </span>
  );
}
