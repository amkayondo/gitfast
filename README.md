# gitfast

A **Next.js (App Router)** web app and CLI tool that discovers GitHub users who appear to be in **Uganda** using the GitHub API. Search, filter, review results, and download JSON/CSV.

> **Note:** GitHub's `location` field is free-text and self-reported. Results are **best-effort** and may include false positives or miss users who haven't filled in their location.

---

## Requirements

- Node.js ≥ 18
- A GitHub [Personal Access Token](https://docs.github.com/en/authentication/keeping-your-account-and-data-safe/managing-your-personal-access-tokens) (classic PAT with no extra scopes, or fine-grained with read-only public access)

---

## Setup

```bash
# 1. Clone & install dependencies
git clone https://github.com/amkayondo/gitfast.git
cd gitfast
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and set GITHUB_TOKEN=<your PAT>
```

---

## Web App (Next.js)

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the web UI.

### Features

- **Search form** — select cities, set min repos/followers, max pages, concurrency, and min confidence score
- **Results table** — avatar, username, name, location, followers, repos, confidence score, profile link
- **Client-side filters** — text search (login/name/bio), "has bio", "has company", "has blog", "has email"
- **Sorting** — by score, followers, repos, or newest
- **Download JSON / CSV** — export results as attachment files

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/scrape` | Run a scrape with configurable parameters |
| `GET` | `/api/export/json?runId=...` | Download JSON results |
| `GET` | `/api/export/csv?runId=...` | Download CSV results |

### Confidence Scoring

Each user is assigned a score (0–100) based on their location:
- **100** — location includes "uganda"
- **85** — location includes "kampala"
- **75** — other known Uganda cities
- **50** — "UG" or "U.G." abbreviation
- **0** — no match

---

## CLI Scraper

```bash
npm start
# or
node src/scraper.js
```

On completion two files are written to the project root:
- `uganda_users.json` – array of user objects
- `uganda_users.csv`  – same data as a spreadsheet-friendly CSV

### Environment variables

| Variable      | Default        | Description |
|---------------|----------------|-------------|
| `GITHUB_TOKEN`| *(none)*       | GitHub PAT. Omitting it reduces the rate limit to 60 req/h |
| `OUTPUT_DIR`  | project root   | Directory to write output files |
| `MAX_PAGES`   | `10`           | Max pages fetched per search query (100 results/page) |
| `CONCURRENCY` | `5`            | Parallel user-detail requests |

---

## Output schema

Each record in the JSON/CSV output contains:

| Field             | Description |
|-------------------|-------------|
| `login`           | GitHub username |
| `name`            | Display name |
| `location`        | Raw location string from profile |
| `bio`             | Profile bio |
| `followers`       | Follower count |
| `following`       | Following count |
| `public_repos`    | Number of public repositories |
| `blog`            | Website / blog URL |
| `twitter_username`| Twitter handle (if set) |
| `company`         | Company (if set) |
| `email`           | Public email (rarely available) |
| `html_url`        | GitHub profile URL |
| `created_at`      | Account creation timestamp |
| `updated_at`      | Profile last-updated timestamp |
| `source_query`    | Search query that surfaced this user |

---

## Search strategy

The script runs the following GitHub Search queries and merges the results:

- `location:"Uganda"`
- `location:"Kampala"`
- `location:"Entebbe"`
- `location:"Jinja"`
- `location:"Mbarara"`
- `location:"Gulu"`
- `location:"Mbale"`
- `location:"Mukono"`
- `location:"Wakiso"`

After fetching full profiles, users are filtered through a heuristic location check (`src/normalize.js`) that recognises Uganda city names and common abbreviations (`ug`, `UG`), then sorted by follower count.

---

## Rate limits

The GitHub Search API allows:
- **Unauthenticated:** 10 requests/min, 60 req/h
- **Authenticated:** 30 requests/min, 5 000 req/h

The script automatically waits when it detects a rate-limit response (HTTP 403/429).

---

## Tests

```bash
npm test
```
