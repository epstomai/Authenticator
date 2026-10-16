import "mocha";
import { expect } from "chai";

const browserMocha = (globalThis as {
  mocha?: { setup: (ui: string) => void };
}).mocha;
if (browserMocha?.setup) {
  browserMocha.setup("bdd");
}
import {
  parseSiteFromTab,
  getMatchedEntries,
  getMatchedEntriesHash,
  rankEntries,
  scoreEntry,
  getBrandKeys,
  getRegistrableDomain,
  isLearnableHostname,
} from "../../models/matching";

function entry(hash: string, issuer: string, account = "user@example.com") {
  return { hash, issuer, account };
}

describe("adaptive site matching", () => {
  it("parses github.com into github / github.com", () => {
    const site = parseSiteFromTab(
      "https://github.com/login",
      "Sign in to GitHub"
    );
    expect(site.hostname).to.equal("github.com");
    expect(site.domainName).to.equal("github");
    expect(site.title).to.contain("github");
  });

  it("matches github.com to a GitHub issuer", () => {
    const site = parseSiteFromTab("https://github.com/sessions/two-factor", "");
    const entries = [
      entry("slack", "Slack"),
      entry("github", "GitHub"),
      entry("google", "Google"),
    ];
    const matched = getMatchedEntries(
      [site.title, site.domainName, site.hostname],
      entries
    );
    expect(matched.map((item) => item.hash)).to.deep.equal(["github"]);
  });

  it("matches accounts.google.com to Google", () => {
    const site = parseSiteFromTab(
      "https://accounts.google.com/signin/v2/challenge/totp",
      "Google Accounts"
    );
    const entries = [entry("amazon", "Amazon"), entry("google", "Google")];
    const hashes = getMatchedEntriesHash(
      [site.title, site.domainName, site.hostname],
      entries
    );
    expect(hashes).to.deep.equal(["google"]);
  });

  it("matches login.live.com and microsoft.com to Microsoft", () => {
    const live = parseSiteFromTab(
      "https://login.live.com/login.srf",
      "Sign in to Microsoft"
    );
    const microsoft = parseSiteFromTab(
      "https://account.microsoft.com/security",
      "Microsoft account"
    );
    const entries = [
      entry("github", "GitHub"),
      entry("ms", "Microsoft"),
      entry("google", "Google"),
    ];

    expect(
      getMatchedEntriesHash(
        [live.title, live.domainName, live.hostname],
        entries
      )
    ).to.deep.equal(["ms"]);
    expect(
      getMatchedEntriesHash(
        [microsoft.title, microsoft.domainName, microsoft.hostname],
        entries
      )
    ).to.deep.equal(["ms"]);
    expect(getBrandKeys("login.live.com")).to.include("microsoft");
    expect(getBrandKeys("microsoft.com")).to.include("microsoft");
  });

  it("matches id.unity.com against an id.unity.com issuer", () => {
    const site = parseSiteFromTab("https://id.unity.com/account/login", "");
    const entries = [
      entry("unity-id", "id.unity.com"),
      entry("github", "GitHub"),
    ];
    expect(
      getMatchedEntriesHash(
        [site.title, site.domainName, site.hostname],
        entries
      )
    ).to.deep.equal(["unity-id"]);
  });

  it("matches id.unity.com against a Unity issuer via alias", () => {
    const site = parseSiteFromTab("https://id.unity.com/", "");
    const entries = [entry("unity", "Unity"), entry("steam", "Steam")];
    expect(
      getMatchedEntriesHash(
        [site.title, site.domainName, site.hostname],
        entries
      )
    ).to.deep.equal(["unity"]);
  });

  it("honors issuer::hostname hints", () => {
    const site = parseSiteFromTab("https://app.example.net/login", "");
    const entries = [
      entry("hinted", "Corp::app.example.net"),
      entry("other", "Corp"),
    ];
    const hashes = getMatchedEntriesHash(
      [site.title, site.domainName, site.hostname],
      entries
    );
    expect(hashes[0]).to.equal("hinted");
  });

  it("can match on account name when issuer does not", () => {
    const site = parseSiteFromTab("https://github.com/login", "");
    const entries = [entry("acct", "Work SSO", "github.com/octocat")];
    expect(
      getMatchedEntriesHash(
        [site.title, site.domainName, site.hostname],
        entries
      )
    ).to.deep.equal(["acct"]);
  });

  it("includes learned hashes even when issuer/account do not match", () => {
    const site = parseSiteFromTab("https://odd.example.com/", "");
    const entries = [
      entry("remembered", "Something Else", "alice"),
      entry("unrelated", "GitHub", "alice"),
    ];
    const hashes = getMatchedEntriesHash(
      [site.title, site.domainName, site.hostname],
      entries,
      ["remembered"]
    );
    expect(hashes).to.deep.equal(["remembered"]);
    expect(scoreEntry(site, entries[0], ["remembered"])?.reason).to.equal(
      "learned"
    );
  });

  it("ranks learned associations above fuzzy issuer matches", () => {
    const site = parseSiteFromTab("https://github.com/", "");
    const ranked = rankEntries(
      site,
      [entry("fuzzy", "GitHub"), entry("learned", "Random Bank")],
      ["learned"]
    );
    expect(ranked[0].hash).to.equal("learned");
    expect(ranked[0].score).to.be.greaterThan(ranked[1].score);
  });

  it("returns an empty list when nothing matches", () => {
    const site = parseSiteFromTab("https://no-match.example/", "");
    expect(
      getMatchedEntriesHash(
        [site.title, site.domainName, site.hostname],
        [entry("a", "GitHub", "alice"), entry("b", "Google", "alice")]
      )
    ).to.deep.equal([]);
  });

  it("computes registrable domains", () => {
    expect(getRegistrableDomain("accounts.google.com")).to.equal("google.com");
    expect(getRegistrableDomain("login.live.com")).to.equal("live.com");
    expect(getRegistrableDomain("id.unity.com")).to.equal("unity.com");
    expect(getRegistrableDomain("github.com")).to.equal("github.com");
    expect(getRegistrableDomain("www.example.co.uk")).to.equal("example.co.uk");
  });

  it("only treats real sites as learnable hosts", () => {
    expect(isLearnableHostname("github.com")).to.equal(true);
    expect(isLearnableHostname("login.live.com")).to.equal(true);
    expect(isLearnableHostname("")).to.equal(false);
    expect(isLearnableHostname(null)).to.equal(false);
    expect(isLearnableHostname("localhost")).to.equal(true);
  });
});
