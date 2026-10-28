# Online verification — 2026-10-28

The merged frontend was **not ready for local browser play** as shipped. Real Docker/Chromium checks reproduced the startup and UI failures below. The fixes are in this change; they do not require a new backend image or a backend checkout.

## Baselines and fixes

Tested `sunmark-web` main at `bc8cdf9` and `sunmark-server` main at `d7201f1`. The desktop stack intentionally consumes the frontend contract's published backend image, `ghcr.io/hamedaravane/sunmark-server:ea3340fad2b88f1bd0671cb4c7e51cd8eb1d03ae`.

| Reproduced failure                                                                                                                                 | Resulting change                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain Compose startup on an empty database skipped migrations. The API stayed unhealthy and the frontend could not start.                          | The separate migration service runs after PostgreSQL health and must exit successfully before API startup. Web still waits for API readiness. API startup does not run migrations itself.      |
| Guest login in Chromium threw `Illegal invocation` before sending any request. Node's fetch had hidden this browser-specific receiver requirement. | The default client request wrapper calls native fetch without binding it to OnlineClient. A receiver-sensitive regression test covers it.                                                      |
| Online scroll clipping used Phaser 4's Canvas-only `setMask` API in WebGL, producing unsupported-operation warnings.                               | WebGL uses external mask filters; Canvas retains geometry masks. Controls share masks per scroll rectangle.                                                                                    |
| Long action panels reduced the scrolling choice list to zero height, hiding development choices.                                                   | Panel children retain their heights and the panel scrolls. An isolated Chromium layout check measured 0px before the fix and 160px afterward; real gameplay also asserts a usable choice area. |

## Recorded checks

A separate Compose project and empty named volume were used without deleting existing game data. The default dependency chain completed migrations with exit code 0, then PostgreSQL/API/web all became healthy. Proxied `/api/v1/health/ready` returned 200. A repeated normal startup applied the migration service safely with existing data. The normal helper also upgraded the existing `sunmark-online` project at localhost:8081 successfully; all services were healthy, readiness returned 200, and its served HTML matched the isolated test stack byte for byte.

`npm run check` passed: 291 Node tests, contract provenance/generated types, lint, formatting, type checking, production build and PWA build checks. All four live client tests passed against the published backend through the frontend proxy, including a complete match, lost acknowledgement and explicit retry, reconnect, rematch, bot setup, access boundaries and exact OpenAPI equality.

All three `npm run test:browser` cases passed on the corrected production Docker build (573.55 seconds for the final run). The full four-player match reached victory after more than 300 UI moves, restored the same guest seat after reload, opened a fresh rematch room and returned to the offline menu without browser exceptions or unsupported-mask warnings. The other cases completed setup with three real server bots and exchanged resources through board selection and proposal/acceptance/final confirmation controls.

The optional `npm run test:browser` suite launches real Chromium, uses separate cookie jars, and clicks semantic controls over the Phaser-rendered game. Commands are submitted by the actual UI, not by a direct test API. Its planner only reads each requesting seat's projected view. It covers full multiplayer gameplay, reload/resume, rematch, return to offline menu, server-bot setup, board pointer selection, and proposal/acceptance/final confirmation of a resource trade. See [Online play](ONLINE_PLAY.md) for commands and screenshot output.

## Limits

Chromium runs with software WebGL in the cloud, using a 390 × 844 viewport and a desktop viewport. This does not establish physical touch behavior, Safari/Firefox compatibility, installed-PWA interaction, or every possible development-card/trade variation.

The local stack exposes only the frontend on desktop loopback. Public HTTPS hosting and cross-device accounts/recovery remain separate deployment/product work. Guest seats remain browser-bound. Chat, spectators and turn deadlines remain outside the current local-play scope.
