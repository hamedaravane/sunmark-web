# Product priority and learning loop

The owner's primary product objective is sustained player engagement: a game
people understand, enjoy, finish and voluntarily return to frequently. Build
attachment through worthwhile matches, satisfying progression, social play and
reliable recovery. Evaluate active time together with successful play and return
frequency; a longer session caused by confusion or network failures is a failure.
This priority guides features introduced, changed, improved and removed.

For each meaningful product proposal, record:

1. The player problem and testable hypothesis.
2. The affected journey and a primary measure, such as first-match progress,
   completed matches per observed player, return rate or successful reconnection.
3. Supporting measures: active time, sessions, errors, tutorial usage and player feedback.
4. Guardrails: match integrity, hidden information, performance, comprehension,
   measurement coverage and preserved opt-outs and players' ability to pause/leave/resume.
5. The released build, observation period, sample size and decision to retain,
   revise or remove the change. Explain uncertainty; seven accounts cannot support
   strong general conclusions. Do not change fixed rules without their normal review.

Prioritize the largest observed friction, ship a focused improvement, compare the
relevant cohorts/builds, and repeat. Raw time and event volume are diagnostic
signals, not proof of enjoyment. Add an experiment or survey only for a concrete
decision; this release does not introduce automatic experiments or notifications.

## Implemented measurement foundation

See [ANALYTICS.md](ANALYTICS.md) for exact collection, permissions, retention and
metric definitions. The admin panel exposes seven-day observed activity, daily
trends, event/phase/build counts, D1/D7 cohorts and a recent per-account timeline.
Existing authoritative online match totals remain separate from client-reported
entries/completions and practice. We have no historical behavior backfill, session
replay, conversion experiment, advertising attribution or sentiment inference.

## 2026-11-02: operator insight and responsive home

Problem: raw counters mixed practice/full matches, immature return windows and
administrator activity; the founder could not identify a useful next investigation.
The desktop home was constrained to a mobile column. Hypothesis: explicit journeys,
qualified return cohorts and targeted profile maintenance make decisions clearer;
a two-column desktop hub makes mode selection easier. Measure observed entry to
ordinary turns/completion and repeat play by build, alongside owner usability
feedback. Current observations comprise only a handful of players; comparisons
are descriptive and cannot establish causation. Guardrails: no invented history,
no inferred gender, preserve opt-outs and match authority, no hidden-state payloads,
no obstructed map, and user-led phone/tablet/desktop review before visual approval.

## 2026-11-03: founder-sketch match composition

Problem: cropped rivals floated in padded cards, and desktop resources competed
with actions inside one rail. Hypothesis: a central map, distinct right decisions,
bottom inventory and edge-anchored characters make turns easier to follow and the
art feel integrated. Review offline progress/completion, return by build and direct
phone/tablet/desktop feedback. No engagement improvement is established by this
visual change. Guardrails: unchanged rules/pacing/authority, public-only opponent
facts, no map/port occlusion, stable board geometry across turns, clear mandatory
actions and preserved source art. No new analytics are collected.

## 2026-11-03: focused visual review after main sync

Problem: mode icons stretched, offline entry followed disabled online choices in
isolated builds, and phone construction hid the third option below the fold.
Hypothesis: clear mode emphasis and compact decision cards reduce scanning before
play and building. Review first-match progress, construction rejection rates and
player feedback with the existing measurement only; no improvement in engagement
is established by screenshot review. Guardrails: preserve the founder composition,
source art, keyboard/touch access, costs, target confirmation, hidden information,
opt-outs and bot pacing. Playwright review uses disposable contexts, not accounts.

## 2026-11-03: Council product redesign

Problem: a progression-heavy home and repeated narrow dialogs obscured play,
comparison and the characters. Hypothesis: a character-led entry, clear current
turn, stable inventory and task-specific workspaces improve first-match progress
and comprehension. Evaluate existing entry/progress/completion/rejection signals
with player feedback; screenshots alone establish neither engagement nor retention
improvement. Guardrails: unchanged mechanics/authority/costs/privacy/opt-outs,
no blocked map targets, recoverable navigation and no new analytics. Review fixtures
use memory storage and intercepted local API responses, never live player writes.

Guest-first startup removes account registration before the first home visit. Account
entry remains explicit and online play retains its identity requirement. Existing
account restoration and required profile completion remain intact.

