import "mocha";
import { expect } from "chai";

const browserMocha = (globalThis as {
  mocha?: { setup: (ui: string) => void };
}).mocha;
if (browserMocha?.setup) {
  browserMocha.setup("bdd");
}
import {
  SiteAssociationStore,
  createMemoryStore,
  ASSOCIATIONS_KEY,
} from "../../models/associations";

describe("learned site associations", () => {
  let store: SiteAssociationStore;
  let memory: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    memory = createMemoryStore();
    store = new SiteAssociationStore(memory);
  });

  it("remembers a domain -> entry hash mapping locally", async () => {
    await store.remember("github.com", "entry-github");
    const all = await store.getAll();
    expect(all["github.com"].entryHash).to.equal("entry-github");
    expect(all["github.com"].learnedAt).to.be.a("number");
    const persisted = await memory.get(ASSOCIATIONS_KEY);
    expect(persisted).to.have.property("github.com");
    expect(JSON.stringify(persisted).indexOf("secret")).to.equal(-1);
  });

  it("looks up the hash for a hostname and its registrable domain", async () => {
    await store.remember("github.com", "entry-github");
    const all = await store.getAll();
    expect(store.getHashForHost("github.com", all)).to.equal("entry-github");
    expect(store.getHashForHost("gist.github.com", all, "github.com")).to.equal(
      "entry-github"
    );
    expect(store.hashesForHost("github.com", all)).to.deep.equal([
      "entry-github",
    ]);
  });

  it("prefers an exact hostname over the parent domain", async () => {
    await store.remember("github.com", "parent");
    await store.remember("gist.github.com", "gist");
    const all = await store.getAll();
    expect(store.getHashForHost("gist.github.com", all, "github.com")).to.equal(
      "gist"
    );
  });

  it("allows removing a learned association for a site", async () => {
    await store.remember("id.unity.com", "unity");
    await store.forget("id.unity.com");
    const all = await store.getAll();
    expect(all["id.unity.com"]).to.equal(undefined);
    expect(store.getHashForHost("id.unity.com", all)).to.equal(undefined);
  });

  it("removes every association pointing at a deleted entry", async () => {
    await store.remember("github.com", "shared");
    await store.remember("gitlab.com", "shared");
    await store.remember("google.com", "other");
    const remaining = await store.forgetEntry("shared");
    expect(remaining["github.com"]).to.equal(undefined);
    expect(remaining["gitlab.com"]).to.equal(undefined);
    expect(remaining["google.com"].entryHash).to.equal("other");
  });

  it("ignores malformed stored data", async () => {
    await memory.set(ASSOCIATIONS_KEY, {
      bad: "nope",
      ok: { entryHash: "hash-1", learnedAt: 1 },
    });
    const all = await store.getAll();
    expect(Object.keys(all)).to.deep.equal(["ok"]);
  });
});
