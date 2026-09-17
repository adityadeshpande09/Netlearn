import { describe, expect, it, vi } from "vitest";
import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  type AuthChangeEvent,
  type AuthResponse,
  type Session,
  type User,
  type UserResponse,
} from "@supabase/supabase-js";
import { createAuthStore } from "@/features/account/auth-store";

type AuthClient = NonNullable<Parameters<typeof createAuthStore>[0]>;
type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

function user(id: string): User {
  return {
    id,
    email: `${id}@example.com`,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}
function session(id: string): Session {
  return {
    user: user(id),
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
  };
}
function verified(id: string): UserResponse {
  return { data: { user: user(id) }, error: null };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function client() {
  let callback: AuthCallback | undefined;
  let inCallback = false;
  const unsubscribe = vi.fn();
  const auth = {
    getUser: vi.fn<AuthClient["auth"]["getUser"]>().mockResolvedValue({
      data: { user: null },
      error: new AuthSessionMissingError(),
    }),
    onAuthStateChange: vi.fn((listener: AuthCallback) => {
      callback = listener;
      return {
        data: {
          subscription: {
            id: "test-subscription",
            callback: listener,
            unsubscribe,
          },
        },
      };
    }),
    signInWithOtp: vi
      .fn<AuthClient["auth"]["signInWithOtp"]>()
      .mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
    verifyOtp: vi.fn<AuthClient["auth"]["verifyOtp"]>().mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthSessionMissingError(),
    }),
    signOut: vi
      .fn<AuthClient["auth"]["signOut"]>()
      .mockResolvedValue({ error: null }),
  };
  return {
    client: { auth } satisfies AuthClient,
    ...auth,
    unsubscribe,
    inCallback: () => inCallback,
    emit(event: AuthChangeEvent, id: string | null) {
      inCallback = true;
      try {
        callback?.(event, id ? session(id) : null);
      } finally {
        inCallback = false;
      }
    },
  };
}

