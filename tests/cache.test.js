/**
 * Tests for lib/cache.ts
 */

import { cacheSet, cacheGet } from "../lib/cache.ts";

describe("cache", () => {
  test("returns null for unknown runId", () => {
    expect(cacheGet("nonexistent")).toBeNull();
  });

  test("stores and retrieves users by runId", () => {
    const users = [
      {
        login: "testuser",
        id: 1,
        avatar_url: "",
        html_url: "",
        name: null,
        location: null,
        bio: null,
        company: null,
        blog: null,
        twitter_username: null,
        email: null,
        followers: 0,
        following: 0,
        public_repos: 0,
        created_at: "",
        updated_at: "",
        confidenceScore: 100,
        isLikelyUganda: true,
        sourceQueries: [],
      },
    ];
    cacheSet("run-1", users);
    const result = cacheGet("run-1");
    expect(result).toEqual(users);
  });
});
