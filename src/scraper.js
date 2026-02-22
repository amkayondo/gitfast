/**
 * GitHub Uganda User Scraper
 *
 * Finds GitHub users whose location field indicates Uganda, then exports the
 * collected profiles to uganda_users.json and uganda_users.csv.
 *
 * Usage:
 *   GITHUB_TOKEN=<pat> node src/scraper.js
 *
 * Environment variables:
 *   GITHUB_TOKEN   – GitHub Personal Access Token (required for higher rate limits)
 *   OUTPUT_DIR     – Directory to write output files (default: project root)
 *   MAX_PAGES      – Maximum pages to fetch per query (default: 10)
 *   CONCURRENCY    – Parallel user-detail requests (default: 5)
 */

import "dotenv/config";
import { Octokit } from "@octokit/rest";
import pLimit from "p-limit";
import { createObjectCsvWriter } from "csv-writer";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normaliseLocation, isUgandaLocation } from "./normalize.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OUTPUT_DIR = process.env.OUTPUT_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 10);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 5);

/** Search queries to run.  Results are merged and deduplicated. */
const SEARCH_QUERIES = [
  'location:"Uganda"',
  'location:"Kampala"',
  'location:"Entebbe"',
  'location:"Jinja"',
  'location:"Mbarara"',
  'location:"Gulu"',
  'location:"Mbale"',
  'location:"Mukono"',
  'location:"Wakiso"',
];

// ---------------------------------------------------------------------------
// Octokit client
// ---------------------------------------------------------------------------

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  userAgent: "gitfast-uganda-scraper/1.0.0",
  request: {
    timeout: 30_000,
  },
});

// ---------------------------------------------------------------------------
// Rate-limit helpers
// ---------------------------------------------------------------------------

/**
 * Sleep for `ms` milliseconds.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait until the GitHub rate-limit window resets, then resume.
 * @param {import("@octokit/rest").OctokitResponse<unknown>} response
 */
async function waitForRateLimit(response) {
  const resetAt = Number(response.headers["x-ratelimit-reset"] ?? 0) * 1000;
  const now = Date.now();
  const waitMs = Math.max(resetAt - now + 1000, 5000); // at least 5 s
  console.warn(`Rate limited – waiting ${Math.ceil(waitMs / 1000)} s …`);
  await sleep(waitMs);
}

/**
 * Wrap an Octokit call with simple retry logic for 403 / 429 rate-limit errors.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [maxRetries=3]
 * @returns {Promise<T>}
 */
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.status;
      const isRateLimit =
        (status === 403 || status === 429) &&
        (err?.response?.headers?.["x-ratelimit-remaining"] === "0" ||
          err?.message?.toLowerCase().includes("rate limit"));

      if (isRateLimit && attempt < maxRetries) {
        await waitForRateLimit(err.response ?? { headers: {} });
        continue;
      }
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Search / fetch helpers
// ---------------------------------------------------------------------------

/**
 * Collect GitHub user logins from a single search query across multiple pages.
 *
 * @param {string} query – GitHub Search Users query string
 * @returns {Promise<string[]>} list of logins
 */
async function searchLogins(query) {
  const logins = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    let data;
    try {
      const response = await withRetry(() =>
        octokit.rest.search.users({
          q: query,
          per_page: 100,
          page,
        })
      );
      data = response.data;
    } catch (err) {
      console.error(`Error searching "${query}" page ${page}: ${err.message}`);
      break;
    }

    const items = data.items ?? [];
    for (const item of items) {
      logins.push(item.login);
    }

    // Stop early when we have received all available results.
    if (items.length === 0 || logins.length >= data.total_count) break;

    // Small courtesy delay between search pages.
    await sleep(500);
  }

  return logins;
}

/**
 * Fetch the full public profile for a single GitHub user login.
 *
 * @param {string} login
 * @param {string} sourceQuery – the search query that surfaced this login
 * @returns {Promise<object|null>} normalised user record, or null on error
 */
async function fetchUser(login, sourceQuery) {
  try {
    const { data } = await withRetry(() =>
      octokit.rest.users.getByUsername({ username: login })
    );

    return {
      login: data.login,
      name: data.name ?? null,
      location: data.location ?? null,
      bio: data.bio ?? null,
      followers: data.followers,
      following: data.following,
      public_repos: data.public_repos,
      blog: data.blog ?? null,
      twitter_username: data.twitter_username ?? null,
      company: data.company ?? null,
      email: data.email ?? null,
      html_url: data.html_url,
      created_at: data.created_at,
      updated_at: data.updated_at,
      source_query: sourceQuery,
    };
  } catch (err) {
    console.error(`Failed to fetch user "${login}": ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!GITHUB_TOKEN) {
    console.warn(
      "Warning: GITHUB_TOKEN is not set. Unauthenticated requests are severely rate-limited (60 req/h)."
    );
  }

  // 1. Collect logins from all queries.
  console.log("Starting search phase …");
  const loginToQuery = new Map(); // login → first query that surfaced it

  for (const query of SEARCH_QUERIES) {
    console.log(`  Searching: ${query}`);
    const logins = await searchLogins(query);
    console.log(`    Found ${logins.length} results`);

    for (const login of logins) {
      if (!loginToQuery.has(login)) {
        loginToQuery.set(login, query);
      }
    }

    // Courtesy delay between distinct queries.
    await sleep(1000);
  }

  console.log(`\nTotal unique logins found: ${loginToQuery.size}`);

  // 2. Fetch full profiles with bounded concurrency.
  console.log("Fetching user profiles …");
  const limit = pLimit(CONCURRENCY);
  const tasks = [...loginToQuery.entries()].map(([login, query]) =>
    limit(() => fetchUser(login, query))
  );
  const rawUsers = await Promise.all(tasks);

  // 3. Filter to confirmed Uganda locations.
  const ugandaUsers = rawUsers.filter((user) => {
    if (!user) return false;
    return isUgandaLocation(normaliseLocation(user.location));
  });

  console.log(`\nUsers confirmed as Uganda-based: ${ugandaUsers.length}`);

  // 4. Sort by followers descending for convenient browsing.
  ugandaUsers.sort((a, b) => b.followers - a.followers);

  // 5. Write JSON output.
  const jsonPath = path.join(OUTPUT_DIR, "uganda_users.json");
  await fs.writeFile(jsonPath, JSON.stringify(ugandaUsers, null, 2), "utf8");
  console.log(`JSON saved → ${jsonPath}`);

  // 6. Write CSV output.
  const csvPath = path.join(OUTPUT_DIR, "uganda_users.csv");
  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: "login", title: "login" },
      { id: "name", title: "name" },
      { id: "location", title: "location" },
      { id: "bio", title: "bio" },
      { id: "followers", title: "followers" },
      { id: "following", title: "following" },
      { id: "public_repos", title: "public_repos" },
      { id: "blog", title: "blog" },
      { id: "twitter_username", title: "twitter_username" },
      { id: "company", title: "company" },
      { id: "email", title: "email" },
      { id: "html_url", title: "html_url" },
      { id: "created_at", title: "created_at" },
      { id: "updated_at", title: "updated_at" },
      { id: "source_query", title: "source_query" },
    ],
  });
  await csvWriter.writeRecords(ugandaUsers);
  console.log(`CSV saved → ${csvPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
