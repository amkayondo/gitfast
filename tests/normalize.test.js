/**
 * Tests for src/normalize.js
 */

import {
  normaliseLocation,
  isUgandaLocation,
  UGANDA_CITIES,
} from "../src/normalize.js";

// ---------------------------------------------------------------------------
// normaliseLocation
// ---------------------------------------------------------------------------

describe("normaliseLocation", () => {
  test("returns empty string for null", () => {
    expect(normaliseLocation(null)).toBe("");
  });

  test("returns empty string for undefined", () => {
    expect(normaliseLocation(undefined)).toBe("");
  });

  test("returns empty string for empty string", () => {
    expect(normaliseLocation("")).toBe("");
  });

  test("trims surrounding whitespace", () => {
    expect(normaliseLocation("  Uganda  ")).toBe("uganda");
  });

  test("lowercases the result", () => {
    expect(normaliseLocation("Kampala")).toBe("kampala");
  });

  test("collapses internal whitespace", () => {
    expect(normaliseLocation("Fort  Portal")).toBe("fort portal");
  });

  test("applies alias: 'kampala ug' → 'kampala, uganda'", () => {
    expect(normaliseLocation("Kampala UG")).toBe("kampala, uganda");
  });

  test("applies alias: 'kampala, ug' → 'kampala, uganda'", () => {
    expect(normaliseLocation("Kampala, UG")).toBe("kampala, uganda");
  });

  test("applies alias: 'ug' → 'uganda'", () => {
    expect(normaliseLocation("UG")).toBe("uganda");
  });

  test("does not alter unrecognised locations", () => {
    expect(normaliseLocation("Nairobi, Kenya")).toBe("nairobi, kenya");
  });
});

// ---------------------------------------------------------------------------
// isUgandaLocation
// ---------------------------------------------------------------------------

describe("isUgandaLocation", () => {
  test("returns false for empty string", () => {
    expect(isUgandaLocation("")).toBe(false);
  });

  test("returns true when location contains 'uganda'", () => {
    expect(isUgandaLocation("uganda")).toBe(true);
    expect(isUgandaLocation("kampala, uganda")).toBe(true);
  });

  test("returns true for each known Uganda city", () => {
    for (const city of UGANDA_CITIES) {
      expect(isUgandaLocation(city)).toBe(
        true,
        `Expected "${city}" to be recognised as Uganda`
      );
    }
  });

  test("matches city within a longer string", () => {
    expect(isUgandaLocation("kampala, east africa")).toBe(true);
    expect(isUgandaLocation("jinja, uganda")).toBe(true);
  });

  test("matches 'ug' abbreviation after comma+space", () => {
    expect(isUgandaLocation("kampala, ug")).toBe(true);
  });

  test("matches 'ug' abbreviation after space", () => {
    // "kampala ug" matches the trailing " ug" pattern even without alias normalisation.
    expect(isUgandaLocation("kampala ug")).toBe(true);
  });

  test("does not match 'ug' embedded in another word", () => {
    expect(isUgandaLocation("drug dealer")).toBe(false);
    expect(isUgandaLocation("debugging")).toBe(false);
  });

  test("returns false for unrelated location", () => {
    expect(isUgandaLocation("nairobi, kenya")).toBe(false);
    expect(isUgandaLocation("london")).toBe(false);
    expect(isUgandaLocation("new york")).toBe(false);
  });

  test("full pipeline: normalise then check", () => {
    const cases = [
      "Uganda",
      "Kampala",
      "Kampala, Uganda",
      "JINJA",
      "Entebbe",
      "Kampala UG",
      "Kampala, UG",
    ];
    for (const raw of cases) {
      expect(isUgandaLocation(normaliseLocation(raw))).toBe(
        true,
        `Expected pipeline to accept "${raw}"`
      );
    }
  });
});
