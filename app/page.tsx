"use client";

import { useState, useMemo, useCallback } from "react";
import type { UgandaUser, ScrapeResponse } from "@/lib/types/user";

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

  // --- toggle location ---
  const toggleLocation = useCallback(
    (loc: string) => {
      setLocations((prev) =>
        prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc]
      );
    },
    []
  );

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
  }, [response, search, sortKey, hasBio, hasCompany, hasBlog, hasEmail]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>🇺🇬 GitHub Uganda User Finder</h1>

      {/* ---- Search Form ---- */}
      <fieldset style={{ marginBottom: "1.5rem" }}>
        <legend>
          <strong>Search Settings</strong>
        </legend>

        <div style={{ marginBottom: "0.75rem" }}>
          <strong>Locations:</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.25rem" }}>
            {ALL_LOCATIONS.map((loc) => (
              <label key={loc} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                  type="checkbox"
                  checked={locations.includes(loc)}
                  onChange={() => toggleLocation(loc)}
                />
                {loc}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
          <label>
            Min repos:{" "}
            <input
              type="number"
              min={0}
              value={minRepos}
              onChange={(e) => setMinRepos(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Min followers:{" "}
            <input
              type="number"
              min={0}
              value={minFollowers}
              onChange={(e) => setMinFollowers(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Max pages/query:{" "}
            <input
              type="number"
              min={1}
              max={10}
              value={maxPages}
              onChange={(e) => setMaxPages(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Concurrency:{" "}
            <input
              type="number"
              min={1}
              max={10}
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
          <label>
            Min score:{" "}
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              style={{ width: 60 }}
            />
          </label>
        </div>

        <button
          onClick={runScrape}
          disabled={loading || locations.length === 0}
          style={{ padding: "0.5rem 1.5rem", fontWeight: "bold", cursor: "pointer" }}
        >
          {loading ? "Searching…" : "Run Scrape"}
        </button>
      </fieldset>

      {/* ---- Error ---- */}
      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fee",
            border: "1px solid #c00",
            borderRadius: 4,
            marginBottom: "1rem",
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* ---- Stats ---- */}
      {response && (
        <div
          style={{
            padding: "0.75rem",
            background: "#eef6ee",
            border: "1px solid #090",
            borderRadius: 4,
            marginBottom: "1rem",
          }}
        >
          <strong>Results:</strong> {response.stats.totalCandidates} total
          candidates, {response.stats.uniqueUsers} unique,{" "}
          {response.stats.keptAfterFilter} kept after filter.{" "}
          Showing {filteredUsers.length} after client-side filters.
        </div>
      )}

      {/* ---- Client-side Filters ---- */}
      {response && (
        <fieldset style={{ marginBottom: "1rem" }}>
          <legend>
            <strong>Filter &amp; Sort</strong>
          </legend>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search login / name / bio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "0.3rem 0.5rem", width: 220 }}
            />
            <label>
              Sort:{" "}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="score">Score ↓</option>
                <option value="followers">Followers ↓</option>
                <option value="repos">Repos ↓</option>
                <option value="newest">Newest</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={hasBio}
                onChange={() => setHasBio(!hasBio)}
              />{" "}
              Has bio
            </label>
            <label>
              <input
                type="checkbox"
                checked={hasCompany}
                onChange={() => setHasCompany(!hasCompany)}
              />{" "}
              Has company
            </label>
            <label>
              <input
                type="checkbox"
                checked={hasBlog}
                onChange={() => setHasBlog(!hasBlog)}
              />{" "}
              Has blog
            </label>
            <label>
              <input
                type="checkbox"
                checked={hasEmail}
                onChange={() => setHasEmail(!hasEmail)}
              />{" "}
              Has email
            </label>
          </div>
        </fieldset>
      )}

      {/* ---- Download Buttons ---- */}
      {response && (
        <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem" }}>
          <a
            href={`/api/export/json?runId=${encodeURIComponent(response.runId)}`}
            download
            style={btnStyle}
          >
            ⬇ Download JSON
          </a>
          <a
            href={`/api/export/csv?runId=${encodeURIComponent(response.runId)}`}
            download
            style={btnStyle}
          >
            ⬇ Download CSV
          </a>
        </div>
      )}

      {/* ---- Results Table ---- */}
      {filteredUsers.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr>
                {[
                  "",
                  "Username",
                  "Name",
                  "Location",
                  "Followers",
                  "Repos",
                  "Score",
                  "Profile",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      borderBottom: "2px solid #333",
                      padding: "0.4rem",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.login}>
                  <td style={cellStyle}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u.avatar_url}
                      alt={u.login}
                      width={32}
                      height={32}
                      style={{ borderRadius: "50%" }}
                    />
                  </td>
                  <td style={cellStyle}>{u.login}</td>
                  <td style={cellStyle}>{u.name ?? "—"}</td>
                  <td style={cellStyle}>{u.location ?? "—"}</td>
                  <td style={cellStyle}>{u.followers}</td>
                  <td style={cellStyle}>{u.public_repos}</td>
                  <td style={cellStyle}>{u.confidenceScore}</td>
                  <td style={cellStyle}>
                    <a href={u.html_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const cellStyle: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  padding: "0.4rem",
};

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.5rem 1rem",
  background: "#0070f3",
  color: "#fff",
  borderRadius: 4,
  textDecoration: "none",
  fontWeight: "bold",
};
