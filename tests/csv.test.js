/**
 * Tests for lib/csv.ts
 */

import { buildCsv } from "../lib/csv.ts";

describe("buildCsv", () => {
  const sampleUser = {
    login: "testuser",
    id: 123,
    avatar_url: "https://example.com/avatar.png",
    html_url: "https://github.com/testuser",
    name: "Test User",
    location: "Kampala, Uganda",
    bio: "A developer",
    company: "TestCorp",
    blog: "https://blog.example.com",
    twitter_username: "testuser",
    email: "test@example.com",
    followers: 50,
    following: 30,
    public_repos: 10,
    created_at: "2020-01-01T00:00:00Z",
    updated_at: "2023-06-01T00:00:00Z",
    confidenceScore: 100,
    isLikelyUganda: true,
    sourceQueries: ['location:"Uganda"', 'location:"Kampala"'],
  };

  test("produces a header row and data row", () => {
    const csv = buildCsv([sampleUser]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("login");
    expect(lines[0]).toContain("followers");
    expect(lines[1]).toContain("testuser");
  });

  test("returns only header for empty array", () => {
    const csv = buildCsv([]);
    const lines = csv.split("\n");
    expect(lines.length).toBe(1);
  });

  test("joins sourceQueries with pipe", () => {
    const csv = buildCsv([sampleUser]);
    // The pipe-joined value will be CSV-escaped since it contains quotes
    expect(csv).toContain("location:");
    expect(csv).toContain("|");
  });

  test("escapes fields containing commas", () => {
    const user = { ...sampleUser, name: "Last, First" };
    const csv = buildCsv([user]);
    expect(csv).toContain('"Last, First"');
  });
});