describe("verified account state", () => {
  it("is disabled without configuration and never pretends an operation succeeded", async () => {
    const store = createAuthStore(null);
    const original = store.getSnapshot();
    const stop = store.start();
    expect(original).toEqual({ status: "disabled", user: null, error: null });
    expect((await store.sendCode("student@example.com")).ok).toBe(false);
    expect((await store.verifyCode("student@example.com", "123456")).ok).toBe(
      false,
    );
    expect((await store.signOut()).ok).toBe(false);
    expect((await store.refresh()).ok).toBe(false);
    expect(store.getSnapshot()).toBe(original);
    stop();
  });

  it("treats a missing session as guest and provides stable unchanged snapshots", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    const stop = store.start();
    expect(await store.refresh()).toEqual({ ok: true });
    expect(store.getSnapshot()).toEqual({
      status: "guest",
      user: null,
      error: null,
    });
    const guest = store.getSnapshot();
    fake.emit("SIGNED_OUT", null);
    expect(store.getSnapshot()).toBe(guest);
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    stop();
  });

  it("sends signup-capable email codes and verifies identity through getUser", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    expect(await store.sendCode(" student@example.com ")).toEqual({ ok: true });
    expect(fake.signInWithOtp).toHaveBeenCalledWith({
      email: "student@example.com",
      options: { shouldCreateUser: true },
    });
    fake.getUser.mockResolvedValue(verified("student"));
    fake.verifyOtp.mockImplementationOnce(async () => {
      fake.emit("SIGNED_IN", "student");
      return {
        data: { user: user("student"), session: session("student") },
        error: null,
      };
    });
    expect(await store.verifyCode(" student@example.com ", " 123456 ")).toEqual(
      { ok: true },
    );
    expect(fake.verifyOtp).toHaveBeenCalledWith({
      email: "student@example.com",
      token: "123456",
      type: "email",
    });
    expect(fake.getUser).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual({
      status: "signed-in",
      user: { id: "student", email: "student@example.com" },
      error: null,
    });
    expect(JSON.stringify(store.getSnapshot())).not.toContain("token");
    stop();
  });

  it.each(["returned", "thrown"])(
    "sanitizes %s initial account failures",
    async (kind) => {
      const fake = client();
      if (kind === "returned")
        fake.getUser.mockResolvedValue({
          data: { user: null },
          error: new AuthApiError(
            "Internal diagnostic",
            500,
            "unexpected_failure",
          ),
        });
      else fake.getUser.mockRejectedValue(new TypeError("Internal diagnostic"));
      const store = createAuthStore(fake.client);
      const stop = store.start();
      const result = await store.refresh();
      expect(result.ok).toBe(false);
      expect(store.getSnapshot()).toMatchObject({
        status: "error",
        user: null,
      });
      expect(store.getSnapshot().error).toBeTruthy();
      expect(
        JSON.stringify({ result, snapshot: store.getSnapshot() }),
      ).not.toContain("Internal diagnostic");
      stop();
    },
  );

  it("retains only the same verified user during a transient refresh failure", async () => {
    const fake = client();
    fake.getUser.mockResolvedValue(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthRetryableFetchError("Private provider failure", 503),
    });
    const retry = store.refresh();
    expect(store.getSnapshot()).toMatchObject({
      status: "signed-in",
      user: { id: "alice" },
    });
    expect((await retry).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({
      status: "signed-in",
      user: { id: "alice" },
    });
    expect(store.getSnapshot().error).toBeTruthy();
    await store.refresh();
    expect(store.getSnapshot().error).toBeNull();
    stop();
  });

  it("clears a verified user on a definitive authentication failure", async () => {
    const fake = client();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new AuthApiError("Invalid credential diagnostic", 401, "bad_jwt"),
    });
    expect((await store.refresh()).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ status: "error", user: null });
    stop();
  });

  it("hides a previous account synchronously but defers SDK verification outside its callback", async () => {
    const fake = client();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.getUser.mockImplementationOnce(async () => {
      expect(fake.inCallback()).toBe(false);
      return verified("bob");
    });
    fake.emit("SIGNED_IN", "bob");
    expect(store.getSnapshot()).toEqual({
      status: "loading",
      user: null,
      error: null,
    });
    expect(fake.getUser).toHaveBeenCalledTimes(1);
    await store.refresh();
    expect(store.getSnapshot().user?.id).toBe("bob");
    stop();
  });

  it("does not trust raw session identity when getUser disagrees", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    fake.emit("SIGNED_IN", "bob");
    expect((await store.refresh()).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ status: "error", user: null });
    stop();
  });

  it("cannot restore an old identity after a sign-out event", async () => {
    const fake = client();
    const late = deferred<UserResponse>();
    fake.getUser.mockReturnValueOnce(late.promise);
    const store = createAuthStore(fake.client);
    const stop = store.start();
    const reading = store.refresh();
    await Promise.resolve();
    fake.emit("SIGNED_OUT", null);
    expect(store.getSnapshot().status).toBe("guest");
    late.resolve(verified("alice"));
    expect((await reading).ok).toBe(false);
    expect(store.getSnapshot()).toEqual({
      status: "guest",
      user: null,
      error: null,
    });
    stop();
  });

  it("cancels queued verification when sign-out arrives before its microtask", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.emit("SIGNED_IN", "alice");
    fake.emit("SIGNED_OUT", null);
    await Promise.resolve();
    await Promise.resolve();
    expect(fake.getUser).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({
      status: "guest",
      user: null,
      error: null,
    });
    stop();
  });

  it("ignores an older verification that finishes after a different account", async () => {
    const fake = client();
    const late = deferred<UserResponse>();
    fake.getUser.mockReturnValueOnce(late.promise);
    const store = createAuthStore(fake.client);
    const stop = store.start();
    const first = store.refresh();
    await Promise.resolve();
    fake.getUser.mockResolvedValueOnce(verified("bob"));
    fake.emit("SIGNED_IN", "bob");
    await store.refresh();
    late.resolve(verified("alice"));
    expect((await first).ok).toBe(false);
    expect(store.getSnapshot().user?.id).toBe("bob");
    stop();
  });

  it("coalesces same-user events emitted while getUser is in flight", async () => {
    const fake = client();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.getUser.mockImplementationOnce(async () => {
      fake.emit("SIGNED_IN", "alice");
      fake.emit("TOKEN_REFRESHED", "alice");
      return verified("alice");
    });
    expect(await store.refresh()).toEqual({ ok: true });
    expect(fake.getUser).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().user?.id).toBe("alice");
    stop();
  });

  it("shares one subscription and cancels stopped lifecycle work", async () => {
    const fake = client();
    const late = deferred<UserResponse>();
    fake.getUser.mockReturnValueOnce(late.promise);
    const store = createAuthStore(fake.client);
    const firstStop = store.start();
    const secondStop = store.start();
    const reading = store.refresh();
    await Promise.resolve();
    expect(fake.onAuthStateChange).toHaveBeenCalledTimes(1);
    firstStop();
    firstStop();
    expect(fake.unsubscribe).not.toHaveBeenCalled();
    secondStop();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
    fake.emit("SIGNED_IN", "alice");
    late.resolve(verified("alice"));
    expect((await reading).ok).toBe(false);
    expect(store.getSnapshot().user).toBeNull();
    const stop = store.start();
    await store.refresh();
    expect(store.getSnapshot().status).toBe("guest");
    stop();
  });
});

