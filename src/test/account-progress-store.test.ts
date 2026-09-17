import { describe, expect, it, vi } from "vitest";
import type { LessonSlug } from "@/content/model";
import { createAccountProgressStore } from "@/features/progress/account-progress-store";
import type { CloudProgressRepository } from "@/repositories/progress/cloud-progress-repository";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function setup() {
  const load = vi.fn<CloudProgressRepository["load"]>().mockResolvedValue([]);
  const add = vi
    .fn<CloudProgressRepository["add"]>()
    .mockResolvedValue(undefined);
  return { load, add, store: createAccountProgressStore({ load, add }) };
}

describe("account progress synchronization", () => {
  it("keeps signed-out state empty without reading or writing account progress", async () => {
    const { store, load, add } = setup();
    await store.complete("routers");
    await store.importGuest(["switches"]);
    await store.retry();
    expect(store.getSnapshot()).toEqual({
      userId: null,
      completed: [],
      status: "idle",
      pendingCount: 0,
    });
    expect(load).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
  });

  it("loads on login without importing guest progress or writing rows", async () => {
    const { store, load, add } = setup();
    const request = deferred<LessonSlug[]>();
    load.mockReturnValueOnce(request.promise);
    const login = store.setUser("account-a");
    expect(store.getSnapshot()).toEqual({
      userId: "account-a",
      completed: [],
      status: "loading",
      pendingCount: 0,
    });
    request.resolve(["routers", "network-basics", "routers"]);
    await login;
    expect(store.getSnapshot()).toEqual({
      userId: "account-a",
      completed: ["network-basics", "routers"],
      status: "synced",
      pendingCount: 0,
    });
    await store.setUser("account-a");
    expect(load).toHaveBeenCalledTimes(1);
    expect(add).not.toHaveBeenCalled();
  });

  it("queues completion during login and unions it with the remote response", async () => {
    const { store, load, add } = setup();
    const request = deferred<LessonSlug[]>();
    load.mockReturnValueOnce(request.promise);
    const login = store.setUser("account-a");
    const completion = store.complete("switches");
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches"],
      status: "syncing",
      pendingCount: 1,
    });
    request.resolve(["routers"]);
    await Promise.all([login, completion]);
    expect(add).toHaveBeenCalledExactlyOnceWith("account-a", ["switches"]);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches", "routers"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("does not write a queued completion that the in-flight load already confirms", async () => {
    const { store, load, add } = setup();
    const request = deferred<LessonSlug[]>();
    load.mockReturnValueOnce(request.promise);
    const login = store.setUser("account-a");
    const completion = store.complete("switches");
    request.resolve(["switches"]);
    await Promise.all([login, completion]);
    expect(add).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches"],
      pendingCount: 0,
      status: "synced",
    });
  });

  it("drains new completions arriving during a write without dropping either batch", async () => {
    const { store, add } = setup();
    await store.setUser("account-a");
    const firstWrite = deferred<void>();
    const nextWrite = deferred<void>();
    add
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(nextWrite.promise);
    const first = store.complete("routers");
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    const next = store.complete("switches");
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches", "routers"],
      pendingCount: 2,
    });
    firstWrite.resolve(undefined);
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(add).toHaveBeenNthCalledWith(2, "account-a", ["switches"]);
    nextWrite.resolve(undefined);
    await Promise.all([first, next]);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches", "routers"],
      pendingCount: 0,
      status: "synced",
    });
  });

  it("keeps offline work visible and retries it with newly discovered remote completions", async () => {
    const { store, load, add } = setup();
    const request = deferred<LessonSlug[]>();
    load.mockReturnValueOnce(request.promise);
    const login = store.setUser("account-a");
    const completion = store.complete("routers");
    request.reject(new Error("Offline"));
    await Promise.all([login, completion]);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["routers"],
      status: "error",
      pendingCount: 1,
    });
    load.mockResolvedValueOnce(["switches"]);
    await store.retry();
    expect(add).toHaveBeenCalledExactlyOnceWith("account-a", ["routers"]);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches", "routers"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("handles an ambiguous failed write idempotently when retry finds the row saved", async () => {
    const { store, load, add } = setup();
    await store.setUser("account-a");
    add.mockRejectedValueOnce(new Error("Response lost"));
    await store.complete("routers");
    expect(store.getSnapshot()).toMatchObject({
      completed: ["routers"],
      status: "error",
      pendingCount: 1,
    });
    load.mockResolvedValueOnce(["routers"]);
    await store.retry();
    await store.complete("routers");
    expect(add).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["routers"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("ignores the old account's late load and discards its queued completions", async () => {
    const { store, load, add } = setup();
    const oldRequest = deferred<LessonSlug[]>();
    const newRequest = deferred<LessonSlug[]>();
    load
      .mockReturnValueOnce(oldRequest.promise)
      .mockReturnValueOnce(newRequest.promise);
    const oldLogin = store.setUser("account-a");
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    const oldCompletion = store.complete("routers");
    const newLogin = store.setUser("account-b");
    expect(store.getSnapshot()).toEqual({
      userId: "account-b",
      completed: [],
      status: "loading",
      pendingCount: 0,
    });
    newRequest.resolve(["network-basics"]);
    await newLogin;
    oldRequest.resolve(["packet-travel"]);
    await Promise.all([oldLogin, oldCompletion]);
    expect(add).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual({
      userId: "account-b",
      completed: ["network-basics"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("ignores an old write failure after the next account has synchronized", async () => {
    const { store, load, add } = setup();
    await store.setUser("account-a");
    const oldWrite = deferred<void>();
    add.mockReturnValueOnce(oldWrite.promise);
    const oldCompletion = store.complete("routers");
    await vi.waitFor(() => expect(add).toHaveBeenCalledTimes(1));
    load.mockResolvedValueOnce(["network-basics"]);
    await store.setUser("account-b");
    await store.complete("switches");
    oldWrite.reject(new Error("Old token expired"));
    await oldCompletion;
    expect(add).toHaveBeenLastCalledWith("account-b", ["switches"]);
    expect(store.getSnapshot()).toEqual({
      userId: "account-b",
      completed: ["network-basics", "switches"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("clears pending work on sign-out and does not revive it on the next login", async () => {
    const { store, load, add } = setup();
    const request = deferred<LessonSlug[]>();
    load.mockReturnValueOnce(request.promise);
    const login = store.setUser("account-a");
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    const completion = store.complete("routers");
    await store.setUser(null);
    expect(store.getSnapshot()).toEqual({
      userId: null,
      completed: [],
      status: "idle",
      pendingCount: 0,
    });
    request.resolve(["switches"]);
    await Promise.all([login, completion]);
    await store.setUser("account-a");
    expect(store.getSnapshot()).toMatchObject({
      completed: [],
      status: "synced",
      pendingCount: 0,
    });
    expect(add).not.toHaveBeenCalled();
  });

  it("imports guest progress only explicitly and adds only unconfirmed lessons", async () => {
    const { store, load, add } = setup();
    load.mockResolvedValue(["routers"]);
    await store.setUser("account-a");
    expect(add).not.toHaveBeenCalled();
    await store.importGuest(["switches", "routers", "switches"]);
    await store.importGuest(["switches", "routers"]);
    expect(add).toHaveBeenCalledExactlyOnceWith("account-a", ["switches"]);
    expect(store.getSnapshot()).toMatchObject({
      completed: ["switches", "routers"],
      status: "synced",
      pendingCount: 0,
    });
  });

  it("refreshes remote progress without overwriting known completions", async () => {
    const { store, load, add } = setup();
    load.mockResolvedValueOnce(["routers"]);
    await store.setUser("account-a");
    load.mockResolvedValueOnce(["network-basics", "switches"]);
    await store.retry();
    expect(store.getSnapshot()).toMatchObject({
      completed: ["network-basics", "switches", "routers"],
      status: "synced",
    });
    expect(add).not.toHaveBeenCalled();
  });

  it("recovers from synchronous repository failures and provides stable subscribed snapshots", async () => {
    const { store, load } = setup();
    const notify = vi.fn();
    const unsubscribe = store.subscribe(notify);
    const initial = store.getSnapshot();
    expect(store.getSnapshot()).toBe(initial);
    load.mockImplementationOnce(() => {
      throw new Error("Unavailable repository");
    });
    await store.setUser("account-a");
    expect(store.getSnapshot().status).toBe("error");
    await store.retry();
    expect(store.getSnapshot().status).toBe("synced");
    expect(notify).toHaveBeenCalled();
    unsubscribe();
    notify.mockClear();
    await store.setUser(null);
    expect(notify).not.toHaveBeenCalled();
  });
});
