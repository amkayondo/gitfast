/**
 * Tests for lib/normalize.ts
 *
 * This covers the confidence scoring logic added for the Next.js app.
 */

import {
  normaliseLocation,
  computeConfidenceScore,
  isUgandaLocation,
  isLikelyUganda,
  UGANDA_CITIES,
} from "../lib/normalize.ts";

// ---------------------------------------------------------------------------
// computeConfidenceScore
// ---------------------------------------------------------------------------

describe("computeConfidenceScore", () => {
  test("returns 0 for empty string", () => {
    expect(computeConfidenceScore("")).toBe(0);
  });

  test("returns 100 when location includes 'uganda'", () => {
    expect(computeConfidenceScore("kampala, uganda")).toBe(100);
    expect(computeConfidenceScore("uganda")).toBe(100);
  });

  test("returns 85 when location includes 'kampala'", () => {
    expect(computeConfidenceScore("kampala")).toBe(85);
    expect(computeConfidenceScore("kampala, east africa")).toBe(85);
  });

  test("returns 75 for other Uganda cities", () => {
    expect(computeConfidenceScore("entebbe")).toBe(75);
    expect(computeConfidenceScore("jinja")).toBe(75);
    expect(computeConfidenceScore("mbarara")).toBe(75);
    expect(computeConfidenceScore("gulu")).toBe(75);
  });

  test("returns 50 for 'ug' abbreviation", () => {
    expect(computeConfidenceScore("nairobi, ug")).toBe(50);
  });

  test("returns 0 for unrelated locations", () => {
    expect(computeConfidenceScore("nairobi, kenya")).toBe(0);
    expect(computeConfidenceScore("london")).toBe(0);
  });

  test("prefers higher score: uganda > kampala", () => {
    expect(computeConfidenceScore("kampala, uganda")).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// isLikelyUganda
// ---------------------------------------------------------------------------

describe("isLikelyUganda", () => {
  test("returns true for high-confidence Uganda locations", () => {
    expect(isLikelyUganda("kampala, uganda")).toBe(true);
    expect(isLikelyUganda("entebbe")).toBe(true);
  });

  test("returns false for empty input", () => {
    expect(isLikelyUganda("")).toBe(false);
  });

  test("returns false for non-Uganda locations", () => {
    expect(isLikelyUganda("london")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normaliseLocation (emoji stripping)
// ---------------------------------------------------------------------------

describe("normaliseLocation (TS version)", () => {
  test("strips emoji from location", () => {
    const result = normaliseLocation("🇺🇬 Kampala");
    expect(result).toBe("kampala");
  });

  test("applies aliases", () => {
    expect(normaliseLocation("UG")).toBe("uganda");
  });
});

// ---------------------------------------------------------------------------
// isUgandaLocation (TS version)
// ---------------------------------------------------------------------------

describe("isUgandaLocation (TS version)", () => {
  test("delegates to computeConfidenceScore > 0", () => {
    expect(isUgandaLocation("kampala")).toBe(true);
    expect(isUgandaLocation("london")).toBe(false);
  });
});