describe("account operation results", () => {
  it("uses the same generic message for registered and unregistered email errors", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.signInWithOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new AuthApiError("Account exists", 400, "user_already_exists"),
    });
    const registered = await store.sendCode("registered@example.com");
    fake.signInWithOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new AuthApiError("Account absent", 400, "user_not_found"),
    });
    const unregistered = await store.sendCode("unregistered@example.com");
    expect(registered).toEqual(unregistered);
    expect(registered.ok).toBe(false);
    expect(JSON.stringify(registered)).not.toMatch(/exists|absent|registered/);
    stop();
  });

  it("sanitizes invalid verification results and thrown code requests", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.verifyOtp.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new AuthApiError("Secret provider diagnostic", 403, "otp_expired"),
    });
    const result = await store.verifyCode("student@example.com", "123456");
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("Secret provider diagnostic");
    expect(store.getSnapshot().user).toBeNull();
    fake.signInWithOtp.mockRejectedValueOnce(
      new TypeError("Secret provider diagnostic"),
    );
    expect((await store.sendCode("student@example.com")).ok).toBe(false);
    expect(store.getSnapshot().error).not.toContain(
      "Secret provider diagnostic",
    );
    stop();
  });

  it("does not show an old code-request failure after the account changes", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    const late =
      deferred<Awaited<ReturnType<AuthClient["auth"]["signInWithOtp"]>>>();
    fake.signInWithOtp.mockReturnValueOnce(late.promise);
    const request = store.sendCode("alice@example.com");
    fake.getUser.mockResolvedValueOnce(verified("bob"));
    fake.emit("SIGNED_IN", "bob");
    await store.refresh();
    late.resolve({
      data: { user: null, session: null },
      error: new AuthApiError("Old failure", 400, "unexpected_failure"),
    });
    expect((await request).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({
      user: { id: "bob" },
      error: null,
    });
    stop();
  });

  it("does not publish identity from an old OTP result after another account signs in", async () => {
    const fake = client();
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    const late = deferred<AuthResponse>();
    fake.verifyOtp.mockReturnValueOnce(late.promise);
    const verification = store.verifyCode("alice@example.com", "123456");
    fake.getUser.mockResolvedValue(verified("bob"));
    fake.emit("SIGNED_IN", "bob");
    await store.refresh();
    late.resolve({
      data: { user: user("alice"), session: session("alice") },
      error: null,
    });
    expect((await verification).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({
      user: { id: "bob" },
      error: null,
    });
    stop();
  });

  it("honors sign-out errors without claiming the current session ended", async () => {
    const fake = client();
    fake.getUser.mockResolvedValue(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.signOut.mockResolvedValueOnce({
      error: new AuthRetryableFetchError("Provider error", 503),
    });
    expect((await store.signOut()).ok).toBe(false);
    expect(fake.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(store.getSnapshot()).toMatchObject({
      status: "signed-in",
      user: { id: "alice" },
    });
    expect(store.getSnapshot().error).toBeTruthy();
    stop();
  });

  it("keeps signed-out data hidden even if Supabase also returns a sign-out error", async () => {
    const fake = client();
    fake.getUser.mockResolvedValue(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    fake.signOut.mockImplementationOnce(async () => {
      fake.emit("SIGNED_OUT", null);
      return { error: new AuthRetryableFetchError("Provider error", 503) };
    });
    expect((await store.signOut()).ok).toBe(false);
    expect(store.getSnapshot()).toMatchObject({ status: "guest", user: null });
    expect(store.getSnapshot().error).toBeTruthy();
    stop();
  });

  it("cancels old identity reads before attempting local sign-out", async () => {
    const fake = client();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    const late = deferred<UserResponse>();
    fake.getUser.mockReturnValueOnce(late.promise);
    const reading = store.refresh();
    await Promise.resolve();
    expect(await store.signOut()).toEqual({ ok: true });
    late.resolve(verified("alice"));
    await reading;
    expect(store.getSnapshot()).toEqual({
      status: "guest",
      user: null,
      error: null,
    });
    stop();
  });

  it("does not clear a newly signed-in account when an older sign-out completes", async () => {
    const fake = client();
    fake.getUser.mockResolvedValueOnce(verified("alice"));
    const store = createAuthStore(fake.client);
    const stop = store.start();
    await store.refresh();
    const late = deferred<Awaited<ReturnType<AuthClient["auth"]["signOut"]>>>();
    fake.signOut.mockReturnValueOnce(late.promise);
    const signingOut = store.signOut();
    fake.getUser.mockResolvedValueOnce(verified("bob"));
    fake.emit("SIGNED_IN", "bob");
    await store.refresh();
    late.resolve({ error: null });
    expect((await signingOut).ok).toBe(false);
    expect(store.getSnapshot().user?.id).toBe("bob");
    stop();
  });
});
