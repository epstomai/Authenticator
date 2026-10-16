export const SEARCH_SESSION_KEY = "tabSearchQueries";

export type TabSearchQueries = Record<string, string>;

export interface KeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export function createMemoryStore(
  initial: Record<string, unknown> = {}
): KeyValueStore {
  const data = { ...initial };
  return {
    async get(key: string) {
      return data[key];
    },
    async set(key: string, value: unknown) {
      data[key] = value;
    },
  };
}

export function createChromeSessionStore(): KeyValueStore {
  return {
    async get(key: string) {
      if (typeof chrome === "undefined" || !chrome.storage?.session) {
        return undefined;
      }
      const result = await chrome.storage.session.get(key);
      return result[key];
    },
    async set(key: string, value: unknown) {
      if (typeof chrome === "undefined" || !chrome.storage?.session) {
        return;
      }
      await chrome.storage.session.set({ [key]: value });
    },
  };
}

function asQueries(value: unknown): TabSearchQueries {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: TabSearchQueries = {};
  for (const [tabId, query] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (typeof query === "string") {
      result[tabId] = query;
    }
  }
  return result;
}

export class TabSearchStore {
  constructor(private readonly storage: KeyValueStore) {}

  async getAll(): Promise<TabSearchQueries> {
    return asQueries(await this.storage.get(SEARCH_SESSION_KEY));
  }

  async save(tabId: number, query: string): Promise<TabSearchQueries> {
    const queries = await this.getAll();
    const key = String(tabId);
    if (query) {
      queries[key] = query;
    } else {
      delete queries[key];
    }
    await this.storage.set(SEARCH_SESSION_KEY, queries);
    return queries;
  }

  async load(tabId: number): Promise<string> {
    const queries = await this.getAll();
    return queries[String(tabId)] || "";
  }

  async clear(tabId: number): Promise<TabSearchQueries> {
    const queries = await this.getAll();
    delete queries[String(tabId)];
    await this.storage.set(SEARCH_SESSION_KEY, queries);
    return queries;
  }
}

let defaultStore: TabSearchStore | null = null;

export function getDefaultTabSearchStore(): TabSearchStore {
  if (!defaultStore) {
    defaultStore = new TabSearchStore(createChromeSessionStore());
  }
  return defaultStore;
}

export function shouldClearSearchOnTabUpdate(changeInfo: {
  status?: string;
  url?: string;
}): boolean {
  return changeInfo.status === "loading" || Boolean(changeInfo.url);
}
