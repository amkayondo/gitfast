export type UgandaUser = {
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

  confidenceScore: number;
  isLikelyUganda: boolean;

  sourceQueries: string[];
};

export type ScrapeRequest = {
  locations: string[];
  minRepos: number;
  minFollowers: number;
  maxPagesPerQuery: number;
  perPage: number;
  concurrency: number;
  minScore: number;
};

export type ScrapeResponse = {
  runId: string;
  stats: {
    totalCandidates: number;
    uniqueUsers: number;
    keptAfterFilter: number;
  };
  users: UgandaUser[];
};
