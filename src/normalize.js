/**
 * Location normalizer for Uganda-related GitHub profile locations.
 *
 * GitHub "location" is free-text entered by users, so normalisation is
 * necessarily best-effort.  The functions here:
 *   • normaliseLocation  – clean and lowercase a raw location string
 *   • isUgandaLocation   – heuristic test for Uganda membership
 */

/** Known Ugandan city / region names (lowercase). */
export const UGANDA_CITIES = [
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

/**
 * A map of common shorthand aliases to a normalised canonical form.
 * Keys are lowercase trimmed strings (or substrings) found in location fields.
 */
export const LOCATION_ALIASES = {
  "kampala ug": "kampala, uganda",
  "kampala, ug": "kampala, uganda",
  "ug": "uganda",
};

/**
 * Normalise a raw GitHub location string.
 *
 * Steps:
 *   1. Trim surrounding whitespace.
 *   2. Collapse internal runs of whitespace to a single space.
 *   3. Lowercase the result.
 *   4. Apply known aliases (exact full-string matches).
 *
 * @param {string|null|undefined} raw
 * @returns {string} normalised string (empty string when input is falsy)
 */
export function normaliseLocation(raw) {
  if (!raw) return "";

  let loc = raw.trim().replace(/\s+/g, " ").toLowerCase();

  if (Object.prototype.hasOwnProperty.call(LOCATION_ALIASES, loc)) {
    loc = LOCATION_ALIASES[loc];
  }

  return loc;
}

/**
 * Heuristically decide whether a normalised location string refers to Uganda.
 *
 * Returns true if the location contains:
 *   - the word "uganda", OR
 *   - any entry in UGANDA_CITIES, OR
 *   - the abbreviation " ug" at the end or surrounded by non-alpha chars
 *     (but not as part of another word such as "drug" or "bug").
 *
 * @param {string} normalisedLocation – output of normaliseLocation()
 * @returns {boolean}
 */
export function isUgandaLocation(normalisedLocation) {
  if (!normalisedLocation) return false;

  const loc = normalisedLocation;

  if (loc.includes("uganda")) return true;

  for (const city of UGANDA_CITIES) {
    // Match city as a whole word / token (not as a substring of another word).
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(city)}(?:[^a-z]|$)`);
    if (re.test(loc)) return true;
  }

  // Match " ug" abbreviation: preceded by comma/space, followed by end-of-string or space/comma.
  if (/(?:,\s*| )ug(?:\s*,|\s+|$)/.test(loc)) return true;

  return false;
}

/** Escape special regex characters in a literal string. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
