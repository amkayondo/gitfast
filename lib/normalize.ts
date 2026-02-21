/**
 * Location normalizer and confidence scoring for Uganda-related GitHub
 * profile locations.
 */

/** Known Ugandan city / region names (lowercase). */
export const UGANDA_CITIES: string[] = [
  "kampala",
  "entebbe",
  "jinja",
  "mbarara",
  "gulu",
  "mbale",
  "mukono",
  "wakiso",
  "lira",
  "kasese",
  "fort portal",
  "arua",
  "soroti",
  "kabale",
  "masaka",
];

/** Aliases for common shorthand location strings. */
const LOCATION_ALIASES: Record<string, string> = {
  "kampala ug": "kampala, uganda",
  "kampala, ug": "kampala, uganda",
  ug: "uganda",
};

/** Escape special regex characters in a literal string. */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalise a raw GitHub location string.
 *
 * Steps:
 *   1. Trim surrounding whitespace.
 *   2. Strip emoji / non-ASCII symbols that users sometimes add.
 *   3. Collapse internal runs of whitespace to a single space.
 *   4. Lowercase the result.
 *   5. Apply known aliases (exact full-string matches).
 */
export function normaliseLocation(raw: string | null | undefined): string {
  if (!raw) return "";

  let loc = raw
    .trim()
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (Object.prototype.hasOwnProperty.call(LOCATION_ALIASES, loc)) {
    loc = LOCATION_ALIASES[loc];
  }

  return loc;
}

/**
 * Compute a Uganda confidence score (0 – 100) for a normalised location.
 *
 * - 100 → location includes "uganda"
 * -  85 → location includes "kampala"
 * -  75 → location includes another known Uganda city
 * -  50 → location includes "ug" or "u.g." abbreviation
 * -   0 → no match
 */
export function computeConfidenceScore(normalisedLocation: string): number {
  if (!normalisedLocation) return 0;

  const loc = normalisedLocation;

  if (loc.includes("uganda")) return 100;

  if (loc.includes("kampala")) return 85;

  for (const city of UGANDA_CITIES) {
    if (city === "kampala") continue;
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(city)}(?:[^a-z]|$)`);
    if (re.test(loc)) return 75;
  }

  // Match "ug" / "u.g." abbreviation
  if (/(?:,\s*| )ug(?:\s*,|\s+|$)/.test(loc)) return 50;
  if (/\bu\.g\.?\b/.test(loc)) return 50;

  return 0;
}

/**
 * Determine whether a normalised location string refers to Uganda.
 */
export function isUgandaLocation(normalisedLocation: string): boolean {
  return computeConfidenceScore(normalisedLocation) > 0;
}

/** Countries that may cause false positives when location is ambiguous. */
const FALSE_POSITIVE_MARKERS = [
  "united states",
  "united kingdom",
  "canada",
  " us ",
  " uk ",
  ", us",
  ", uk",
];

/**
 * Flag likely false positives – locations that mention another country alongside
 * a Uganda-related term.
 */
export function isLikelyUganda(normalisedLocation: string): boolean {
  if (!normalisedLocation) return false;

  const score = computeConfidenceScore(normalisedLocation);
  if (score === 0) return false;

  for (const marker of FALSE_POSITIVE_MARKERS) {
    if (normalisedLocation.includes(marker)) return false;
  }

  return true;
}
