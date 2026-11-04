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
