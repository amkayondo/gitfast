/**
 * In-memory cache keyed by runId.
 *
 * Each entry stores the array of UgandaUser records returned by a scrape run.
 * Entries are evicted after a configurable TTL (default: 30 minutes).
 */

import { UgandaUser } from "./types/user";

interface CacheEntry {
  users: UgandaUser[];
  createdAt: number;
}

const TTL_MS = 30 * 60 * 1000; // 30 minutes

const store = new Map<string, CacheEntry>();

export function cacheSet(runId: string, users: UgandaUser[]): void {
  store.set(runId, { users, createdAt: Date.now() });
}

export function cacheGet(runId: string): UgandaUser[] | null {
  const entry = store.get(runId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    store.delete(runId);
    return null;
  }
  return entry.users;
}

/** Periodically evict expired entries (called internally). */
function evict(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) {
      store.delete(key);
    }
  }
}

// Run eviction every 5 minutes.
if (typeof setInterval !== "undefined") {
  setInterval(evict, 5 * 60 * 1000).unref?.();
}
