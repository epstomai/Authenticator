import "mocha";
import { expect } from "chai";

const browserMocha = (globalThis as {
  mocha?: { setup: (ui: string) => void };
}).mocha;
if (browserMocha?.setup) {
  browserMocha.setup("bdd");
}
import {
  TabSearchStore,
  createMemoryStore,
  shouldClearSearchOnTabUpdate,
  SEARCH_SESSION_KEY,
} from "../../models/search-session";

describe("tab-scoped search persistence", () => {
  let store: TabSearchStore;

  beforeEach(() => {
    store = new TabSearchStore(createMemoryStore());
  });

  it("keeps a typed query for a tab across popup close/reopen", async () => {
    await store.save(42, "git");
    expect(await store.load(42)).to.equal("git");
    expect(await store.load(99)).to.equal("");
  });

  it("stores queries independently per tab", async () => {
    await store.save(1, "github");
    await store.save(2, "microsoft");
    expect(await store.load(1)).to.equal("github");
    expect(await store.load(2)).to.equal("microsoft");
  });

  it("clears the saved query when the tab reloads or navigates", async () => {
    await store.save(7, "unity");
    expect(shouldClearSearchOnTabUpdate({ status: "loading" })).to.equal(true);
    expect(
      shouldClearSearchOnTabUpdate({ url: "https://id.unity.com/" })
    ).to.equal(true);
    expect(shouldClearSearchOnTabUpdate({ status: "complete" })).to.equal(
      false
    );

    await store.clear(7);
    expect(await store.load(7)).to.equal("");
  });

  it("removes the tab key when the query is emptied", async () => {
    const memory = createMemoryStore();
    store = new TabSearchStore(memory);
    await store.save(3, "abc");
    await store.save(3, "");
    const persisted = await memory.get(SEARCH_SESSION_KEY);
    expect(persisted).to.deep.equal({});
  });
});
