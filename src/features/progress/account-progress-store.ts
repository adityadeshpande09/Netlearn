import { isLessonSlug, type LessonSlug } from "@/content/model";
import type { CloudProgressRepository } from "@/repositories/progress/cloud-progress-repository";
import { normalizeProgress } from "@/repositories/progress/progress-repository";

export interface AccountProgressSnapshot {
  userId: string | null;
  completed: LessonSlug[];
  status: "idle" | "loading" | "syncing" | "synced" | "error";
  pendingCount: number;
}

export interface AccountProgressStore {
  setUser(userId: string | null): Promise<void>;
  complete(slug: LessonSlug): Promise<void>;
  importGuest(slugs: readonly LessonSlug[]): Promise<void>;
  retry(): Promise<void>;
  getSnapshot(): AccountProgressSnapshot;
  subscribe(listener: () => void): () => void;
}

interface AccountSession {
  userId: string;
  confirmed: Set<LessonSlug>;
  pending: Set<LessonSlug>;
  running: Promise<void> | null;
}

export function createAccountProgressStore(
  repository: CloudProgressRepository,
): AccountProgressStore {
  let session: AccountSession | null = null;
  let snapshot: AccountProgressSnapshot = {
    userId: null,
    completed: [],
    status: "idle",
    pendingCount: 0,
  };
  const listeners = new Set<() => void>();

  function publish(
    current: AccountSession | null,
    status: AccountProgressSnapshot["status"],
  ) {
    if (current !== session) return;
    snapshot = {
      userId: current?.userId ?? null,
      completed: current
        ? normalizeProgress([...current.confirmed, ...current.pending])
        : [],
      status,
      pendingCount: current?.pending.size ?? 0,
    };
    listeners.forEach((listener) => listener());
  }

  async function run(current: AccountSession) {
    try {
      if (current !== session) return;
      const remote = await repository.load(current.userId);
      if (current !== session) return;
      for (const slug of normalizeProgress(remote)) {
        current.confirmed.add(slug);
        current.pending.delete(slug);
      }
      while (current === session) {
        const batch = normalizeProgress([...current.pending]);
        if (!batch.length) {
          publish(current, "synced");
          // A subscriber can queue a completion during this notification.
          if (!current.pending.size) return;
          continue;
        }
        publish(current, "syncing");
        await repository.add(current.userId, batch);
        if (current !== session) return;
        for (const slug of batch) {
          current.confirmed.add(slug);
          current.pending.delete(slug);
        }
      }
    } catch {
      if (current === session) publish(current, "error");
    }
  }

  function start(current: AccountSession): Promise<void> {
    if (current !== session) return Promise.resolve();
    if (current.running) return current.running;
    // Begin after assigning running so synchronous repository failures also reset it.
    current.running = Promise.resolve()
      .then(() => run(current))
      .finally(() => {
        current.running = null;
      });
    publish(current, current.pending.size ? "syncing" : "loading");
    return current.running;
  }

  async function synchronize(current: AccountSession) {
    await start(current);
    // Cover completions queued between the final notification and promise cleanup.
    while (
      current === session &&
      current.pending.size &&
      snapshot.status !== "error"
    )
      await start(current);
  }

  function enqueue(slugs: readonly LessonSlug[]): Promise<void> {
    const current = session;
    if (!current) return Promise.resolve();
    let needsSync = false;
    for (const slug of slugs) {
      if (!isLessonSlug(slug) || current.confirmed.has(slug)) continue;
      current.pending.add(slug);
      needsSync = true;
    }
    if (!needsSync) return current.running ?? Promise.resolve();
    if (current.running) publish(current, "syncing");
    return synchronize(current);
  }

  return {
    setUser(userId) {
      if ((session?.userId ?? null) === userId)
        return session?.running ?? Promise.resolve();
      session = userId
        ? { userId, confirmed: new Set(), pending: new Set(), running: null }
        : null;
      if (!session) {
        publish(null, "idle");
        return Promise.resolve();
      }
      return synchronize(session);
    },
    complete: (slug) => enqueue([slug]),
    importGuest: enqueue,
    retry: () => (session ? synchronize(session) : Promise.resolve()),
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
