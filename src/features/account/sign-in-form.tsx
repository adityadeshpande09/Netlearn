"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { getAccountRuntime } from "./use-account";
export function SignInForm({ sessionError }: { sessionError?: string | null }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const codeInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (sentTo) codeInput.current?.focus();
  }, [sentTo]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const target = email.trim();
    const result = await getAccountRuntime().auth.sendCode(target);
    if (result.ok) {
      setSentTo(target);
      setNotice(
        "Check your inbox for a sign-in code. It may take a moment to arrive.",
      );
    } else setError(result.error);
    setBusy(false);
  }
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sentTo) return;
    setBusy(true);
    setError("");
    const result = await getAccountRuntime().auth.verifyCode(
      sentTo,
      code.trim(),
    );
    if (!result.ok) setError(result.error);
    setBusy(false);
  }
  return (
    <div>
      <span className="account-icon" aria-hidden="true">
        <Mail size={22} />
      </span>
      <h2 tabIndex={-1}>
        {sentTo ? "Check your email." : "Your next lesson is waiting."}
      </h2>
      <p>
        {sentTo
          ? "Enter the one-time code sent to " + sentTo + "."
          : "Sign in or create an account with your email. We’ll send a one-time code; there’s no password to remember."}
      </p>
      {!sentTo ? (
        <form className="account-form" onSubmit={send}>
          <label htmlFor="account-email">Email address</label>
          <input
            ref={emailInput}
            id="account-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={busy}
            aria-describedby="account-form-help"
          />
          <p id="account-form-help" className="account-fine-print">
            New here? Sending a code starts your account registration. You’ll
            confirm it with the code.
          </p>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Sending code…" : "Email me a code"}
            <ArrowRight size={17} />
          </button>
        </form>
      ) : (
        <form className="account-form" onSubmit={verify}>
          <label htmlFor="account-code">One-time code</label>
          <input
            ref={codeInput}
            id="account-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6,10}"
            minLength={6}
            maxLength={10}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={busy}
          />
          <button type="submit" className="button" disabled={busy}>
            {busy ? "Checking code…" : "Confirm and sign in"}
            <ArrowRight size={17} />
          </button>
          <button
            type="button"
            className="text-action"
            disabled={busy}
            onClick={() => {
              setSentTo(null);
              setCode("");
              setError("");
              setNotice("");
              requestAnimationFrame(() => emailInput.current?.focus());
            }}
          >
            Use another email or request a new code
          </button>
        </form>
      )}
      <p className="account-error" role="alert">
        {error || sessionError}
      </p>
      <p className="account-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
