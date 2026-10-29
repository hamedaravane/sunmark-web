# Desktop online testing

The live game is [sunmarkgame.top](https://sunmarkgame.top), with production configuration and automatic releases owned by [deploy/](../deploy/README.md). This document covers the separate local development stack.

No server purchase is required. Install Git and Docker Desktop (or Docker Engine/Compose on Linux). For normal desktop testing, **only this frontend repository is needed**: `compose.yml` pulls the separately published backend image from GHCR and runs it with PostgreSQL and the frontend. The API/migration services share one versioned image reference. No backend source checkout is required to run the game.

From sunmark-web, run `bash scripts/local-online.sh` (macOS/Linux/Git Bash) or `powershell -File scripts/local-online.ps1` (Windows). The helper builds the frontend, starts PostgreSQL, explicitly applies migrations from the backend image, and starts API/web services. Open `http://localhost:8081`, choose **بازی آنلاین**, enter a name, and create a room. Add three bots for a quick solo test, or join with different browser profiles and the invite code. Every occupied seat must be ready before the host starts. Tabs in the same profile share one identity; use different profiles/browsers to simulate different players.

If you prefer direct Compose commands:

```sh
docker compose build web
docker compose up -d --wait postgres
docker compose --profile tools run --rm -T migrate
docker compose up -d --wait api web
```

The default backend tag is its full Git commit SHA, synchronized with `contracts/backend.json`. Set `SUNMARK_SERVER_IMAGE` to an explicit GHCR digest reference for strict immutable pinning or to a different compatible image intentionally. There is no latest tag dependency. `api:check` detects drift between the checked-in default image revision and pinned contract. The backend's Publish backend image workflow builds Linux amd64 images matching production using its managed package-write token; no registry secret belongs in frontend source or Compose.

A newly published GHCR package is normally private. The package owner must make sunmark-server public once for anonymous pulls (GitHub profile → Packages → sunmark-server → Package settings → Change visibility), or desktop users must perform a normal Docker registry login for a private package. Publication and anonymous pull availability must be verified separately from adding the workflow.

The frontend serves an HTTP/WebSocket proxy to the private API. One origin avoids cross-site cookie problems; only the web port is exposed on desktop loopback. Docker data survives stopping/restarting. Guest identity is an HttpOnly browser cookie with a 30-day lifetime, stored on the backend as a hash; clearing cookies loses that guest seat. Local development cookies are intentionally not Secure over loopback HTTP. The public deployment uses HTTPS and Secure cookies. Cross-device account recovery, chat, spectators and game timeouts remain separate product concerns.

Stop with `docker compose stop`. Rerun the helper after updating the frontend/image pin. Do not remove volumes unless deliberately deleting local matches. Set WEB_PORT if port 8081 is occupied. PowerShell helper syntax is provided; the Bash workflow is the one exercised in the cloud Linux environment.

## Authority and controls

The online client validates versioned responses with the pinned shared Zod schemas. It never uploads offline saves, fabricates an authoritative game state, or changes online resource balances locally. It submits strict intents and expected revisions. The server derives identity from the session and checks seat/phase/consent. Available board targets, builds, bank trades and development choices come from the requesting seat's projected legal actions. Select a target/choice and confirm. Mandatory discards, robber relocation/theft and exact proposal/counter/accept/confirm/withdraw flows use the same authority boundary.

Opponent hands, private VP totals, card identifiers and deck ordering are not sent. Private resources and score stay tied to the authenticated seat. Ordinary state arrives as Socket.IO snapshots; older revisions are ignored. Reconnect authenticates and synchronizes without replaying actions. Unknown command outcomes retain their UUID and require an explicit retry, which the server deduplicates. Offline Play/Tutorial and their save keys remain unchanged.

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
