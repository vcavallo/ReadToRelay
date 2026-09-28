# ReadToRelay

![icon](icons/icon128-dark.png)

A browser extension (Chrome and Firefox) **and website** that extracts readable content from web pages and posts it to Nostr as Markdown.

https://github.com/user-attachments/assets/08eea680-c6de-4d72-a6fe-b757fb997192

_The extension/website posts the notes to **your npub**. The "Archiver" npub above was just for that demonstration_.

**_Disclaimer: This app was vibe-coded pretty quickly. It is careful with your nsec, but the repo itself is kind of disorganized. Functionally, it does what it claims to, though!_**

## What it does

### Browser Extension
1. **Click the extension icon** on any web site - wiki pages, blog posts, "paywalled" news articles...
2. **Read the content** in a clean, distraction-free interface
3. **Login with your nsec** (stored locally only)
4. **Post to Nostr** as formatted Markdown

### Website
1. **Enter any URL** on the ReadToRelay website
2. **Read the extracted content** in a clean interface
3. **Login with your nsec** (stored locally in your browser)
4. **Post to Nostr** as formatted Markdown

**Note: the website will likely not work to extract most sites and won't have your auth to accounts for paid platforms.** We probably shouldn't include it at all, actually.


## Installation

### Browser Extension - Chrome/Brave