## 2026-11-04: offline-first synchronization

Problem: a small online population makes offline play essential, while memory-only
registered-account analytics and device-only progression omit real players and lose
unsent events. Hypothesis: persistent queues and recoverable offline rewards improve
continuity and make offline entry/progress/endings/returns measurable. Measure
offline reach, distinct completion IDs, pending/retried synchronization and recovery
success, with direct player feedback. Small samples still cannot establish causal
engagement gains. Guardrails: no repeated prompts, preserve opt-outs/local saves,
no typed text/private hands, bounded device diagnostics, occurrence-time reports,
idempotent coins/XP and a separate competitive economy. See OFFLINE_SYNC.md.

## 2026-11-09: cinematic entrance

Problem: the dim single-background menu underplays the supplied world and gives
installation equal weight to play. Hypothesis: a bright, layered entrance with a
clear gold gameplay action and secondary install/invite controls improves first
entry and perceived quality. Review existing first-match progress/completion and
return signals alongside player feedback; screenshots do not establish engagement
lift and no player sample is claimed. Guardrails: preserve all navigation, consent,
authentication, saves, rules, opt-outs and readable gameplay; use no new analytics.

## 2026-11-11: first-match continuity implementation

Problem: 20 of 64 observed fresh guest runs reached an ordinary roll; the data
locates a stopping stage but does not establish confusion or abandonment. Practice
returned to the menu, opening choices lacked an accessible strategic explanation,
and the home did not recall an unfinished plan. Concurrent population is the
working constraint for four-human matchmaking.

Implemented in the first bundle:

- Practice completion has a direct HUD action into guided normal setup or the
  existing unfinished save. Its old exit remains available. Practice never becomes
  an ordinary match, overwrites a save or changes normal dice/resources.
- Opening guidance labels four human placement steps. The optional selected-site
  review and destination list explain adjacent production odds, newly covered
  resources, ports and second-settlement grants. Road review explains expansion.
  All choices still require the original on-board confirmation.
- Home recalls the saved score, acting player/setup and pinned construction goal;
  it explicitly describes unfinished offline boards as stored on this device.
- Construction goal controls are available beside the placement action rather
  than hidden under Details. Existing affordability/location checks remain intact.
- Online entry explains one friend plus two explicitly chosen bots. Hosts can
  fill empty seats with bots in sequence and still explicitly start the room.
  Human seats are never replaced. Ranked matchmaking remains four humans.
- Results reflect final own building/road counts and public port access, suggest
  another strategic experiment, and expose the existing friend-play entry.

Hypothesis: concrete decisions and continuity improve setup progress and later
confirmed play; friend rooms work without needing four concurrent humans.
Primary measures: starter roll, first placement, all four placements, ordinary
roll, later-day confirmed gameplay and distinct completions, separated by build,
mode and guest/account identity. Small samples and delayed uploads preclude causal
claims. No new analytics payloads, reward rules or privacy settings were added.

Pending approved work, in priority order: observe first-time mobile players and
review actual compact-phone rendering; simplify narration based on observations;
add trading-goal drafts; build optional strategy exercises and safe versioned
challenge sharing; add persisted learning milestones and calibrated bot difficulty.
These features are not claimed as implemented by the first bundle. The first
bundle must not be described as the entire engagement program or a proven lift.

## 2026-11-11: screenshot-led screen review and centered roll

Owner-directed iterative review captured every listed player-facing game screen,
account and online entry states, then checked changes and scrolled details. See
SCREEN_REVIEW_2026_11_11.md for the report relationship, retained designs, rejected
iterations, captures, verified flows and empirical limits. Changes target first
play clarity, readable placement, learning continuity and accessible friend rooms,
without new rules, rewards or analytics. Native account dialogs no longer enter
the game-sheet painter. Offline and loaded online progression remain separately
reachable and online badge text correctly describes online matches.

The owner then identified the lower dice and redundant bottom instruction as weak
next-action presentation. Hypothesis: a centered board CTA with readable turn
ownership makes the required roll easier to notice and initiate. Measure confirmed
starter/ordinary roll progress and player comprehension by build, alongside
later-day confirmed play. Guardrails: unchanged random outcomes, one native roll
command, no rapid-tap double action, preserved pre-roll cards/declaration,
unchanged board camera, mandatory choices, pause and opt-outs. Screenshots and
browser interaction checks establish presentation/behavior only, not retention.
