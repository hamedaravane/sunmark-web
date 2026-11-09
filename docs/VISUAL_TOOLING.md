# Visual tooling

Browser verification is a separate, opt-in task; it does not run in the normal unit-test or production pipeline.

## Browser automation

Install dependencies with `npm ci`. This cloud workspace already supplies Chromium
at `/usr/bin/chromium` and all its shared-library dependencies. We reuse it rather
than downloading a duplicate browser or installing Firefox/WebKit. Both browser
commands automatically use it. On another machine, `npm run browser:install`
installs Playwright's Chromium headless shell and OS dependencies (OS package installation may
need administrator privileges). Set `PLAYWRIGHT_MCP_EXECUTABLE_PATH` to override
the executable; otherwise the managed Playwright browser is used when system
Chromium is absent. Container launch options disable the browser sandbox; use only
for local project testing, not arbitrary untrusted websites.

From the repository root, in separate terminals:

```sh
npm run browser:dev
npm run browser:verify
```

The dev server binds to localhost:4173 with online services disabled for isolated,
backend-free verification. This environment requires network permission even to
bind localhost. No production accounts, saves or analytics are used. Capture
mobile (390 × 844) and desktop (1440 × 900) character dialogs and in-game practice,
inspect `output/playwright/*-accessibility.yml`, and read `verification.json` for
uncaught browser errors. Override `PLAYWRIGHT_BASE_URL` for another local server.
These are reproducible smoke captures, not approved visual regression baselines
or a comprehensive accessibility audit. Phaser canvas pixels must be inspected
alongside the semantic DOM; DOM snapshots alone cannot prove visual correctness.

For interactive exploration with the installed official OpenAI Playwright skill:

```sh
npm run browser:cli -- open http://127.0.0.1:4173
npm run browser:cli -- snapshot
# Use actual current snapshot refs, never guessed ids:
npm run browser:cli -- click e5
npm run browser:cli -- screenshot --filename=output/playwright/review.png
npm run browser:cli -- close
```

CLI options are in `.playwright/cli.config.json`. The wrapper uses the locally
pinned CLI, writable artifact cache, isolated profiles and existing browser.
Screenshots, snapshots and caches are ignored by git. Temporary browser contexts
are discarded on close. Playwright can also be imported from `playwright` for
focused scripts; there is no additional test framework or Python browser install.

## Project-local Codex skills

The discoverable `.agents/skills/<name>/SKILL.md` directory contains verified
upstream copies. `.agents/skills-sources.json` records exact repositories, commits
and source paths. Bundled scripts, references and provided licenses are retained.
Reopen the Codex project/session to refresh skill discovery; the AGENTS index also
makes each skill directly readable immediately. No global home-directory install
is required. Upstream files are excluded from this app's formatter/linter.

- OpenAI `playwright`: browser interactions, snapshots, screenshots, traces.
- OpenAI `screenshot`: desktop capture fallback when browser capture is unsuitable.
- Anthropic `frontend-design`: intentional visual design, responsive composition,
  typography, focus and reduced-motion guidance.
- Vercel `web-design-guidelines`: UI/UX and accessibility review; fetches maintained
  upstream guidelines when invoked.

No dedicated game UI/UX skill was present in the inspected official OpenAI catalog;
none was invented or installed from an unverified source. Apply the installed
skills together with the game's Phaser, Persian RTL, touch-target, responsive and
art-direction guidance. Installation does not authorize redesign. Future browser
work still needs to match the user's requested scope.

The official Playwright CLI currently pins a Playwright alpha dependency. The direct API dependency is pinned to that same upstream version to avoid a duplicate browser engine package; both CLI and API paths are verified here. Update these pins together and rerun capture verification when upgrading.

## Repeatable UI review

```sh
npm run browser:ui -- review
npm run browser:ui -- review mobile --hub-only
npm run browser:ui -- story --story-only
```

The full review uses fresh contexts at 390×844, 820×1180 and 1440×900. It captures
home, characters, name entry, Anahita, rolling, the board, construction, keyboard
expanded details, pause and trade. It places a practice road through the destination
list and ordinary confirmation controls. The story review starts a real offline
match, captures the participant introduction and verifies all three rivals speak.
It disables Anahita only in that isolated context to inspect the rival sequence.
Screenshots and error reports are in `output/playwright/ui/<review-name>/`.
Optional `mobile`, `tablet` or `desktop` narrows a run. Use separate names for
before/after captures. Visually inspect the PNGs; these scripts do not establish
pixel-perfect correctness. Online services, real devices and complete matches
require separate verification.

## Full product redesign review

The development-only `?review` route prepares rare phases with memory storage and
mounts the real Phaser game UI. `UI_REDESIGN_STATE.md` inventories the screen
families and records design decisions. Start `npm run browser:dev`, then run one
browser script at a time in memory-constrained environments:

```sh
node scripts/design-review.mjs review
node scripts/design-review.mjs review mobile --screens=home,build,trade,development
node scripts/flow-review.mjs review
node scripts/practice-review.mjs review
node scripts/entry-review.mjs review
```

The first command captures 43 game states at 390×844, 820×1180 and 1440×900.
The flow review verifies real resource payments, card selection/effects, negotiation,
keyboard disclosures, preference switches and mandatory choices. Practice review
starts at the normal home and completes the entire guided exercise and reward.
Entry review uses actual account and online controllers, isolated contexts and
intercepted API responses. Screenshots and JSON reports are written under
`output/playwright/redesign/<name>/`. Filtered captures preserve the full inventory
and write an `inventory-refinements.json` report separately.

Authenticated account/progression/referral/privacy fixtures require a second local
server with online features enabled; all API calls are intercepted in the browser:

```sh
VITE_ONLINE_ENABLED=true npx vite --host 127.0.0.1 --port 4174 --strictPort
node scripts/auth-review.mjs review
node scripts/startup-review.mjs review
```

Startup review opens the ordinary route, verifies guest-first entry and the online
account gate, and intercepts unavailable service responses.

These are fixture-driven UI checks, not tests against a live multiplayer backend.
Do not run these fixtures against production. The review route and its prepared
state are removed by Vite's production build. Native input, keyboard and canvas
pixels still require visual inspection; no automatic screenshot approval is implied.
The `ready()` fixture waits for visible character textures before capture, so an
asset-loading placeholder is not mistaken for the final artwork.

## Cinematic menu review

`node scripts/cinematic-review.mjs cinematic-final` captures all ten requested
viewport sizes plus ultrawide and a 320px phone. It verifies undistorted loaded
layers, touch-target bounds and horizontal overflow. An optional third argument
selects a viewport name. `node scripts/cinematic-interactions.mjs` checks keyboard
focus/settings, profile, real match save/resume, missing-art fallback, enlarged
text, rotation and reduced motion. Both use existing Chromium/Playwright with fresh
local contexts and write under `output/playwright/redesign/`. The existing
practice, onboarding, entry and 43-screen design fixtures remain usable.
