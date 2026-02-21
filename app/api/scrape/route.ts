import { NextResponse } from "next/server";
import { scrapeUsers, ScrapeOptions } from "@/lib/github";
import { cacheSet } from "@/lib/cache";
import { ScrapeRequest, ScrapeResponse } from "@/lib/types/user";

export async function POST(request: Request) {
  let body: ScrapeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    locations = ["Uganda", "Kampala"],
    minRepos = 0,
    minFollowers = 0,
    maxPagesPerQuery = 3,
    perPage = 100,
    concurrency = 5,
    minScore = 50,
  } = body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return NextResponse.json(
      { error: "locations must be a non-empty array" },
      { status: 400 }
    );
  }

  const opts: ScrapeOptions = {
    locations,
    minRepos,
    minFollowers,
    maxPagesPerQuery: Math.min(maxPagesPerQuery, 10),
    perPage: Math.min(perPage, 100),
    concurrency: Math.min(concurrency, 10),
    minScore,
  };

  try {
    const { users, totalCandidates, uniqueUsers } = await scrapeUsers(opts);

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    cacheSet(runId, users);

    const resp: ScrapeResponse = {
      runId,
      stats: {
        totalCandidates,
        uniqueUsers,
        keptAfterFilter: users.length,
      },
      users,
    };

    return NextResponse.json(resp);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
