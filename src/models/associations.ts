export const ASSOCIATIONS_KEY = "SiteAssociations";

export interface SiteAssociation {
  entryHash: string;
  learnedAt: number;
}

export type SiteAssociations = Record<string, SiteAssociation>;

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

export function createChromeLocalStore(): KeyValueStore {
  return {
    async get(key: string) {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        return undefined;
      }
      const result = await chrome.storage.local.get(key);
      return result[key];
    },
    async set(key: string, value: unknown) {
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        return;
      }
      await chrome.storage.local.set({ [key]: value });
    },
  };
}

function asAssociations(value: unknown): SiteAssociations {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: SiteAssociations = {};
  for (const [host, association] of Object.entries(
    value as Record<string, unknown>
  )) {
    if (
      association &&
      typeof association === "object" &&
      "entryHash" in association &&
      typeof (association as SiteAssociation).entryHash === "string"
    ) {
      result[host.toLowerCase()] = {
        entryHash: (association as SiteAssociation).entryHash,
        learnedAt:
          typeof (association as SiteAssociation).learnedAt === "number"
            ? (association as SiteAssociation).learnedAt
            : 0,
      };
    }
  }
  return result;
}

export class SiteAssociationStore {
  constructor(private readonly storage: KeyValueStore) {}

  async getAll(): Promise<SiteAssociations> {
    return asAssociations(await this.storage.get(ASSOCIATIONS_KEY));
  }

  async remember(
    hostname: string,
    entryHash: string
  ): Promise<SiteAssociations> {
    const host = hostname.toLowerCase();
    const associations = await this.getAll();
    associations[host] = {
      entryHash,
      learnedAt: Date.now(),
    };
    await this.storage.set(ASSOCIATIONS_KEY, associations);
    return associations;
  }

  async forget(hostname: string): Promise<SiteAssociations> {
    const host = hostname.toLowerCase();
    const associations = await this.getAll();
    delete associations[host];
    await this.storage.set(ASSOCIATIONS_KEY, associations);
    return associations;
  }

  async forgetEntry(entryHash: string): Promise<SiteAssociations> {
    const associations = await this.getAll();
    for (const host of Object.keys(associations)) {
      if (associations[host].entryHash === entryHash) {
        delete associations[host];
      }
    }
    await this.storage.set(ASSOCIATIONS_KEY, associations);
    return associations;
  }

  getHashForHost(
    hostname: string | null | undefined,
    associations: SiteAssociations,
    registrableDomain?: string | null
  ): string | undefined {
    if (!hostname) {
      return undefined;
    }
    const exact = associations[hostname.toLowerCase()];
    if (exact) {
      return exact.entryHash;
    }
    if (registrableDomain) {
      return associations[registrableDomain.toLowerCase()]?.entryHash;
    }
    return undefined;
  }

  hashesForHost(
    hostname: string | null | undefined,
    associations: SiteAssociations,
    registrableDomain?: string | null
  ): string[] {
    const hashes: string[] = [];
    const exact = hostname
      ? associations[hostname.toLowerCase()]?.entryHash
      : undefined;
    if (exact) {
      hashes.push(exact);
    }
    const parent =
      registrableDomain &&
      registrableDomain.toLowerCase() !== hostname?.toLowerCase()
        ? associations[registrableDomain.toLowerCase()]?.entryHash
        : undefined;
    if (parent && hashes.indexOf(parent) === -1) {
      hashes.push(parent);
    }
    return hashes;
  }
}

let defaultStore: SiteAssociationStore | null = null;

export function getDefaultAssociationStore(): SiteAssociationStore {
  if (!defaultStore) {
    defaultStore = new SiteAssociationStore(createChromeLocalStore());
  }
  return defaultStore;
}
