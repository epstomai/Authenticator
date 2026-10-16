export interface SiteContext {
  title: string | null;
  domainName: string | null;
  hostname: string | null;
}

export interface MatchableEntry {
  hash: string;
  issuer: string;
  account: string;
}

export type MatchReason =
  | "learned"
  | "hostname"
  | "alias"
  | "issuer"
  | "account"
  | "title";

export interface RankedMatch {
  hash: string;
  score: number;
  reason: MatchReason;
}

/**
 * Canonical brand -> tokens that should match that brand's issuer/account
 * names and related hostnames.
 */
export const ISSUER_ALIASES: Record<string, string[]> = {
  microsoft: [
    "microsoft",
    "live",
    "outlook",
    "office",
    "hotmail",
    "xbox",
    "azure",
    "msn",
    "windowslive",
    "onedrive",
    "office365",
    "microsoftonline",
    "passport",
    "skype",
  ],
  google: [
    "google",
    "gmail",
    "youtube",
    "googlemail",
    "withgoogle",
    "googleusercontent",
    "alphabet",
  ],
  github: ["github", "gh", "githubusercontent"],
  unity: ["unity", "unity3d"],
  amazon: ["amazon", "aws", "amazoncognito", "kindle"],
  apple: ["apple", "icloud", "appleid", "itunes"],
  facebook: ["facebook", "meta", "fb", "instagram", "whatsapp"],
  twitter: ["twitter", "x"],
  dropbox: ["dropbox"],
  discord: ["discord", "discordapp"],
  steam: ["steam", "steampowered", "steamcommunity", "valvesoftware"],
  reddit: ["reddit"],
  slack: ["slack"],
  atlassian: ["atlassian", "jira", "confluence", "bitbucket", "trello"],
  adobe: ["adobe"],
  paypal: ["paypal"],
  twitch: ["twitch", "twitchtv"],
  nvidia: ["nvidia"],
  gitlab: ["gitlab"],
  bitwarden: ["bitwarden"],
  cloudflare: ["cloudflare"],
  digitalocean: ["digitalocean"],
  heroku: ["heroku"],
  npm: ["npm", "npmjs"],
  mozilla: ["mozilla", "firefox"],
  yahoo: ["yahoo"],
  linkedin: ["linkedin"],
  netflix: ["netflix"],
  spotify: ["spotify"],
  epicgames: ["epicgames", "epic", "unrealengine"],
  blizzard: ["blizzard", "battle", "battlenet"],
};

/**
 * Exact hostnames (and registrable domains) mapped to a canonical brand.
 */
export const HOST_ALIASES: Record<string, string> = {
  "login.live.com": "microsoft",
  "live.com": "microsoft",
  "login.microsoftonline.com": "microsoft",
  "microsoft.com": "microsoft",
  "account.microsoft.com": "microsoft",
  "account.live.com": "microsoft",
  "outlook.live.com": "microsoft",
  "outlook.com": "microsoft",
  "office.com": "microsoft",
  "office365.com": "microsoft",
  "microsoftonline.com": "microsoft",
  "xbox.com": "microsoft",
  "azure.com": "microsoft",
  "onedrive.com": "microsoft",
  "accounts.google.com": "google",
  "google.com": "google",
  "mail.google.com": "google",
  "myaccount.google.com": "google",
  "gmail.com": "google",
  "youtube.com": "google",
  "github.com": "github",
  "gist.github.com": "github",
  "github.io": "github",
  "id.unity.com": "unity",
  "unity.com": "unity",
  "accounts.unity3d.com": "unity",
  "unity3d.com": "unity",
  "amazon.com": "amazon",
  "aws.amazon.com": "amazon",
  "login.microsoft.com": "microsoft",
  "icloud.com": "apple",
  "appleid.apple.com": "apple",
  "apple.com": "apple",
  "facebook.com": "facebook",
  "meta.com": "facebook",
  "instagram.com": "facebook",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "discord.com": "discord",
  "discordapp.com": "discord",
  "steampowered.com": "steam",
  "store.steampowered.com": "steam",
  "steamcommunity.com": "steam",
};