Find it on the [Chrome web store here](https://chromewebstore.google.com/detail/gfncdikmbmefjjbahjhgkodnhepikecj)

Or install it manually (for fun or development purposes):

1. Download or clone this repository
2. Run `npm install && npm run build` (assembles `dist/chrome/` and `dist/firefox/`)
3. Open Chrome and go to `chrome://extensions/`
4. Enable "Developer mode" (top right toggle)
5. Click "Load unpacked" and select the `dist/chrome/` folder
6. The extension icon will appear in your toolbar

### Browser Extension - Firefox

_Firefox Add-ons listing coming soon._

Install it manually (temporary add-on, removed when Firefox restarts):

1. Download or clone this repository
2. Run `npm install && npm run build`
3. Open Firefox and go to `about:debugging#/runtime/this-firefox`
4. Click "Load Temporary Add-on…" and select `dist/firefox/manifest.json`
5. The extension icon will appear in your toolbar (you may need to pin it from the puzzle-piece menu)

Alternatively, `npx web-ext run --source-dir dist/firefox` launches a fresh Firefox profile with the extension pre-loaded.

## Development

The Chrome and Firefox builds share all their code; only the manifest differs:

- `manifest.chrome.json` — uses a `background.service_worker`
- `manifest.firefox.json` — uses `background.scripts` (Firefox MV3 doesn't support service workers) plus the `browser_specific_settings.gecko` block required by Mozilla: the pinned add-on ID, `strict_min_version` (142, the first version supporting `data_collection_permissions` on Android), and the `data_collection_permissions` declaration that AMO requires for new submissions

Scripts:

- `npm run build` — assembles `dist/chrome/` and `dist/firefox/`, each loadable unpacked
- `npm run package` — builds, then zips both as `dist/readtorelay-<browser>-v<version>.zip` for store submission
- `npm run lint:firefox` — runs Mozilla's `web-ext lint` against the Firefox build

To bump the version, update it in **both** manifest files.

### Publishing to the stores

**Chrome Web Store:** upload `dist/readtorelay-chrome-v<version>.zip` at the [developer dashboard](https://chrome.google.com/webstore/devconsole).

**Firefox Add-ons (AMO):**

1. Run `npm run package` and `npm run lint:firefox` (must show 0 errors)
2. Sign in at the [Add-on Developer Hub](https://addons.mozilla.org/developers/) (any Mozilla account works)
3. Choose "Submit a New Add-on" → "On this site" (listed)
4. Upload `dist/readtorelay-firefox-v<version>.zip`; AMO runs the same validator as `web-ext lint`
5. When asked "Do you use minified, concatenated or machine-generated code?", answer **yes** — the extension vendors three libraries at the repo root. Upload a zip of this repo (without `node_modules/` or `dist/`) as the source package. Reviewers can reproduce all three files byte-for-byte with `npm ci && npm run vendor` (Node 22, network access needed for the readability download):
   - `nostr-tools.js` — verbatim copy of `lib/nostr.bundle.js` from the `nostr-tools@2.16.2` npm package
   - `turndown.js` — `lib/turndown.browser.umd.js` from `turndown@7.2.0`, wrapped as an IIFE global by `esbuild@0.28.1` (exact command in `scripts/vendor.js`)
   - `readability.js` — verbatim copy of `Readability.js` from [mozilla/readability @ `a07e62c8`](https://github.com/mozilla/readability/blob/a07e62c8abfc64b06a28b48dfc76f4150796ed63/Readability.js)
6. Fill in the listing (summary, description, screenshots, category, privacy policy — see [PRIVACY.md](PRIVACY.md))
7. Submit. The add-on is signed and published after automated review; human review may follow.

#### Publishing from the command line

The listing metadata lives in `amo-metadata.json`, so the same submission can be driven by `web-ext sign`:

```bash
npm run package
npx web-ext sign --channel=listed \
  --source-dir dist/firefox --artifacts-dir dist \
  --amo-metadata amo-metadata.json \
  --upload-source-code dist/readtorelay-source.zip \
  --approval-timeout 0 \
  --api-key="$AMO_JWT_ISSUER" --api-secret="$AMO_JWT_SECRET"
```

Get `AMO_JWT_ISSUER` / `AMO_JWT_SECRET` from <https://addons.mozilla.org/developers/addon/api/key/>. Since web-ext v8 this creates the AMO listing on first run. `--approval-timeout 0` makes the command return as soon as the version is submitted instead of waiting for review to finish.

Two things `web-ext sign` cannot set through the create request: the **privacy policy** (AMO stores it separately) and the **screenshots**. Add them in the AMO Developer Hub under the add-on's "Manage Status & Versions" after the first submission.

To build the source package reviewers need:

```bash
nix-shell -p zip --run 'zip -r dist/readtorelay-source.zip . -x "node_modules/*" "dist/*" ".git/*" ".direnv/*"'
```

Later versions are uploaded from the add-on's "Manage Status & Versions" page. The add-on ID is pinned in `manifest.firefox.json` (`browser_specific_settings.gecko.id`), so keep it unchanged between versions.

### Website

1. Open the `website/index.html` file in your browser, or
2. Host the `website/` folder on any web server (GitHub Pages, Netlify, etc.)

The website uses:
- CDN-hosted libraries (nostr-tools, turndown, readability)
- A CORS proxy (allorigins.win) to fetch pages from other domains
- LocalStorage for your nsec, preferences, and relay settings

#### URL Parameter / Bookmarklet Usage

You can pass URLs directly to ReadToRelay by appending them to the URL:

```
file:///path/to/website/index.html#url=https://example.com/article
```

Or if hosted:
```
https://yoursite.com/#url=https://example.com/article
```

This works great as a **bookmarklet**! Create a bookmark with this JavaScript:

```javascript
javascript:(function(){window.open('file:///path/to/ReadToRelay/website/index.html#url='+encodeURIComponent(window.location.href));})();
```

Replace `file:///path/to/ReadToRelay/website/index.html` with your actual path or hosted URL.

#### Mobile Share Target (PWA)

Like the website note above, as a PWA, it won't be logged in to any sites for which you have a privileged account, removing a lot of the utility of the tool...

When hosted on a server with HTTPS:

1. Open the website on your mobile device
2. **"Add to Home Screen"** from your browser menu
3. Now when you **"Share" any webpage** from your browser or apps, you'll see **ReadToRelay** as a share option!
4. Sharing to ReadToRelay will automatically extract and load the article

**Note:** The share target feature requires:
- HTTPS hosting (not available when opening index.html locally)
- Installing the PWA to your home screen
- Modern mobile browser (Chrome, Safari, Edge, etc.)

## Privacy

**Your nsec is never sent anywhere.** It's stored locally (extension storage or browser localStorage) and only used to sign events on your device. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

You can verify this by checking the code:
- **Extension Storage**: `saveSecretKey()` in `reader.js` (saves to extension-local storage: `chrome.storage.local` / `browser.storage.local`)
- **Website Storage**: `website/app.js` (saves to `localStorage`)
- **Signing**: Uses local key with `NostrTools.finalizeEvent`
- **No network calls** except to Nostr relays for posting (and the CORS proxy for the website)

## Features

- Clean reading interface with dark mode
- Adjustable font size
- HTML to Markdown conversion
- Relay management with "public" defaults

![icon](icon-with-bg.jpg)
