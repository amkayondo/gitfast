/**
 * Tests for lib/web3.ts — Web3 skill detection.
 */

import { detectWeb3Skills, WEB3_SKILLS } from "../lib/web3.ts";

// ---------------------------------------------------------------------------
// detectWeb3Skills
// ---------------------------------------------------------------------------

describe("detectWeb3Skills", () => {
  test("returns empty array for null / undefined / empty bio", () => {
    expect(detectWeb3Skills(null)).toEqual([]);
    expect(detectWeb3Skills(undefined)).toEqual([]);
    expect(detectWeb3Skills("")).toEqual([]);
  });

  test("detects single Web3 keyword in bio", () => {
    expect(detectWeb3Skills("I build Solidity smart contracts")).toContain(
      "solidity"
    );
    expect(detectWeb3Skills("Ethereum developer")).toContain("ethereum");
    expect(detectWeb3Skills("Blockchain enthusiast")).toContain("blockchain");
  });

  test("detects multiple Web3 keywords", () => {
    const skills = detectWeb3Skills(
      "Web3 developer working with Solidity and Ethereum. I love DeFi."
    );
    expect(skills).toContain("solidity");
    expect(skills).toContain("ethereum");
    expect(skills).toContain("web3");
    expect(skills).toContain("defi");
  });

  test("is case-insensitive", () => {
    expect(detectWeb3Skills("BLOCKCHAIN")).toContain("blockchain");
    expect(detectWeb3Skills("Solidity")).toContain("solidity");
    expect(detectWeb3Skills("WEB3")).toContain("web3");
  });

  test("detects multi-word phrases like 'smart contract'", () => {
    expect(detectWeb3Skills("Building smart contract audits")).toContain(
      "smart contract"
    );
  });

  test("uses word-boundary matching for short keywords to avoid false positives", () => {
    // "nft" should match when it stands alone
    expect(detectWeb3Skills("NFT collector")).toContain("nft");
    // "dao" should match when standalone
    expect(detectWeb3Skills("DAO governance")).toContain("dao");
  });

  test("returns empty for bios without Web3 keywords", () => {
    expect(detectWeb3Skills("Full-stack JavaScript developer")).toEqual([]);
    expect(detectWeb3Skills("I love cooking and hiking")).toEqual([]);
  });

  test("detects skills from company and blog fields as well", () => {
    const skills = detectWeb3Skills(
      null,
      "Ethereum Foundation",
      "https://defi-blog.example.com"
    );
    expect(skills).toContain("ethereum");
    expect(skills).toContain("defi");
  });

  test("WEB3_SKILLS constant has expected length and content", () => {
    expect(WEB3_SKILLS.length).toBeGreaterThanOrEqual(20);
    expect(WEB3_SKILLS).toContain("solidity");
    expect(WEB3_SKILLS).toContain("ethereum");
    expect(WEB3_SKILLS).toContain("blockchain");
    expect(WEB3_SKILLS).toContain("web3");
    expect(WEB3_SKILLS).toContain("nft");
  });
});