const SECOND_LEVEL_PUBLIC_SUFFIXES = ["com", "net", "org", "edu", "gov", "co"];

export function normalizeToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

export function siteContextFromLegacy(
  siteName: Array<string | null>
): SiteContext {
  return {
    title: siteName[0] || null,
    domainName: siteName[1] || null,
    hostname: siteName[2] || null,
  };
}

export function parseSiteFromTab(
  url: string | null | undefined,
  title: string | null | undefined
): SiteContext {
  const normalizedTitle = title
    ? title.replace(/[^a-z0-9]/gi, "").toLowerCase()
    : null;

  if (!url) {
    return { title: normalizedTitle, domainName: null, hostname: null };
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return { title: normalizedTitle, domainName: null, hostname: null };
  }

  return {
    title: normalizedTitle,
    domainName: domainNameFromHostname(hostname),
    hostname,
  };
}

export function domainNameFromHostname(hostname: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  if (hostname.indexOf(".") === -1) {
    return hostname.replace(/-/g, "").toLowerCase();
  }

  const hostLevelUnits = hostname.split(".");
  let nameFromDomain = "";

  if (hostLevelUnits.length === 2) {
    nameFromDomain = hostLevelUnits[0];
  } else if (hostLevelUnits.length > 2) {
    if (
      SECOND_LEVEL_PUBLIC_SUFFIXES.indexOf(
        hostLevelUnits[hostLevelUnits.length - 2]
      ) !== -1
    ) {
      nameFromDomain = hostLevelUnits[hostLevelUnits.length - 3];
    } else {
      nameFromDomain = hostLevelUnits[hostLevelUnits.length - 2];
    }
  }

  return nameFromDomain.replace(/-/g, "").toLowerCase();
}

export function getRegistrableDomain(hostname: string): string {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.indexOf(".") === -1) {
    return hostname;
  }

  const parts = hostname.split(".");
  if (
    parts.length > 2 &&
    SECOND_LEVEL_PUBLIC_SUFFIXES.indexOf(parts[parts.length - 2]) !== -1
  ) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

export function getBrandKeys(hostname: string | null): string[] {
  if (!hostname) {
    return [];
  }

  const brands = new Set<string>();
  const registrable = getRegistrableDomain(hostname);
  const domainName = domainNameFromHostname(hostname);

  const exact = HOST_ALIASES[hostname] || HOST_ALIASES[registrable];
  if (exact) {
    brands.add(exact);
  }

  for (const token of [hostname, registrable, domainName]) {
    for (const brand of brandsMatchingToken(normalizeToken(token))) {
      brands.add(brand);
    }
  }

  return [...brands];
}

function brandsMatchingToken(token: string): string[] {
  if (!token) {
    return [];
  }

  const brands: string[] = [];
  for (const [brand, aliases] of Object.entries(ISSUER_ALIASES)) {
    if (brand === token || aliases.indexOf(token) !== -1) {
      brands.push(brand);
    }
  }
  return brands;
}

function issuerParts(
  issuer: string
): { display: string; hostHint: string | null; normalized: string } {
  const parts = issuer.split("::");
  const display = parts[0] || "";
  return {
    display,
    hostHint: parts[1] || null,
    normalized: normalizeToken(display),
  };
}

function containsToken(haystack: string, needle: string): boolean {
  if (!haystack || !needle || needle.length < 3) {
    return false;
  }
  return haystack.indexOf(needle) !== -1;
}

