# Player-facing page audit — 2026-11-10

Status: owner approved both page removals and repeated-biography cleanup after screenshot review on 2026-11-10. Implemented locally; not deployed.

A screen should help a player act, resolve meaningful uncertainty, review their
actual match, or manage identity, recovery, accessibility or earned progress.
A screen that only repeats an introduction or routes to another menu adds friction.

The owner identified the standalone companion gallery as unnecessary. This is
owner feedback plus a source/route review, not evidence from player usage counts.
Hypothesis: fewer nonessential destinations keep attention on starting, resuming
and understanding matches. Assess first-match progress, return-to-board navigation,
completed matches and direct player feedback using existing permitted metrics.
There is no measured engagement result yet and no new analytics collection.
Guardrails: preserve rules, saves, hidden information, accessible inspection,
mandatory decisions, pause/exit, narrative opt-outs and existing earned progress.

| Screen family                                                                  | Decision and player purpose                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meet the Island Companions / character gallery                                 | Removed, including home/pause/review links, route, renderer and exclusive styles. Repeated biographies also removed from player/opponent panels. Meet characters through introductions, turns and conversations.                              |
| Review Game navigation wrapper                                                 | Removed. History, inspectable tile list, last-move review, interface guide and confirmed restart remain directly available in Pause. Desktop inspection shortcut opens the tile list directly.                                                |
| Build, trade, player negotiation, development, targets                         | Keep: make legal decisions, compare costs, consent to trades, preview and confirm actions.                                                                                                                                                    |
| Discard, victim choice, placement, end-turn/replacement confirmation           | Keep: mandatory rules, safety of pending choices and protection of the saved match.                                                                                                                                                           |
| Tile, port, player, opponents, inspection list                                 | Keep: actual production, buildings, trade ratios, public standings and keyboard-accessible board facts. No repeated character biography.                                                                                                      |
| History and last-move review                                                   | Keep: confirmed match outcomes, payments, production and conversations. Replay moves into History and returns there; mandatory choices block replay. These are different tasks from a static profile gallery.                                 |
| Match introduction and contextual rival dialogue                               | Keep: establish participants/colors for this match and respond to actual events. Narrative choices and mute behavior remain unchanged.                                                                                                        |
| Practice, Anahita lessons/journal, rules, development rules, interface guide   | Keep: learn by doing and recover understanding on demand. The interface guide also works before a match; it is not a replacement navigation menu. Multiple entry points do not create duplicate copies of a page.                             |
| Profile/name, achievements, cosmetics                                          | Keep: edit identity, inspect earned milestones, spend/equip earned rewards. Review their home entry-point density separately if players report difficulty finding Play; do not delete earned progress merely because it is outside the board. |
| Competitive overview, private room/lobby, online account/progression/referrals | Keep: choose a mode, understand rating/time commitments, coordinate seats, synchronize/recover identity and inspect actual referral rewards. Offline and online ledgers are distinct.                                                         |
| Settings, installation/offline status, update and privacy controls             | Keep: accessibility, explicit preferences, install/recovery/update and analytics opt-out. These controls must remain reachable.                                                                                                               |

## Compatibility and verification

Sheets are local ephemeral navigation, not persisted authoritative match state;
no save migration or rule change is required. Historical analytics schema values
are retained for contract compatibility, but removed routes no longer emit visits.
Browser fixtures now open settings instead of the retired gallery. Pure session
checks cover direct pause navigation, saved-match replacement confirmation,
conversation replay/return, mandatory-choice priority and absence of gallery links.
Existing character art, bot personalities and narrative data remain in use.
