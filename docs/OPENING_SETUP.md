# Player-chosen opening

## Official rule reference

The researched source is CATAN's official [Base Game Rules & Almanac, Set-Up Phase, printed page 12](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf#page=12), including its clockwise/counterclockwise placement diagram and text. This is the variable-board player-choice opening, rather than the preassigned beginner map.

The highest two-dice roller starts. Each seat places a settlement and immediately an adjacent road, clockwise. Round two runs backward, so the last seat places two pairs consecutively and the starter places their second pair last. Every settlement obeys the distance rule; the second need not connect to the first. Its road must touch that second settlement. Only the second settlement grants resources, immediately, one per adjacent productive hex. The starter takes the first production turn after all pairs are complete.

The base-game paragraph does not specify a tied-highest-roll procedure. Sunmark resolves that implementation detail by rerolling only the tied highest contenders until one remains; this policy is explicit rather than attributed to an unstated base-game rule. Opening rolls never produce resources or activate seven. Initial pieces are free.

## Core model

`createGame()` now returns an empty generated board and `setup-roll`. `core/setup.ts` owns starter selection, opening target legality, immutable placement, second-settlement grants, and the forward/reverse seat calculation. After starter selection the phases alternate `setup-settlement` → `setup-road`. The final road enters ordinary `roll` on the chosen starter. No paid building, bank trade, end-turn, city upgrade, production roll, or Ahriman move is legal during setup.

`GameState.startingPlayerIndex` records the chosen starter; ordinary round numbers increase when seat order returns to that starter. Missing values in legacy matches retain the earlier seat-zero behavior. `GameState.setup` holds either contenders/current contest rolls or an ordered list of completed pair settlement IDs plus a pending settlement anchor. The anchor survives closing/reloading between the settlement and road. Completing a road appends that anchor to the pair list; no resource grant runs during road placement or resume.

`GameCommand` includes `setup-roll` and `setup` placement commands. Bots choose their own opening sites by production, variety, and port value, then a legal road at the required anchor. Human choices are never delegated to the planner. The existing bot runner handles all opening bot commands, preserving dialog/visibility pauses and stale-callback guards.

## Human experience

Normal Play and Tutorial share this opening. The human rolls to select the starter, chooses each of their two settlement sites, then the direction of its adjoining road. Board taps or the destination list preview a choice; the primary action confirms it. Clearing selection only clears a preview; a confirmed settlement remains and still requires its road. The dock labels opening pieces as free, and paid-build/trade controls are unavailable until setup ends.

Unselected legal settlement sites use small intersection markers; only a selected preview draws a full building. Site-list labels include adjacent resource types and production numbers. The header/hand retain the human identity while bots choose their own sites. Context/history announce opening rolls, ties, and the chosen starter without swapping the human hand.

Anahita introduces the contest/order, first settlement, required adjoining road, second settlement/resources, then the first ordinary roll. Setup placement earns setup practice, not practice for paid roads/settlements. The second-settlement dialogue remains valid when bots still have placements left. Existing art is retained.

## Recovery and verification

`validateSetup.ts` checks partial opening phases, contender order/dice, selected starter bounds, exact pair/anchor ownership and piece counts, attached roads, untouched desert Ahriman, and expected second-settlement resource totals. Every intermediate state can be saved; previews are discarded on resume, while confirmed anchors and grants persist.

Completed legacy matches stay in their current phase with their existing pieces/resources. They are never sent through setup again. Obsolete automatic-setup instructions queued in those saves are dropped, while reviewed/practiced memory and intentional journal replay remain available. App/save identifiers stay stable.

`tests/setup.test.ts` exercises all starter seats for three/four-player engines, forward/reverse order, consecutive pairs at the reversal, immediate and unique grants, costs/phase guards, occupied/adjacent sites, wrong-anchor roads, human preview/clear/confirmation, bot-started openings, partial saves, tie rounds, malformed snapshots, and narrator pauses. Existing post-opening tests now use test-only helpers that complete the real opening through commands. The user handles device/game testing, production builds, and CI; routine agent verification uses focused Node tests and TypeScript/lint/format checks.

This change adopts the requested initial-piece rules. Sunmark's existing map generation, port slots, unlimited piece/bank supply, and ten-point victory rule remain as documented in [GAME_RULES.md](GAME_RULES.md).

## Decision guidance (2026-11-11)

The opening ribbon identifies the human's four placement steps. After selecting a
location, **بررسی محل** opens an optional review without committing anything.
Settlement reviews show adjacent resource-number odds, new resource coverage and
port access; second-settlement reviews list the immediate one-per-productive-tile
grant. Roads explain expansion without promising a legal future settlement. The
accessible destination list includes the same site facts for comparison. Returning
from review preserves the preview and requires ordinary explicit confirmation.
No locations are ranked and probability is not a guarantee of income.
