# Single-player stage

New games contain exactly four seats: the named human (default «بازیکن»), میترا, اَشی, and سپنتا آرمیتی. Every new match asks for the human name before board creation. Bots carry explicit «ربات» labels and supplied illustrated avatars; recognized legacy robot names migrate while their boards and identities remain intact. Opening rolls choose the starter. The human chooses both of their settlement/road pairs, and bots choose their own, in the same clockwise/reverse order. Ordinary turns begin at the starter; see [OPENING_SETUP.md](OPENING_SETUP.md). The main menu has Play and Tutorial. Play resumes an unfinished save or starts a normal match. Tutorial is a separate disposable practice board with prepared resources/dice and idle opponents, using normal core production, payment, placement, trade and scoring commands. It preserves the original save and returns to the menu on completion/exit. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md). Play can resume a guided save with its narrator memory intact. Help provides a confirmed restart without adding a third menu button.

## Authority and presentation

`GameSession` owns a fixed human player ID separately from `activePlayerIndex`. The personal header row, hand, personal details, port shortcuts, and resource feedback belong to that human even while opponents act. A second compact header row shows public opponent scores, avatars, explicit robot labels, and the acting seat; rank is based on the number of strictly higher scores, preserving ties. Confirmed dice remain in the header for both human and opponent rolls. The history/context line reports opponent activity, and Help → رقبای جزیره shows public score and board-piece counts. Opponent inventories are not substituted into the human HUD.

Human draft/action entry points reject input on opponent turns. `advanceBot(expectedState)` rejects human turns, finished matches, open sheets, and stale state references. Successful bot commands use the same transition, production, history, tutorial observation, and autosave pipeline as human moves. History attributes an end-turn to the actor who ended it, rather than to the next player.

`core/commands.ts` defines serializable commands and dispatches to existing validated core rules. `core/bot.ts` is a deterministic planner without Phaser, timers, storage, or UI imports. It receives current state but chooses using only public board data and its own inventory. Dice still use ordinary core randomness. Bots receive no bonus resources, discounted costs, forced rolls, hidden future information, or special victory rules.

## Bot behavior

- During opening, roll for the starter and choose each free settlement/adjoining road through setup commands.
- During ordinary play, roll when required; on seven choose a different tile, favoring opposing production (especially leading players) and penalizing harm to their own buildings.
- Upgrade an affordable settlement to a city, or build an affordable legal settlement. Rank sites by dice production weight, resource variety, and port access.
- Extend roads along a breadth-first path toward a possible settlement site. Opponent roads/buildings block traversal as specified by the core rules. Once a legal settlement site is ready, conserve wood/brick rather than building unnecessary roads.
- Trade surplus toward missing construction costs, using the best eligible bank/port rate. A trade never sells resources reserved for that candidate cost and receives a missing resource. Ordinary payment reduces total inventory, so repeated trade/build planning is finite within a turn.
- End the turn when no useful affordable build or trade is available. Victory stops immediately through the shared rules.

This is a basic heuristic opponent for the MVP, without difficulty settings or search of future turns. Strategic strength and perceived pacing need the user's playtesting; legality/unit checks do not establish game balance.

## Pacing and lifecycle

`ui/botTurns.ts` schedules one guarded command with event-dependent reading intervals of 1.6–4.2 seconds, plus explicit pause/single-step controls. The timer is turn pacing, independent of animation completion. It pauses ordinary turns for any open dialog, a hidden page, or update activation. Domestic negotiation allows only paced bot replies to human offers while its sheet is open; other automatic actions remain paused. Bots also initiate offers and negotiate with one another during legal active-player pairings. See [DOMESTIC_TRADING.md](DOMESTIC_TRADING.md). Visibility/platform notifications reschedule on return. Returning to the menu, changing the match, or destroying the game cancels queued work. An expected-state reference protects against old callbacks affecting a different turn or match.

Anahita only awards practice for confirmed human actions. Her first end-turn conversation explains automatic rivals and the persistent human hand. Bots wait while it is open. Bot Ahriman moves never create human placement previews or human seven prompts. Either a human or bot victory can trigger the neutral ending.

## Saves and installation

Version-1 saves add an optional validated `humanPlayerId`; existing app/save keys remain stable. New saves retain the human identity through reloads, including midway through a bot turn or between a confirmed opening settlement and its required road. Opening metadata is validated before recovery; completed legacy matches never restart setup. Legacy saves without it assign seat one to the human and the remaining seats to bots. A three-player legacy board is preserved as three players rather than inserting pieces into an ongoing game. Reviewed/practiced narrator memory is preserved; pending legacy narration for another seat is dropped. All new games use four players.

Non-standalone startup opens a dismissible installation/app modal once per page lifetime. Native prompt availability is independent of that explanation; deferred browser prompts are still only invoked by a tap. Android Chrome, other Android/in-app browsers, iOS Safari, and desktop fallback have separate copy. Installed launches omit the install explanation. Offline preparation, updates, and local autosave remain available without extra main-menu buttons. See [PWA_RELEASE.md](PWA_RELEASE.md).

## Later online stage

The fixed human identity and serializable command shape separate this device's controller from the active turn, but this release remains entirely local. A later backend must authenticate seat ownership, validate commands on authoritative server state, own randomness, project private hands appropriately, and handle matchmaking/reconnects. Client-side guards and local saves are not server authority. No backend contract, hosting choice, or online rule change is implied by this stage.

## Focused verification

`tests/bots.test.ts` covers both entry modes, the two-button menu, human turn guards, human-owned personal status and public opponent scoreboard, automatic seat order, pause/resume/cancellation, stale callbacks, bot seven, tutorial practice isolation, legal/immutable planning over seeded boards, port payment, victory stopping, and new/legacy save recovery. Existing session/trade/tutorial/persistence tests protect confirmation boundaries. Platform tests check Android/Chrome/iOS copy and capability detection. TypeScript and scoped lint/format checks complete routine verification; device/game testing, production builds, and CI remain with the user.

## Identity presentation

The three local rivals use user-supplied illustrations and distinct deterministic strategies. Mithra emphasizes expansion, Ashi ports and efficient trades, and Spenta Armaiti cities and wheat/stone production. Server bot identities remain separate. See [Offline characters](OFFLINE_CHARACTERS.md) for artwork provenance, dialogue, action receipts and pacing. Names and avatars grant no rule advantages.

`tests/player-header.test.ts` covers new-name entry, cancel/resume persistence, Persian joining characters, markup/bidi safety, ties, active/winning seats, private-hand exclusion, legacy three-seat avatars, full-safe-area header coverage, and the reference portrait board budget. Native keyboard/input appearance and notch presentation still require the user’s device review.

## Official base-game additions

Bots choose their own discard bundles, eligible theft victims, card purchases and legal card effects through `core/commands.ts`. A mandatory human discard pauses a bot's active turn until the human confirms it. Bought cards wait until the owner's next turn, played Knights drive Largest Army, and bots declare hidden-point victories only on their own turns. Public route/army title ownership feeds public scores without reading opponents' VP cards. Version-2 saves preserve all pending effects and card inventory; valid unfinished version-1 six-point saves upgrade deterministically while completed historical results retain their original target. See [DEVELOPMENT_AND_SCORING.md](DEVELOPMENT_AND_SCORING.md).
