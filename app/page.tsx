"use client";

import { useState, useMemo, useCallback } from "react";
import type { UgandaUser, ScrapeResponse } from "@/lib/types/user";
import { WEB3_SKILLS, detectWeb3Skills, type Web3Skill } from "@/lib/web3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_LOCATIONS = [
  "Uganda",
  "Kampala",
  "Entebbe",
  "Jinja",
  "Mbarara",
  "Gulu",
  "Mbale",
  "Mukono",
  "Wakiso",
  "Lira",
  "Kasese",
  "Fort Portal",
  "Arua",
  "Soroti",
  "Kabale",
  "Masaka",
];

type SortKey = "score" | "followers" | "repos" | "newest";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomePage() {
  // --- form state ---
  const [locations, setLocations] = useState<string[]>([
    "Uganda",
    "Kampala",
    "Entebbe",
  ]);
  const [minRepos, setMinRepos] = useState(0);
  const [minFollowers, setMinFollowers] = useState(0);
  const [maxPages, setMaxPages] = useState(3);
  const [concurrency, setConcurrency] = useState(5);
  const [minScore, setMinScore] = useState(50);

  // --- results ---
  const [response, setResponse] = useState<ScrapeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- client-side filters ---
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [hasBio, setHasBio] = useState(false);
  const [hasCompany, setHasCompany] = useState(false);
  const [hasBlog, setHasBlog] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);

  // --- web3 filters ---
  const [selectedWeb3Skills, setSelectedWeb3Skills] = useState<Web3Skill[]>([]);

  // --- toggle location ---
  const toggleLocation = useCallback(
    (loc: string) => {
      setLocations((prev) =>
        prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
      );
    },
    []
  );

  // --- toggle web3 skill ---
  const toggleWeb3Skill = useCallback((skill: Web3Skill) => {
    setSelectedWeb3Skills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }, []);

  // --- run scrape ---
  const runScrape = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations,
          minRepos,
          minFollowers,
          maxPagesPerQuery: maxPages,
          perPage: 100,
          concurrency,
          minScore,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ?? `HTTP ${res.status}`
        );
      }

      const data: ScrapeResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [locations, minRepos, minFollowers, maxPages, concurrency, minScore]);

  // --- filtered + sorted users ---
  const filteredUsers = useMemo(() => {
    if (!response) return [];

    let users = [...response.users];

    // text search
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.login.toLowerCase().includes(q) ||
          (u.name?.toLowerCase().includes(q) ?? false) ||
          (u.bio?.toLowerCase().includes(q) ?? false)
      );
    }

    // boolean filters
    if (hasBio) users = users.filter((u) => !!u.bio);
    if (hasCompany) users = users.filter((u) => !!u.company);
    if (hasBlog) users = users.filter((u) => !!u.blog);
    if (hasEmail) users = users.filter((u) => !!u.email);

    // web3 skill filters
    if (selectedWeb3Skills.length > 0) {
      users = users.filter((u) => {
        const skills = detectWeb3Skills(u.bio, u.company, u.blog);
        return selectedWeb3Skills.some((s) => skills.includes(s));
      });
    }

    // sort
    switch (sortKey) {
      case "score":
        users.sort(
          (a, b) =>
            b.confidenceScore - a.confidenceScore || b.followers - a.followers
        );
        break;
      case "followers":
        users.sort((a, b) => b.followers - a.followers);
        break;
      case "repos":
        users.sort((a, b) => b.public_repos - a.public_repos);
        break;
      case "newest":
        users.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        break;
    }

    return users;
  }, [response, search, sortKey, hasBio, hasCompany, hasBlog, hasEmail, selectedWeb3Skills]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight">
        🇺🇬 GitHub Uganda User Finder
      </h1>

      {/* ---- Search Form ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Search Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 text-sm font-semibold">Locations</Label>
            <div className="flex flex-wrap gap-3 mt-1">
              {ALL_LOCATIONS.map((loc) => (
                <Label key={loc} className="font-normal">
                  <Checkbox
                    checked={locations.includes(loc)}
                    onChange={() => toggleLocation(loc)}
                  />
                  {loc}
                </Label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label htmlFor="minRepos">Min repos</Label>
              <Input
                id="minRepos"
                type="number"
                min={0}
                value={minRepos}
                onChange={(e) => setMinRepos(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minFollowers">Min followers</Label>
              <Input
                id="minFollowers"
                type="number"
                min={0}
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="maxPages">Max pages/query</Label>
              <Input
                id="maxPages"
                type="number"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="concurrency">Concurrency</Label>
              <Input
                id="concurrency"
                type="number"
                min={1}
                max={10}
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="w-20"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="minScore">Min score</Label>
              <Input
                id="minScore"
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>

          <Button
            onClick={runScrape}
            disabled={loading || locations.length === 0}
          >
            {loading ? "Searching…" : "Run Scrape"}
          </Button>
        </CardContent>
      </Card>

      {/* ---- Error ---- */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive text-sm">
          ❌ {error}
        </div>
      )}

      {/* ---- Stats ---- */}
      {response && (
        <div className="rounded-lg border border-green-600 bg-green-50 p-4 text-sm dark:bg-green-950/30">
          <strong>Results:</strong> {response.stats.totalCandidates} total
          candidates, {response.stats.uniqueUsers} unique,{" "}
          {response.stats.keptAfterFilter} kept after filter.{" "}
          Showing {filteredUsers.length} after client-side filters.
        </div>
      )}

      {/* ---- Client-side Filters with Tabs ---- */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Filter &amp; Sort</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="web3">Web3 Skills</TabsTrigger>
              </TabsList>

              {/* General filters */}
              <TabsContent value="general" className="pt-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Input
                    type="text"
                    placeholder="Search login / name / bio…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-56"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="sortKey">Sort</Label>
                    <select
                      id="sortKey"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                    >
                      <option value="score">Score ↓</option>
                      <option value="followers">Followers ↓</option>
                      <option value="repos">Repos ↓</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>
                  <Label className="font-normal">
                    <Checkbox
                      checked={hasBio}
                      onChange={(e) => setHasBio(e.target.checked)}
                    />{" "}
                    Has bio
                  </Label>
                  <Label className="font-normal">
                    <Checkbox
                      checked={hasCompany}
                      onChange={(e) => setHasCompany(e.target.checked)}
                    />{" "}
                    Has company
                  </Label>
                  <Label className="font-normal">
                    <Checkbox
                      checked={hasBlog}
                      onChange={(e) => setHasBlog(e.target.checked)}
                    />{" "}
                    Has blog
                  </Label>
                  <Label className="font-normal">
                    <Checkbox
                      checked={hasEmail}
                      onChange={(e) => setHasEmail(e.target.checked)}
                    />{" "}
                    Has email
                  </Label>
                </div>
              </TabsContent>

              {/* Web3 skill filters */}
              <TabsContent value="web3" className="pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Filter developers by Web3 &amp; blockchain skills detected in their bio.
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEB3_SKILLS.map((skill) => (
                    <Badge
                      key={skill}
                      variant={
                        selectedWeb3Skills.includes(skill)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer select-none capitalize"
                      onClick={() => toggleWeb3Skill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
                {selectedWeb3Skills.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setSelectedWeb3Skills([])}
                  >
                    Clear all
                  </Button>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ---- Download Buttons ---- */}
      {response && (
        <div className="flex gap-3">
          <Button asChild>
            <a
              href={`/api/export/json?runId=${encodeURIComponent(response.runId)}`}
              download
            >
              ⬇ Download JSON
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href={`/api/export/csv?runId=${encodeURIComponent(response.runId)}`}
              download
            >
              ⬇ Download CSV
            </a>
          </Button>
        </div>
      )}

      {/* ---- Results Table ---- */}
      {filteredUsers.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Web3 Skills</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Repos</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const web3 = detectWeb3Skills(u.bio, u.company, u.blog);
                return (
                  <TableRow key={u.login}>
                    <TableCell>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.avatar_url}
                        alt={u.login}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{u.login}</TableCell>
                    <TableCell>{u.name ?? "—"}</TableCell>
                    <TableCell>{u.location ?? "—"}</TableCell>
                    <TableCell>
                      {web3.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {web3.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{u.followers}</TableCell>
                    <TableCell>{u.public_repos}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.confidenceScore}</Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        href={u.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4 hover:text-primary/80"
                      >
                        View
                      </a>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
