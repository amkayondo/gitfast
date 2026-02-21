/**
 * Simple CSV string builder for UgandaUser records.
 */

import { UgandaUser } from "./types/user";

const COLUMNS: (keyof UgandaUser)[] = [
  "login",
  "name",
  "location",
  "followers",
  "public_repos",
  "confidenceScore",
  "company",
  "blog",
  "email",
  "html_url",
  "bio",
  "twitter_username",
  "created_at",
  "updated_at",
  "sourceQueries",
];

function escapeCsvField(value: unknown): string {
  if (value == null) return "";
  const str = Array.isArray(value) ? value.join("|") : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(users: UgandaUser[]): string {
  const header = COLUMNS.join(",");
  const rows = users.map((user) =>
    COLUMNS.map((col) => escapeCsvField(user[col])).join(",")
  );
  return [header, ...rows].join("\n");
}
