// Regenerates the three vendored libraries at the repo root from pinned sources.
// Running `npm ci && npm run vendor` must reproduce them byte-for-byte — AMO
// reviewers use this to verify the bundles (see README "Publishing to the stores").
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// nostr-tools: the standalone bundle shipped inside the npm package, copied verbatim
fs.copyFileSync(
  path.join(root, 'node_modules/nostr-tools/lib/nostr.bundle.js'),
  path.join(root, 'nostr-tools.js')
);
console.log('vendored nostr-tools.js (copied from nostr-tools/lib/nostr.bundle.js)');

// turndown: the npm package's browser UMD build wrapped as an IIFE global by esbuild
execFileSync(
  path.join(root, 'node_modules/.bin/esbuild'),
  [
    'node_modules/turndown/lib/turndown.browser.umd.js',
    '--bundle',
    '--format=iife',
    '--global-name=TurndownService',
    '--outfile=turndown.js',
  ],
  { cwd: root, stdio: 'inherit' }
);
console.log('vendored turndown.js (esbuild bundle of turndown/lib/turndown.browser.umd.js)');

// readability: Readability.js copied verbatim from mozilla/readability at a pinned commit
const READABILITY_COMMIT = 'a07e62c8abfc64b06a28b48dfc76f4150796ed63';
const url = `https://raw.githubusercontent.com/mozilla/readability/${READABILITY_COMMIT}/Readability.js`;
execFileSync('curl', ['-sSfL', url, '-o', path.join(root, 'readability.js')]);
console.log(`vendored readability.js (mozilla/readability @ ${READABILITY_COMMIT.slice(0, 7)})`);
