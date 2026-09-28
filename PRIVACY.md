# ReadToRelay Privacy Policy

**Effective date:** September 28, 2026
**Applies to:** the ReadToRelay browser extension (Chrome and Firefox) and the ReadToRelay website.

ReadToRelay extracts the readable content of a web page so you can read it in a
clean view, and — when you ask it to — publish that content to
[Nostr](https://nostr.com) as long-form Markdown, signed with your own key.

The short version: **your Nostr secret key never leaves your device, and nothing
is transmitted anywhere unless you explicitly click "Post to Nostr."**

## Data stored on your device

The extension stores the following locally, using the browser's extension
storage (`chrome.storage.local` / `browser.storage.local`):

- **Your Nostr secret key** (nsec or hex), so you don't have to re-enter it.
- **Your preferences** — light/dark theme and font size.
- **Your relay list and post tags** — where and how you publish.
- **The article you are currently reading**, kept only as a temporary handoff
  from the page to the reader view. It is discarded after five minutes.

The website stores the same kinds of data in your browser's `localStorage`
instead of extension storage.

None of this leaves your device. The secret key is used locally to sign Nostr
events; it is never transmitted anywhere, not even to the relays you post to.

## Data sent off your device

**Only when you click "Post to Nostr"**, the extension sends a public Nostr
event to the Nostr relays you have configured. That event contains:

- the article content, converted to Markdown;
- the article title and byline (when present);
- the source URL of the article;
- the tags you have configured; and
- a signature produced from your key (the signature does not reveal the key).

The default relays are `relay.damus.io`, `nostr.wine`, `relay.primal.net`,
`nos.lol`, and `nostr.mom`, and you can add or remove relays at any time. Nostr
events are **public**: the relays you send them to store them, and they may be
replicated and retained by other relays, clients, and users. A post
cannot be un-published by the extension.

The developers of ReadToRelay do not operate any Nostr relay and do not receive
a copy of what you post.

## Data we do not collect

- No analytics, telemetry, crash reporting, or usage statistics.
- No accounts, advertising, tracking pixels, or cookies.
- No servers of our own that receive your data.
- We do not sell or share your data.

## Permissions and why they are needed

- `activeTab` — to read the current page, only when you click the extension
  icon.
- `scripting` — to inject the Readability library into that page and extract the
  article.
- `storage` — to save your key, preferences, relays, and tags locally.

## Website-specific note

The website fetches the page you enter through a third-party CORS proxy
(`allorigins.win`), because browsers block direct cross-origin requests from web
pages. The URL you submit is therefore visible to that proxy. The browser
extension does **not** use this proxy; it reads the page directly in your
browser.

## Third-party services

Nostr relays are independent third parties. Their handling of the events you
send them is governed by their own privacy practices, not this policy. Relays
are chosen by you.

## Children

ReadToRelay is not directed at children under 13, and we do not knowingly
collect any personal information from anyone.

## Changes to this policy

We may update this policy from time to time. Material changes will be reflected
in the effective date above.

## Contact

Questions about this policy: **hi@vinneycavallo.com**