export function scoreEntry(
  site: SiteContext,
  entry: MatchableEntry,
  learnedHashes: string[] = []
): RankedMatch | null {
  if (learnedHashes.indexOf(entry.hash) !== -1) {
    return { hash: entry.hash, score: 1000, reason: "learned" };
  }

  if (!entry.issuer && !entry.account) {
    return null;
  }

  const { display, hostHint, normalized: issuerNorm } = issuerParts(
    entry.issuer || ""
  );
  const accountNorm = normalizeToken(entry.account || "");
  const hostname = (site.hostname || "").toLowerCase();
  const domainName = (site.domainName || "").toLowerCase();
  const title = site.title || "";
  const hostnameNorm = normalizeToken(hostname);
  const brands = getBrandKeys(site.hostname);

  let best: RankedMatch | null = null;

  const consider = (score: number, reason: MatchReason) => {
    if (!best || score > best.score) {
      best = { hash: entry.hash, score, reason };
    }
  };

  if (hostHint && hostname && hostname.indexOf(hostHint.toLowerCase()) !== -1) {
    consider(950, "hostname");
  }

  if (hostname && display.toLowerCase() === hostname) {
    consider(900, "hostname");
  }

  if (hostnameNorm && issuerNorm && issuerNorm === hostnameNorm) {
    consider(880, "hostname");
  }

  if (hostname && display.toLowerCase().indexOf(hostname) !== -1) {
    consider(860, "hostname");
  }

  for (const brand of brands) {
    const aliasTokens = [brand, ...(ISSUER_ALIASES[brand] || [])];
    if (aliasTokens.indexOf(issuerNorm) !== -1) {
      consider(800, "alias");
    }
    if (aliasTokens.indexOf(accountNorm) !== -1) {
      consider(740, "alias");
    }
    for (const token of aliasTokens) {
      if (
        containsToken(issuerNorm, token) ||
        containsToken(token, issuerNorm)
      ) {
        consider(720, "alias");
      }
    }
  }

  if (domainName && issuerNorm === domainName) {
    consider(700, "issuer");
  }

  if (
    containsToken(issuerNorm, domainName) ||
    containsToken(domainName, issuerNorm)
  ) {
    consider(620, "issuer");
  }

  if (title && issuerNorm && title.indexOf(issuerNorm) !== -1) {
    consider(500, "title");
  }

  if (
    containsToken(accountNorm, hostnameNorm) ||
    containsToken(accountNorm, domainName) ||
    containsToken(hostnameNorm, accountNorm)
  ) {
    consider(420, "account");
  }

  return best;
}

export function rankEntries(
  site: SiteContext,
  entries: MatchableEntry[],
  learnedHashes: string[] = []
): RankedMatch[] {
  const ranked: RankedMatch[] = [];
  for (const entry of entries) {
    const match = scoreEntry(site, entry, learnedHashes);
    if (match) {
      ranked.push(match);
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

export function getMatchedEntries<T extends MatchableEntry>(
  siteName: Array<string | null>,
  entries: T[],
  learnedHashes: string[] = []
): T[] {
  const site = siteContextFromLegacy(siteName);
  const ranked = rankEntries(site, entries, learnedHashes);
  const byHash = new Map(entries.map((entry) => [entry.hash, entry]));
  const matched: T[] = [];
  for (const rank of ranked) {
    const entry = byHash.get(rank.hash);
    if (entry) {
      matched.push(entry);
    }
  }
  return matched;
}

export function getMatchedEntriesHash(
  siteName: Array<string | null>,
  entries: MatchableEntry[],
  learnedHashes: string[] = []
): string[] {
  return rankEntries(
    siteContextFromLegacy(siteName),
    entries,
    learnedHashes
  ).map((match) => match.hash);
}

export function isMatchedEntry(
  siteName: Array<string | null>,
  entry: MatchableEntry,
  learnedHashes: string[] = []
): boolean {
  return (
    scoreEntry(siteContextFromLegacy(siteName), entry, learnedHashes) !== null
  );
}

export function isLearnableHostname(
  hostname: string | null | undefined
): hostname is string {
  if (!hostname) {
    return false;
  }
  const lower = hostname.toLowerCase();
  if (
    lower === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(lower) ||
    lower.endsWith(".local")
  ) {
    return true;
  }
  return lower.indexOf(".") !== -1;
}
