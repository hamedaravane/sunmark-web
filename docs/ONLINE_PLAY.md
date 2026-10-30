# Desktop online testing

The live game is [sunmarkgame.top](https://sunmarkgame.top), with production configuration and automatic releases owned by [deploy/](../deploy/README.md). This document covers the separate local development stack.

No server purchase is required. Install Git and Docker Desktop (or Docker Engine/Compose on Linux). For normal desktop testing, **only this frontend repository is needed**: `compose.yml` pulls the separately published backend image from GHCR and runs it with PostgreSQL and the frontend. The API/migration services share one versioned image reference. No backend source checkout is required to run the game.

From sunmark-web, run `bash scripts/local-online.sh` (macOS/Linux/Git Bash) or `powershell -File scripts/local-online.ps1` (Windows). The helper builds the frontend, starts PostgreSQL, explicitly applies migrations from the backend image, and starts API/web services. Open `http://localhost:8081`, create an account (or sign in), then choose **بازی آنلاین**. **بازی سریع** automatically groups four waiting people and starts the shared match. **بازی خصوصی** creates a named room immediately, with a five-digit numeric code and invite link. Join with a friend’s code, or add bots to empty seats for a solo test. Joining implies readiness; the host starts when all four seats are filled. Tabs in the same profile share one identity; use different profiles/browsers to simulate different players.

If you prefer direct Compose commands:

```sh
docker compose build web
docker compose up -d --wait postgres
docker compose --profile tools run --rm -T migrate
docker compose up -d --wait api web
```

The default backend tag is its full Git commit SHA, synchronized with `contracts/backend.json`. Set `SUNMARK_SERVER_IMAGE` to an explicit GHCR digest reference for strict immutable pinning or to a different compatible image intentionally. There is no latest tag dependency. `api:check` detects drift between the checked-in default image revision and pinned contract. The backend's Publish backend image workflow builds Linux amd64 images matching production using its managed package-write token; no registry secret belongs in frontend source or Compose.

A newly published GHCR package is normally private. The package owner must make sunmark-server public once for anonymous pulls (GitHub profile → Packages → sunmark-server → Package settings → Change visibility), or desktop users must perform a normal Docker registry login for a private package. Publication and anonymous pull availability must be verified separately from adding the workflow.

The frontend serves an HTTP/WebSocket proxy to the private API. One origin avoids cross-site cookie problems; only the web port is exposed on desktop loopback. Docker data survives stopping/restarting. Account login uses a 30-day HttpOnly cookie stored as a hash on the server. Username/password sign-in restores the same player identity and online seats across devices. Registration can upgrade an existing guest without orphaning seats. Local development cookies are intentionally not Secure over loopback HTTP. The public deployment uses HTTPS and Secure cookies. A recovery key resets forgotten passwords and revokes old sessions. Chat, spectators and game timeouts remain separate product concerns.

Stop with `docker compose stop`. Rerun the helper after updating the frontend/image pin. Do not remove volumes unless deliberately deleting local matches. Set WEB_PORT if port 8081 is occupied. PowerShell helper syntax is provided; the Bash workflow is the one exercised in the cloud Linux environment.

## Authority and controls

The online client validates versioned responses with the pinned shared Zod schemas. It never uploads offline saves, fabricates an authoritative game state, or changes online resource balances locally. It submits strict intents and expected revisions. The server derives identity from the session and checks seat/phase/consent. Available board targets, builds, bank trades and development choices come from the requesting seat's projected legal actions. Select a target/choice and confirm. Mandatory discards, robber relocation/theft and exact proposal/counter/accept/confirm/withdraw flows use the same authority boundary.

Opponent hands, private VP totals, card identifiers and deck ordering are not sent. Private resources and score stay tied to the authenticated seat. Ordinary state arrives as Socket.IO snapshots; older revisions are ignored. Reconnect authenticates and synchronizes without replaying actions. Unknown command outcomes retain their UUID and require an explicit retry, which the server deduplicates. Offline Play/Tutorial use the cached public account name and account-scoped save slots. An existing anonymous offline save moves once into the first account used on that device. Clearing browser storage still removes local offline saves; accounts do not provide cloud save synchronization.

## Development and contracts

For native development, start PostgreSQL and the API from sunmark-server, or use the explicit local backend build override below, set `VITE_API_BASE_URL=http://localhost:3000` if needed, and run `npm run dev` here (default localhost:8080). Use the same hostname for frontend/API so the local cookie is shared. Production builds default to their own origin; the Docker web server proxies `/api/` and `/socket.io/` internally.

Backend source is private; only maintainers with repository access can synchronize contracts or use the backend-dev override. Configure GitHub HTTPS credentials with `gh auth login` and `gh auth setup-git` (or an equivalent Git credential helper); never put tokens in repository URLs or committed files. Ordinary frontend builds verify the checked-in contract offline and need no private-repository token.

After intentional backend contract changes, run `npm run api:sync -- <full-backend-commit-sha>`. It reads that immutable commit through Git, records provenance, copies the shared schema sources, and generates HTTP types. Ordinary builds/tests need no backend checkout or runtime source imports from a sibling repository. `npm run api:check` verifies hashes and generated type drift offline. The backend owns these shared sources; do not independently edit `src/online/shared`.

Run `npm run check` for the offline/client checks and production build. For live integration, start the desktop stack and run `SUNMARK_TEST_API_URL=http://localhost:8081 npm run test:api`, or run `docker compose --profile test run --build --rm test`. Tests use the actual OnlineClient, isolated cookie jars and Socket.IO: four clients play through victory, recover a lost acknowledgement, reconnect, create a new rematch room, reject unauthorized/protocol/origin access, and finish setup with three server bots. These tests do not establish mobile rendering or installed-PWA behavior; user device testing remains necessary.

GitHub Pages hosting is retired. Production and desktop Docker builds enable online play by default. `VITE_ONLINE_ENABLED=false` remains available for intentionally offline-only builds.

## Optional backend source development

Backend contributors can clone sunmark-server beside this checkout and opt into a local image build:

```sh
SUNMARK_BUILD_BACKEND=1 SUNMARK_COMPOSE_OVERRIDE=compose.backend-dev.yml bash scripts/local-online.sh
```

The override uses `sunmark-server-dev:local` for both API and migration services, with a backend build context at `../sunmark-server` (override SUNMARK_SERVER_PATH if needed). It also exposes the API's local development port. The default Compose file has no backend build context or source path dependency. CI cross-repository tests select this override explicitly when testing an unpublished backend revision.

## One match runtime for offline and online play

Both modes mount `src/game/matchRuntime.ts`. It owns `GameHud`, `GameScene`,
`InterfaceScene`, `BackdropScene`, `GameFeedback`, native modal sheets, responsive
layout and pixel-density sizing. There is no online match renderer, board layout,
CSS composition or second set of match controls. The room renderer paints entry
and lobby screens only and sleeps while the common match runtime is active.

`GameSession` supplies local authority, local bots and offline saves.
`OnlineSession` implements the same `MatchSession` presentation contract using
validated server snapshots and authenticated commands. Its `RemoteMatchState` is
explicitly a private projection, not a fabricated full `GameState`: public players
have no exact resources, only the viewer has a development hand, and the deck is
represented by its count. Shared read helpers map public scores and counts; build
planning reuses the core board/own-hand query. Only server-provided legal intents
can be submitted. Server bots continue while local sheets are open.

Both modes use the exact same board camera, terrain variant selection, grid edges,
number tokens, Ahriman, placement previews, input layer, header, dice, resource
shelf, action dock and sheets. The full-viewport backdrop is independent of the
bounded desktop tabletop composition. Room paint coordinates also use the actual
canvas rectangle, so visual controls and their native input targets share an origin.

The online adapter owns connection/pending-request status and explicit retry with
the original command UUID. It never executes local rule transitions or starts local
bots. Public contiguous snapshot changes can trigger shared visual feedback;
revision gaps synchronize without replaying missed actions. A later HTTP receipt
must not replay effects already shown from Socket.IO. Reload/update is blocked
while an online command outcome is uncertain. Closing a negotiation sheet does
not imply server-side withdrawal; cancellation remains an explicit command.

Tests compare equivalent local and remote HUD output exactly, verify private-data
boundaries, and exercise a complete live multiplayer match through the session
methods used by the actual shared HUD. Browser/device testing remains user-owned.

## Player accounts and mobile behavior

Registration is a two-step Persian native form with display name, phone, unique
username, age, gender and password. Phone and demographics remain owner-private;
phone numbers are collected without SMS verification. Gender may be undisclosed.
Passwords and recovery keys are never cached; only ID, display name and username
are stored for disconnected play. New players may defer registration and play
offline. Online entry requires a valid account; legacy guest API clients remain
compatible during installed-client upgrades. Native forms use the existing royal
palette with readable 16px inputs, autofill and password-manager support.

Quick Match polls only while searching, supports cancellation and rejoining, and
shows the current waiting count. A 30-second server heartbeat lease discards stale
unassigned tickets. Four live humans start automatically; no bot fill timer or
new gameplay timeout is introduced. Assigned matches survive cancellation races
and reconnects. New private room names are server generated; old long invite
links still work. The server validates and allocates numeric codes atomically.

The shared runtime requests Screen Wake Lock while a match is active and visible,
releases it on hide/exit/victory/destruction, and reacquires it on return. Unsupported
browsers and OS/battery permission refusals remain playable with ordinary device
sleep behavior. Wake Lock requires a secure context; production already uses HTTPS.
The online code input and all account inputs have at least 16px text to prevent
iOS focus zoom without disabling pinch zoom.
