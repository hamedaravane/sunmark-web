# Installable and offline game

## Release behavior

The public name is **Sunmark** (سان‌مارک). The browser title, Apple launcher title, social-sharing metadata, and manifest names use the shared `src/brand.ts` definition. The frontend repository and package are named `sunmark-web`; the live game is served from the root of [sunmarkgame.top](https://sunmarkgame.top). GitHub Pages hosting is retired. The original `/ancient-persia-game/` manifest ID, `ancient-persia` cache prefix, and `ancient-persia.match.v1` save-key prefix remain compatibility identifiers. Package/repository names do not determine the installed app's identity.

Sunmark is a standalone Persian/RTL Phaser PWA. `vite-plugin-pwa` generates the manifest and a Workbox service worker during production builds. `src/pwa/browser.ts` registers it under Vite's deployed base path. The stable manifest identity is `/ancient-persia-game/`, resolved against the origin; launch and worker scope still follow the deployment path. The production CI/CD workflow checks PWA artifacts and deploys the game over HTTPS. Localhost is suitable for development previews. Offline play needs no backend connection after preparation; online multiplayer uses the deployed API. No app-store account or hosted conversion service is required.

The main menu offers offline Play, Play Online and Tutorial. A non-installed browser visit opens dismissible platform installation guidance once at startup; installed/standalone launches omit it. Play resumes an unfinished match, while replacement is confirmed in a modal. New matches then ask for a name; canceling name entry preserves the prior save. The human’s chosen name lives in the existing player snapshot and survives updates/resume, with no separate profile/account storage. Help also opens **نصب و بازی آفلاین** and **ذخیره و بازگشت به منو**. These surfaces use the existing Phaser Graphics/Text renderer and transparent semantic input adapter. Installation guidance stays in the menu. A downloaded game update opens its own confirmation sheet during menu or gameplay, after any existing dialogue/workspace closes.

On supported browsers, **نصب سان‌مارک** invokes the deferred browser installation prompt after the player taps it. The prompt is consumed once, including dismissals. Android Chrome users see More → Install and create shortcut → Install, including older Add to Home screen / Install app labels, with an in-app/other-browser fallback to opening the link in Chrome. iPhone/iPad users see Safari Share → Add to Home Screen instructions, including Open as Web App where offered. In-app browsers may need the player to open the link in a supported browser. Installed/standalone detection hides redundant installation prompts. These capabilities vary by browser; a normal browser session remains playable.

## Repository rename

The repository moved from `hamedaravane/ancient-persia-game` to `hamedaravane/sunmark-web`. The live game is now <https://sunmarkgame.top/>; the former `hamedaravane.github.io/sunmark-web/` Pages site has been retired. Git remotes should use `https://github.com/hamedaravane/sunmark-web.git`. GitHub redirects the old repository URL and Git operations, but does **not** redirect the old project Pages URL; see [GitHub's repository rename documentation](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

`matchStorageKey()` maps `/sunmark-web/` to the original `/ancient-persia-game/` save scope. This preserves the earlier repository-rename behavior within the same browser storage container on the `hamedaravane.github.io` origin. The production domain is a different origin: existing Pages saves do not automatically move to `sunmarkgame.top`. Other deployment paths retain isolated save slots. This does not transfer saves between origins, browsers, or separate iOS installation containers.

The manifest ID remains stable, but an old bookmark or installed launcher may still target the old path, and its service worker cannot control the new path. Existing offline installs may continue serving their cached release. Open the new URL for current releases and update bookmarks; an installed shortcut may need to be added again. Preserve the old installation/site data until any important match is recovered. The retired Pages site does not provide a redirect or cross-origin save migration. Keep legacy identifiers and storage aliases so existing saved data is not rewritten merely because hosting changed.

## Offline assets and updates

The installed game uses a fixed, top-anchored shell and the full `100vh` standalone height, with browser tabs using dynamic height. Dialog and Anahita sizing share this height. Safe-area insets apply to controls; the canvas background and footer painting continue behind system areas. The match header paints its stone surface from the canvas top through its measured bottom, so the notch/status-bar area and side insets blend with the header while names and buttons remain safely inset. This targets the reported iPhone Home Screen gap caused by shortened viewport measurements; on-device verification is required. See [WebKit 254868](https://bugs.webkit.org/show_bug.cgi?id=254868).

Workbox precaches the HTML, all built JavaScript/CSS, local WOFF2 font, runtime WebP images, manifest, and platform icons. This explicitly includes all six lazily rendered Anahita expressions. Unused-but-shipped runtime art is also available offline. Original art under `art/reference/` is never shipped. Individual cache entries are limited to 4 MiB; a release exceeding that limit fails the build/artifact checks instead of silently losing offline art.

The first complete preparation needs connectivity and roughly 11 MiB of uncompressed response bodies, including the current game bundle and icons. HTTP transfers can be smaller through compression. Preparation runs through the worker alongside the playable game; the UI says **آماده برای بازی آفلاین** only once a worker has activated after its precache installation. An interrupted first installation shows a retry. Existing active workers keep serving their installed version while a newer one downloads. Browser storage clearing/eviction can remove offline availability; this is not an irrevocable device installation.

While a page is open, workers wait for explicit update confirmation. `pwa/updateFlow.ts` opens a dedicated **نسخه تازهٔ سان‌مارک آماده‌ست** sheet once per available release, in installed apps and normal browser tabs. Existing tutorial dialogue, trade workspaces, and results are allowed to close first. The player can choose **بعداً** and keep playing; Help's app workspace retains the update action. The update flow preserves the offline Play, Play Online and Tutorial entry points.

Accepting **به‌روزرسانی و بازکردن بازی** synchronously saves confirmed state and narrator progress before activation, including partial opening and bot turns. If an unfinished match cannot be persisted, activation is blocked with a retryable explanation; the player can continue and update after finishing. Unconfirmed placement/trade drafts are not saved, as explained by the prompt. The modal and the platform's updating flag pause bot commands and human input during activation. Starting/resuming is disabled while activation is pending. The waiting worker receives `SKIP_WAITING`; only after that specific worker takes control does the requesting page reload into its precached release. Play resumes the saved match after reload. A 15-second activation timeout exposes retry and releases the activation listener.

Another open tab never reloads without consent. If another tab activates a worker, this page records that its running code needs a refresh and offers the same update confirmation, even though there is no longer a waiting worker. On acceptance it saves and reloads using the already-active version. First-time worker activation does not produce an update prompt.

Checks run on launch, online/focus/visibility changes, and every five minutes while online and visible. Registration bypasses the HTTP cache for worker updates and explicitly checks after registration, including installed-app startup with an already-waiting release. Downloads finish before prompting; failed downloads leave the existing offline release usable. Timers and activation listeners are removed on teardown. When all pages are closed, a waiting worker may activate normally before the next launch. Workbox revisions identify changed assets and clean obsolete precache entries on activation. This is an in-app update mechanism, not a push notification while the app is closed. See [Vite PWA's periodic update guidance](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates) and [prompted updates](https://vite-pwa-org.netlify.app/guide/prompt-for-update).

## Saved matches

`game/persistence/matchStore.ts` stores one version-1 or version-2 local snapshot in localStorage. The storage key includes the deployed path to isolate project sites on the same origin, with the explicit old/new Pages alias described above. The snapshot contains authoritative core state (including starter-roll/partial-placement metadata when opening is unfinished), the fixed human player ID, the last 100 history events, an optional domestic-trading ledger with current offers/consent and bot-attempt memory, and tutorial memory: enabled/paused state, reviewed/practiced lessons, queued dialogue, and replay status. Synchronous writes happen after session changes, including every confirmed move and tutorial acknowledgement; saving does not depend on a page-exit callback.

Launching stays at the main menu; **بازی** resumes the saved unfinished offline match. **آموزش** opens a disposable practice exercise and preserves the saved match. Contextual guidance within an ordinary match resumes with that match. Resume never generates a new board, rolls dice, or replays a historical transition. Human opening settlement/road previews are restored without a target; confirmed pieces, the pending road anchor, and starting-resource grants persist. Completed legacy matches skip the new opening. Human Ahriman relocation is restored without a target. A saved bot roll/Ahriman/action phase continues automatically through the bot runner, retaining its human identity. Legacy snapshots without a human ID use seat one and preserve their board/player count; stale legacy bot-turn narration is dropped while reviewed/practiced memory remains. Optional placement previews, unannounced trade drafts, animation, and ordinary open workspaces are discarded. A pending domestic offer/acceptance involving the human reopens its trade workspace, requiring renewed final review/confirmation after reload; it never transfers resources automatically. Older snapshots without the optional ledger remain valid. Pending narrator dialogue resumes. Finished games remain saved until replacement is confirmed; in-match results remain accessible. Returning to the menu preserves the snapshot; choosing a new match requires confirmation before replacing it.

`validateState.ts` checks fixed board geometry, terrain/number/port bags, references, owners, resources, dice/phase data, and victory consistency before rendering restored data. The topology comparison uses an explicitly constant random source and does not consume game randomness. Malformed, incompatible-version, or unknown-lesson saves remain untouched on load and show a recovery message. There is no migration from future schemas; change the version and provide a migration when saved rules or data change. Storage denial/quota failure does not block play, but a visible message explains that closing the app may lose the match.

Offline saves are local to the browser/app storage container, without account sync or server backup. Online match state is stored separately in PostgreSQL and covered by production database backups; returning to an online seat still requires its guest cookie. Safari and an installed iOS app may use separate storage containers. Concurrent sessions share one save slot within a container; the latest saved session wins. Clearing site data or uninstall/storage policies can remove saves. **بازی** resumes same-device recovery, not cloud durability.

## Icons

`public/icons/` contains PNG exports for 192/512 app icons, a 512 maskable icon, and a 180 Apple touch icon. PNG is intentional platform packaging; in-game illustrations remain optimized WebP. `scripts/export-pwa-icons.py` derives the icons from the preserved victory-emblem PNG using the existing reviewed crop, an opaque navy ground, and proportional resampling. The maskable version keeps the complete emblem inside the central safe circle. No source art or Persian text is repainted. Run `npm run pwa:icons` with Pillow to reproduce them; normal builds use checked-in exports.

## Verification

`npm run check` runs lint, formatting, Node tests, the production build, and `npm run pwa:check`. The artifact check verifies manifest identity/scope/start URLs, platform icon dimensions, controlled update activation, and every shipped offline file, including Anahita's six expressions. Production CI performs this check on the root-path build used by the live domain. Persistence tests cover roll/Ahriman/build recovery, discarded drafts, tutorial continuity, replacement confirmation, invalid/versioned saves, and unavailable storage. Platform tests simulate installation/update/worker events without launching a browser.

To reproduce the deployed path locally:

```sh
npm run build
npm run pwa:check
npm run preview -- --host
```

The service worker is disabled in the ordinary Vite development server to avoid caching source during editing. Test the production preview on localhost or an HTTPS host; a phone visiting a plain HTTP LAN address does not satisfy the secure-context requirement.

GitHub Actions runs CI and automatic production deployment for pushes to `main`. The user performs interactive/device testing; local agent checks stay scoped to low-cost TypeScript/lint/format and Node layout/unit checks unless broader verification is needed for the task. Before announcing the release broadly, check on Android Chrome and iPhone Safari/Home Screen:

1. Install from the startup modal or browser menu; check icon, standalone chrome, RTL, safe areas, and portrait/landscape layout.
2. Wait for offline-ready status, enable airplane mode, fully close/reopen, and start both guided and unguided games. Replay all six expressions from the journal without a missing-art placeholder persisting.
3. Close/reopen after a roll, build, trade, and mandatory Ahriman prompt. Resume the exact board/resources/turn and tutorial progress. Confirm a preview did not spend resources.
4. Return to the menu, cancel new-game replacement, resume, then explicitly replace the save.
5. Deploy a newer version while a match is open: after download, a confirmation appears (after any current dialogue closes). Decline and continue; reopen from Help and accept. Verify that Play restores the board/resources/turn/tutorial after reload, including partial setup. Keep a second tab open: it should offer its own confirmation rather than reload automatically. Also check an installed-app launch with an already-waiting update and a long-running visible session detecting a release within the five-minute check interval.
6. Interrupt first-time preparation, reconnect, and retry. Check startup time and responsiveness while cache installation runs. Verify the visible storage warning with browser storage blocked.

Node/artifact checks do not establish actual browser installation or visual/performance behavior on phones.

## Primary references

- [MDN: making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [Vite PWA: registration](https://vite-pwa-org.netlify.app/guide/register-service-worker), [static assets](https://vite-pwa-org.netlify.app/guide/static-assets), and [prompted updates](https://vite-pwa-org.netlify.app/guide/prompt-for-update)
- [Apple: adding a website to the Home Screen](https://support.apple.com/en-euro/guide/iphone/iph42ab2f3a7/ios)

Android installation copy follows [Chrome’s official Android web-app instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en).
