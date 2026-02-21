/**
 * Web3 skill detection — matches Web3/blockchain-related keywords
 * against a developer's bio, company, or blog fields.
 */

/** Web3-related skill keywords (lowercase). */
export const WEB3_SKILLS = [
  "solidity",
  "ethereum",
  "blockchain",
  "web3",
  "smart contract",
  "defi",
  "nft",
  "dapp",
  "ipfs",
  "dao",
  "token",
  "cryptocurrency",
  "polygon",
  "hardhat",
  "truffle",
  "foundry",
  "vyper",
  "chainlink",
  "cosmos",
  "polkadot",
  "substrate",
] as const;

export type Web3Skill = (typeof WEB3_SKILLS)[number];

/**
 * Detect which Web3 skills appear in the given text fields.
 *
 * Matches are case-insensitive and use word-boundary-aware checks so that
 * partial words (e.g. "token" inside "tokenizer") are not falsely matched
 * for short keywords, while multi-word phrases like "smart contract" are
 * matched as substrings.
 */
export function detectWeb3Skills(
  bio: string | null | undefined,
  company?: string | null,
  blog?: string | null
): Web3Skill[] {
  const text = [bio, company, blog]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return [];

  return WEB3_SKILLS.filter((skill) => {
    // For short keywords (≤4 chars), use word-boundary matching to avoid
    // false positives (e.g. "dao" inside "ecuador").
    if (skill.length <= 4) {
      const re = new RegExp(`(?:^|[^a-z])${skill}(?:[^a-z]|$)`);
      return re.test(text);
    }
    return text.includes(skill);
  });
}
