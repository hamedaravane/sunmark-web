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
   optional-analytics coverage and players' ability to pause/leave/resume.
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
