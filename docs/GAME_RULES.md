# Game rules

This document records the playable single-player game. New games have exactly four seats: one human and three local bots in fixed clockwise seat order. Ordinary matches use these rules. The menu Tutorial is a separate, disposable practice exercise; contextual narration can also be enabled in an ordinary match through Help. Legacy three-player saves retain their existing board/player count, with seat one controlled by the human. The separate online flow uses these same four-seat rules with authenticated human seats and host-selected bots; no turn deadlines, automatic human takeover or other expansions are introduced. Development cards, official seven resolution, scoring titles and ten-point victory are specified below and in [DEVELOPMENT_AND_SCORING.md](DEVELOPMENT_AND_SCORING.md).

## Board setup

- Generate a radius-two hex board containing 19 tiles.
- Tile counts: four forests, three mesas, four wheat fields, four pastures, three mountains, and one desert.
- Terrain-to-resource mapping: forest → wood, mesa → brick, wheat field → wheat, pasture → wool, mountain → stone. Desert produces nothing.
- Follow CATAN Variable Setup: shuffle the 19 terrain tiles, then place the 18 number tokens in the fixed A–R sequence `5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11`. Start at the upper-left corner of the displayed island, spiral counterclockwise around the outer ring, continue into the inner ring and then the center, and skip the desert without consuming a token. Number tokens are never shuffled independently. This keeps red tokens (6 and 8) off adjacent hexes for every desert position. Existing saved boards retain their original distribution.
- Ahriman starts on the desert.
- Nine ports occupy fixed, separated coastal edges: four general ports and one specialist for each of wood, brick, wheat, wool, and stone. Shuffle the port types using the same supplied random source as the board. Each port connects to exactly the two endpoints of its coastal edge.
- The board begins without player pieces. Each player rolls two dice to choose the highest roller as starter; these rolls do not produce resources or activate seven. Tied highest players reroll among themselves (Sunmark's explicit tie-resolution policy).
- Each seat chooses and confirms a free settlement, then a free adjoining road, before the next seat acts. First round goes clockwise from the chosen starter; second round goes counterclockwise from the last seat. For a starter at seat 1, four-player pairs follow **1–2–3–4–4–3–2–1**. The starter then takes the first ordinary turn.
- All starting settlements obey the distance rule, including opponents' pieces. Starting settlements need no road connection; the second can be separate from the first. Each starting road must attach to the settlement just placed, not another settlement/network.
- Each player's second confirmed settlement immediately grants one resource per adjacent productive tile, including repeated resources from multiple tiles of the same type. The first settlement and both roads grant nothing. No dice production, trade, paid building, upgrades, or end-turn occurs during setup.

This initial-piece flow follows [CATAN's official Rules & Almanac, Set-Up Phase, page 12](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf#page=12). Implementation, tie-policy attribution, recovery, and test coverage are detailed in [OPENING_SETUP.md](OPENING_SETUP.md).

## Turn and production

- The active player rolls two six-sided dice at the start of a turn.
- A total from 2 to 12 activates every productive tile with that number.
- Each adjacent settlement produces one unit of the tile's resource for its owner; each adjacent city produces two.
- Ahriman on a tile blocks that tile's production.
- A seven produces nothing. Every player with more than seven resource cards chooses exactly half (rounded down) to discard; development cards do not count. After all discards, the active player moves Ahriman to a different hex (desert allowed), then chooses one adjacent opponent with resources and steals one uniformly random resource card. No eligible victim means no theft. All ordinary actions remain blocked until resolution is complete. A Knight moves/steals without triggering discards.
- After resolving the roll and any Ahriman move, the active player can take actions until ending the turn. The human ends their own turn manually; bots choose and execute their turns automatically in the existing seat order. Bots pay identical costs, use eligible bank/port rates, move Ahriman when required, and receive only ordinary production. There are no bot resource gifts or forced rolls. There is no action limit in the MVP.

## Building

- Road cost: one wood and one brick.
- Settlement cost: one wood, one brick, one wheat, and one wool.
- City upgrade cost: two wheat and three stone.
- A road occupies one unoccupied board edge and must connect at one endpoint to the player's own building or an existing road in their network. An opponent's building blocks a road network from continuing through that intersection.
- After setup, a settlement occupies an empty board vertex, must connect to one of the player's roads, and cannot be adjacent to another settlement or city.
- A city replaces one of the active player's settlements at the same vertex.
- Each player has 15 road pieces. Other existing building/upgrade supplies remain unchanged; there are no per-turn paid-build limits.

## Bank and port trading

- During the action phase, exchange four identical resources for one different resource at the bank, without needing coastal access.
- A settlement or city at either endpoint of a port grants its owner access immediately, including the turn it is built. A road or a building elsewhere on the coast does not grant access. Access is derived from the building, never tracked separately.
- A general port permits three identical resources for one different resource. A specialist permits two units of its indicated resource for one unit of any different resource; the discount applies to payment, not receipt.
- Choose the best available rate by default. Players may still choose the ordinary 4:1 rate, or 3:1 if they also own a general port. Discounts never combine to produce 1:1. A city has the same rate as a settlement.
- Ahriman blocks production, not port access. Ports introduce no pirate, shipping, sea roads, or island-building rules.
- The bank remains unlimited in this MVP; finite bank inventories and other unrequested base-game systems remain separate decisions.

These maritime rules follow the [official CATAN base rules and almanac](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf), maritime trade and harbor sections. Port types shuffle over this project's fixed coastal slots; these are not a reproduction of CATAN's printed frame layout. Other MVP rules remain as recorded above and below.

## Player-to-player trading

- During the action phase, any trade must include the active player and exactly one other player. Inactive participants can propose and respond to the active player; no two inactive players may trade with each other.
- Exchange arbitrary positive integer quantities of resource cards in nonempty bundles on both sides, at any agreed ratio. A resource type cannot appear in both bundles. Gifts, loans/future payment, services, and development cards are not tradable.
- Both players must consent to the exact current terms and own their outgoing resources before the simultaneous exchange. Proposals, counteroffers, acceptance, rejection, and withdrawal alone move no resources. Final confirmation revalidates both hands, transfers once, and cancels competing promises.
- Completed trades and their terms are public; exact resource types/counts in opponents' remaining hands stay private. Total card counts are public. Human trade/offer counts have no per-turn limit.
- Banks/ports remain restricted to the active player. Sunmark retains its combined build/trade phase; other recorded MVP rules are unchanged.

These domestic rules follow [CATAN's official Rules & Almanac, Domestic Trade, page 7](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf#page=7) and [trade FAQ](https://www.catan.com/faq/basegame). See [DOMESTIC_TRADING.md](DOMESTIC_TRADING.md) for confirmation, bots, interface, and recovery.

## Development cards

- Shuffle the official 25-card deck: 14 Knights, 5 Victory Points, and 2 each of Road Building, Monopoly and Year of Plenty (Invention).
- Each purchase costs 1 stone (ore), 1 wheat (grain) and 1 wool. Repeat purchases while resources and deck stock allow; cards remain private.
- Play at most one non-VP card per own turn, before the roll or after required roll resolution. Never play one on the turn it was bought; rolling does not reset the play limit.
- Knight: move Ahriman and steal from one eligible adjacent opponent; no discards. Road Building: place two legal free roads (or one if the supply/legal locations prevent a second). Monopoly: take all of a chosen resource from all opponents. Year of Plenty: take two chosen resources, identical or different, from this project's unlimited bank.
- Victory Point cards are never played as ordinary cards. All held VP cards, including new purchases, count toward victory, but remain hidden until their owner declares victory.

## Titles and victory

- Settlements score 1, cities score 2. Held Victory Point cards score 1 each.
- Longest Road scores 2 for the longest continuous edge-simple route of at least 5 segments. Do not sum branches/disconnected roads; opponent buildings interrupt the route. Largest Army scores 2 after at least 3 played Knights; held Knights do not count.
- Incumbents keep tied titles. A strictly greater qualifying value takes the title. If an interrupted Longest Road loses its qualifying lead, a unique new leader receives it; ties among other players leave it unowned.
- The victory target is 10. Only the active player may win, even if another player acquires a scoring title off-turn. Public ten-point totals win automatically on that player's turn; private VP cards are revealed through an explicit own-turn declaration. No further command may execute after victory.
- See [DEVELOPMENT_AND_SCORING.md](DEVELOPMENT_AND_SCORING.md) for exact timing, title transfers, UI privacy, mandatory resolution, save compatibility and tests.

## Beginner practice

The menu Tutorial enters a clearly labeled, deterministic practice board with one preplaced settlement/road, prepared resources, inactive opponents, and a disclosed production roll. The player rolls, receives actual terrain production, pays for a sample road to a new legal settlement site, exchanges four wood for a missing wool, and pays for a settlement that changes their score from one to two. Every performed action uses the ordinary core validators and costs. The sample route illustrates connectivity and distance, without recommending an optimal move. Practice cannot end turns, build other pieces, or execute a different trade; alternative bank selections remain inspectable for comparison. It never saves over a match. Completion or exit returns to the menu; Play resumes the existing save or starts normal empty-board setup. This explicit teaching scenario does not change ordinary random dice or grant resources in a real match.
