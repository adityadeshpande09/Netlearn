"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Cloud, ShieldCheck } from "lucide-react";
import {
  getAccountRuntime,
  refreshAccount,
  useAccount,
  useAccountProgress,
} from "./use-account";
import { useGuestProgress } from "@/features/progress/use-guest-progress";
import { ProgressStatus } from "@/features/progress/progress-status";
import { lessonSlugs } from "@/content/model";
import { SignInForm } from "./sign-in-form";
export function AccountPanel() {
  const auth = useAccount();
  const account = useAccountProgress();
  const panel = useRef<HTMLElement>(null);
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    if (auth.status === "loading") return;
    const id = auth.user?.id ?? null;
    if (id !== previousUser.current)
      panel.current?.querySelector<HTMLElement>("h2")?.focus();
    previousUser.current = id;
  }, [auth.status, auth.user?.id]);
  const guest = useGuestProgress();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const importable = guest.completed.filter(
    (slug) => !account.completed.includes(slug),
  );
  async function signOut() {
    if (
      account.pendingCount &&
      !window.confirm(
        "Some lesson progress has not synced. Signing out will discard those unsaved changes. Sign out anyway?",
      )
    )
      return;
    setBusy(true);
    setError("");
    const result = await getAccountRuntime().auth.signOut();
    if (!result.ok) setError(result.error);
    setBusy(false);
  }
  return (
    <div className="account-grid">
      <section
        ref={panel}
        className="account-card"
        aria-label="Account and progress"
      >
        {auth.user ? (
          <>
            <span className="account-icon" aria-hidden="true">
              <Cloud size={22} />
            </span>
            <h2 tabIndex={-1}>Your learning, connected.</h2>
            <p>
              Signed in as{" "}
              <strong className="account-email">{auth.user.email}</strong>
            </p>
            <div className="account-progress">
              <span className="account-count">
                {account.completed.length}
                <small> / {lessonSlugs.length}</small>
              </span>
              <span>lessons completed</span>
              <progress
                aria-label="Account lessons completed"
                value={account.completed.length}
                max={lessonSlugs.length}
              />
              <ProgressStatus />
            </div>
            {importable.length > 0 && (
              <section
                className="account-import"
                aria-labelledby="import-heading"
              >
                <h3 id="import-heading">Bring your browser progress along.</h3>
                <p>
                  This browser has {importable.length} completed{" "}
                  {importable.length === 1 ? "lesson" : "lessons"} missing from
                  your account. On a shared device, check that this progress is
                  yours before importing it.
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={
                    busy ||
                    account.status === "loading" ||
                    account.status === "syncing"
                  }
                  onClick={() => {
                    void getAccountRuntime().progress.importGuest(importable);
                    panel.current?.querySelector<HTMLElement>("h2")?.focus();
                  }}
                >
                  Import {importable.length} browser{" "}
                  {importable.length === 1 ? "lesson" : "lessons"}
                </button>
              </section>
            )}
            <div className="account-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => void refreshAccount()}
                disabled={
                  busy ||
                  account.status === "loading" ||
                  account.status === "syncing"
                }
              >
                Refresh progress
              </button>
              <button
                className="text-action"
                type="button"
                disabled={busy}
                onClick={() => void signOut()}
              >
                {busy ? "Signing out…" : "Sign out"}
              </button>
            </div>
            <p className="account-fine-print">
              New completions sync automatically. Until a save succeeds, changes
              stay in this tab and can be lost on reload or sign-out.
            </p>
            <p className="account-error" role="alert">
              {error || auth.error}
            </p>
          </>
        ) : auth.status === "disabled" ? (
          <>
            <span className="account-icon" aria-hidden="true">
              <BookOpen size={22} />
            </span>
            <h2>Keep learning here.</h2>
            <p>
              Account sign-in isn’t available yet. You can complete every lesson
              and save progress in this browser.
            </p>
            <Link href="/learn" className="button">
              Go to your learning path
              <ArrowRight size={17} />
            </Link>
          </>
        ) : auth.status === "loading" ? (
          <p role="status">Checking your sign-in…</p>
        ) : auth.status === "error" ? (
          <>
            <h2>Let’s reconnect.</h2>
            <p role="alert">{auth.error}</p>
            <button
              className="button"
              type="button"
              onClick={() => void refreshAccount()}
            >
              Retry sign-in check
            </button>
          </>
        ) : (
          <SignInForm sessionError={auth.error} />
        )}
      </section>
      <aside className="account-aside" aria-label="How progress works">
        <span className="eyebrow">AT YOUR PACE</span>
        <h2>A place for your progress.</h2>
        <div>
          <Cloud size={21} />
          <h3>Pick up on another device</h3>
          <p>
            Sign in with the same email to find the lessons you’ve completed.
          </p>
        </div>
        <div>
          <ShieldCheck size={21} />
          <h3>You choose what carries over</h3>
          <p>
            Browser progress is imported only when you ask. Signing out brings
            you back to your browser’s guest progress.
          </p>
        </div>
        <div>
          <BookOpen size={21} />
          <h3>Every lesson stays open</h3>
          <p>
            An account is optional. Saved playground networks stay on the
            browser where you created them.
          </p>
        </div>
        <Link className="text-action" href="/learn">
          Explore the learning path <ArrowRight size={16} />
        </Link>
      </aside>
    </div>
  );
}
