# Authenticator

A Manifest V3 TOTP/HOTP browser extension, derived from the MIT-licensed
[Authenticator-Extension/Authenticator](https://github.com/Authenticator-Extension/Authenticator)
(commit `9d9660bb73700b3e725800edc22836662d94afac`).

Secrets stay in the browser. This fork does **not** add network sync of codes.
Existing encrypted backups, otpauth:// import/export, and password protection
keep working.

See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE) for attribution.

## What changed in this fork

1. **Modern popup UI** — updated default theme, rounded account cards, clearer
   typography, and an always-visible search field. Manifest V3 is unchanged.
2. **Adaptive site matching** — opening the popup ranks accounts that match the
   current tab at the top (issuer, account, hostname, and brand aliases such as
   `github.com` → GitHub, `accounts.google.com` → Google,
   `login.live.com` / `microsoft.com` → Microsoft, `id.unity.com` → Unity).
3. **Learn from copies** — copying a code while you are on a site stores a
   local `domain → entry` association and prioritizes that entry next time.
   Click **×** on the “Remembered” badge to forget it. Associations are stored
   in `chrome.storage.local` only and never include secrets.
4. **Persistent search** — text typed in the search box is kept for that tab
   across popup close/reopen, and cleared when the tab reloads or navigates.

## Build

```bash
npm ci
npm run chrome      # unpacked extension in ./chrome
# or
npm run firefox     # ./firefox
npm run edge        # ./edge
```

Load unpacked in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** and choose the `chrome/` directory from this repo

Development:

```bash
npm run chrome      # one-off build
```

## Tests

```bash
npm run test:unit         # matching, associations, search persistence
npm test                  # unit tests, then the original Mocha/Puppeteer suite
```

`npm test` builds the test extension (`test/chrome`) and launches Chromium via
Puppeteer. The original component and GOST tests still run there.

## Storage compatibility

Account data, encryption keys, and UserSettings keys are unchanged. New data:

| Key | Area | Contents |
| --- | --- | --- |
| `SiteAssociations` | `chrome.storage.local` | `{ [hostname]: { entryHash, learnedAt } }` |
| `tabSearchQueries` | `chrome.storage.session` | `{ [tabId]: query }` |

Import/export (JSON and `otpauth://` / `otpauth-migration://`) is the upstream
format.

## Caveats

- Vue 2.7, Vuex 3, and Webpack 5 are kept so existing components, drag-and-drop,
  and Mocha component tests keep working. The popup look-and-feel is what was
  modernized, not a Vue 3 rewrite.
- Optional cloud backup (Drive / Dropbox / OneDrive) still needs your own OAuth
  client IDs in `src/models/credentials.ts` if you redistribute the extension.
- Learned associations follow the hostname you copied on (for example
  `gist.github.com`). The parent registrable domain is also checked as a
  fallback.
- Smart Filter (hide non-matching accounts) is still optional in Settings and
  defaults to off, same as upstream.
