/**
 * GitHub API helpers — search users and fetch profiles.
 *
 * All calls are server-side only and use the GITHUB_TOKEN env var.
 */

import { UgandaUser } from "./types/user";
import {
  normaliseLocation,
  computeConfidenceScore,
  isLikelyUganda,
} from "./normalize";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const GITHUB_API = "https://api.github.com";

/** Per-request timeout for GitHub API calls (ms). */
const GITHUB_API_TIMEOUT_MS = 30_000;

function headers(): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "gitfast-uganda-scraper/1.0.0",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

/**
 * Make a GitHub API request with retry / rate-limit back-off.
 */
async function ghFetch(
  url: string,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, {
      headers: headers(),
      signal: AbortSignal.timeout(GITHUB_API_TIMEOUT_MS),
    });

    if (res.ok) return res;

    const isRateLimit =
      (res.status === 403 || res.status === 429) &&
      (res.headers.get("x-ratelimit-remaining") === "0" ||
        (await res.text()).toLowerCase().includes("rate limit"));

    if (isRateLimit && attempt < maxRetries) {
      const resetAt =
        Number(res.headers.get("x-ratelimit-reset") ?? "0") * 1000;
      const waitMs = Math.max(resetAt - Date.now() + 2000, 5000);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`GitHub API ${res.status}: ${url}`);
  }
  throw new Error("Exhausted retries");
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

interface SearchItem {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

/**
 * Run a single search-users query across multiple pages and return the raw
 * search items.
 */
async function searchUsers(
  query: string,
  maxPages: number,
  perPage: number
): Promise<SearchItem[]> {
  const items: SearchItem[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${GITHUB_API}/search/users?q=${encodeURIComponent(
      query
    )}&per_page=${perPage}&page=${page}`;

    const res = await ghFetch(url);
    const data = await res.json();
    const pageItems: SearchItem[] = (data.items ?? []).map(
      (item: Record<string, unknown>) => ({
        login: item.login as string,
        id: item.id as number,
        avatar_url: item.avatar_url as string,
        html_url: item.html_url as string,
      })
    );

    items.push(...pageItems);

    if (
      pageItems.length === 0 ||
      items.length >= (data.total_count as number)
    ) {
      break;
    }

    // Courtesy delay between pages.
    await sleep(500);
  }

  return items;
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

interface RawProfile {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  location: string | null;
  bio: string | null;
  company: string | null;
  blog: string | null;
  twitter_username: string | null;
  email: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  updated_at: string;
}

async function fetchProfile(login: string): Promise<RawProfile | null> {
  try {
    const res = await ghFetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`);
    return (await res.json()) as RawProfile;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export interface ScrapeOptions {
  locations: string[];
  minRepos: number;
  minFollowers: number;
  maxPagesPerQuery: number;
  perPage: number;
  concurrency: number;
  minScore: number;
}

/**
 * Run the full scrape pipeline and return deduplicated, scored users.
 */
export async function scrapeUsers(
  opts: ScrapeOptions
): Promise<{ users: UgandaUser[]; totalCandidates: number; uniqueUsers: number }> {
  const {
    locations,
    minRepos,
    minFollowers,
    maxPagesPerQuery,
    perPage,
    concurrency,
    minScore,
  } = opts;

  // 1. Build queries and collect logins
  const loginMap = new Map<
    string,
    { item: SearchItem; sourceQueries: string[] }
  >();
  let totalCandidates = 0;

  for (const loc of locations) {
    let q = `location:"${loc}"`;
    if (minRepos > 0) q += ` repos:>${minRepos}`;
    if (minFollowers > 0) q += ` followers:>${minFollowers}`;

    const items = await searchUsers(q, maxPagesPerQuery, perPage);
    totalCandidates += items.length;

    for (const item of items) {
      const existing = loginMap.get(item.login);
      if (existing) {
        existing.sourceQueries.push(q);
      } else {
        loginMap.set(item.login, { item, sourceQueries: [q] });
      }
    }

    // Courtesy delay between distinct queries.
    await sleep(1000);
  }

  const uniqueUsers = loginMap.size;

  // 2. Fetch full profiles with bounded concurrency
  const entries = [...loginMap.values()];
  const users: UgandaUser[] = [];

  // Simple concurrency limiter
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < entries.length) {
      const i = idx++;
      const { item, sourceQueries } = entries[i];
      const profile = await fetchProfile(item.login);
      if (!profile) continue;

      const normLoc = normaliseLocation(profile.location);
      const score = computeConfidenceScore(normLoc);

      if (score < minScore) continue;

      users.push({
        login: profile.login,
        id: profile.id,
        avatar_url: profile.avatar_url,
        html_url: profile.html_url,
        name: profile.name,
        location: profile.location,
        bio: profile.bio,
        company: profile.company,
        blog: profile.blog,
        twitter_username: profile.twitter_username,
        email: profile.email,
        followers: profile.followers,
        following: profile.following,
        public_repos: profile.public_repos,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        confidenceScore: score,
        isLikelyUganda: isLikelyUganda(normLoc),
        sourceQueries,
      });
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () =>
    worker()
  );
  await Promise.all(workers);

  // 3. Sort by confidence score desc, then followers desc
  users.sort(
    (a, b) => b.confidenceScore - a.confidenceScore || b.followers - a.followers
  );

  return { users, totalCandidates, uniqueUsers };
}
