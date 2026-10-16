import {
  parseSiteFromTab,
  getMatchedEntries as matchEntries,
  getMatchedEntriesHash as matchEntryHashes,
} from "./models/matching";

export async function getSiteName() {
  const tab = await getCurrentTab();
  let query: URLSearchParams;
  try {
    query = new URLSearchParams(document.location.search.substring(1));
  } catch {
    query = new URLSearchParams();
  }

  let title: string | null;
  let url: string | null;
  const titleFromQuery = query.get("title");
  const urlFromQuery = query.get("url");

  if (titleFromQuery && urlFromQuery) {
    title = decodeURIComponent(titleFromQuery);
    url = decodeURIComponent(urlFromQuery);
  } else {
    if (!tab) {
      return [null, null, null];
    }

    title = tab.title ?? null;
    url = tab.url ?? null;
  }

  const site = parseSiteFromTab(url, title);
  return [site.title, site.domainName, site.hostname];
}

export function getMatchedEntries(
  siteName: Array<string | null>,
  entries: OTPEntryInterface[],
  learnedHashes: string[] = []
) {
  return matchEntries(siteName, entries, learnedHashes);
}

export function getMatchedEntriesHash(
  siteName: Array<string | null>,
  entries: OTPEntryInterface[],
  learnedHashes: string[] = []
) {
  return matchEntryHashes(siteName, entries, learnedHashes);
}

export async function getCurrentTab() {
  const currentWindow = await chrome.windows.getCurrent();
  const queryOptions = { active: true, windowId: currentWindow.id };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  const [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

interface TabWithIdAndURL extends chrome.tabs.Tab {
  id: number;
  url: string;
}

export function okToInjectContentScript(
  tab: chrome.tabs.Tab
): tab is TabWithIdAndURL {
  return (
    tab.id !== undefined &&
    tab.url !== undefined &&
    (tab.url.startsWith("https://") ||
      tab.url.startsWith("http://") ||
      tab.url.startsWith("file://"))
  );
}
