# First-party player analytics

Basic gameplay measurement is prospective and attached to authenticated registered
accounts or guest sessions. Offline activity uses a durable browser outbox. It is on by default for new/previously undecided accounts, with a clear
registration notice and Account → Basic analytics and privacy control. There is
no automatic permission dialog. Existing explicit opt-outs remain off; disabling
measurement never affects play, progression, matchmaking or rewards. Guest play is included from the offline-sync release; activity that was never
recorded before measurement began cannot be backfilled.

## Collection and boundaries

The server owns permission and account identity. The submitted account ID is only
an assertion checked against the authenticated session, protecting queues during
account changes. It never grants access. Ingestion and withdrawal serialize on the
account row so an upload cannot restore events after permission is withdrawn.
Withdrawal immediately stops the browser recorder and transactionally removes the
account's stored events and first/last activity timestamps. Failed withdrawals
stay pending locally and are retried before collection resumes.

Allowed events: app open; bounded active-time heartbeat; a fixed screen category;
match entry/exit/completion; phase change; tutorial shown/closed/acknowledged;
confirmed human action kind; generic action rejection; online connection change; fixed online entry/search/room/ready/start milestones with success/failure.
Context is a strict whitelist of mode, phase, action kind, screen category,
numeric lesson index, temporary run ID, active milliseconds, connection boolean, fixed online step and outcome enums, interface-action categories, stable offline
match IDs, turn/outcome summaries and visibility changes.
The release SHA and a temporary analytics session UUID identify a version/session.

Never collect passwords, recovery keys, cookies, tokens, typed text, raw errors,
phone/name/age/gender fields, coordinates, DOM/session
recordings, opponent hands, decks, command payloads or whole game snapshots.
Account association is explicit; these records are not claimed to be anonymous.
The existing account profile remains separate and already admin-protected.
The owner-authorized device diagnostic record separately stores bounded browser,
platform, display, CPU/memory hints and the server-observed connection peer for
30 days; this is not verified physical location or a fingerprinting system.

The client observes the shared match presentation, not animation callbacks or core
rule execution. Repeated observations are deduplicated. No game rule or game-state
mutation depends on diagnostics. The core remains free of analytics imports.

## Reliability, cost and expiry

The client persists at most 5,000 events per local owner for at most 90 days, using
individual keys so acknowledgments cannot overwrite concurrent-tab additions. A
100-event memory fallback keeps play available if storage is denied. Uploads use
at most 20 events per request; the backend accepts 25 and 120 requests per identity
per 15 minutes. Retries preserve event IDs. Quota exhaustion, clearing browser data,
queue overflow or browser restrictions can still lose unsynchronized events.
`occurredAt` records reported play time, `receivedAt` records upload time. Existing
rows use their old receipt time. Events older than 90 days are acknowledged without
reinsertion; extreme future device clocks normalize to receipt time. These client
reports do not establish authoritative match results.

Raw events expire after 90 days, through indexed cleanup on ingestion and an hourly
API task while the service runs. First/last observed activity and permission remain
until withdrawal/account deletion. Aggregate dashboard values are queried from
retained events rather than stored forever. Encrypted operational backups follow
their existing retention schedule; withdrawal is not a rewrite of past backups.

Analytics failures stop measurement safely. Initial permission lookup has a
four-second timeout; an unavailable preference lookup means no collection.
An explicit opt-out remains authoritative. The browser
transport uses bounded timeouts and never exposes request data in error logs.

## Reading the admin dashboard

- Seven-day players: distinct authenticated accounts with received events.
- Sessions: distinct account/session UUID pairs. A page load, permission/identity
  change or interaction after 30 minutes idle starts a new analytics session.
- Active time: approximate visible browser time, sampled every 30 seconds, only
  with an interaction in the last 60 seconds. Hidden/idle time is excluded; hub,
  profile, practice and match interaction may contribute. It is not precise play time.
- Daily activity uses reported occurrence dates in UTC, with receipt timestamps
  retained separately; delayed uploads can revise past daily/cohort figures.
- D1/D7: return events on the first/seventh UTC calendar day after the account's
  first observed activity. Eligible first-observation cohorts are within the
  last 30 days and have a fully elapsed return day. Show numerator/denominator;
  no eligible cohort means “not yet calculable,” never 0% or invented history.
- Event-table player counts are independent reach measures, not an ordered funnel.
  Phase counts do not establish abandonment; leaving a resumable match is not a forfeit.
- Match entries/completions are per client/device/run; they can include practice,
  resumes and multiple viewers of one online match. Do not equate them to unique
  server matches. The original online match totals/progression remain separate.
- Coverage is distinct observed accounts beside registered accounts, excluding administrators in the insights dashboard. Retention
  and time describe this observed sample, not every account or offline visitor.
- Per-user timelines show only the latest 50 permitted raw events and never include
  private hands, arbitrary payloads or credentials. Lesson numbers are release-specific.

The first useful review is after repeated observed play. Document sample
sizes, exclusions and uncertainty before changing product direction.

## Verification and operations

The backend migration creates `analytics_preferences` and `analytics_events` with
account references, a deduplication primary key and time indexes. The existing
deployment backs up PostgreSQL before applying it explicitly. New tables are part
of API readiness. No production schema push or player backfill is performed.

Backend database tests cover consent, guest denial, foreign origins, account changes,
strict payloads, retries, concurrent opt-out, expiry and real UTC retention queries.
Frontend Node tests cover queue bounds, retries, identity reset, redacted/deduplicated
observation and empty retention states. Normal release CI builds and exercises the
actual version pair. Device/interactive testing remains the owner's responsibility.

## Decision dashboard (2026-11-02)

`GET /admin/insights?days=7|30` uses UTC calendar days including the incomplete
current day; zero-filled growth/activity trends, median active time per observed
account, distinct-account progress by offline/online/practice run, independent
online milestone counts, mature return cohorts, rejection reach, age bands and
recorded male/female profile totals. Configured administrator UUIDs are excluded
from every insight, including cohorts and demographics. Directory results still
include administrators with labels. An incomplete profile is a completion task,
not a third gender option; no value is inferred from a name.

Journeys only include runs with a match entry inside the selected window; resumed
runs and missing uploads limit interpretation. Online stage counts are independent
reach, not an ordered funnel or proof of failure cause. Practice finishes never
count as ordinary match finishes. New milestones begin with the new client;
previous events are not reconstructed. Charts show actual denominators and pending
return days. No causal engagement improvement is claimed from this small sample.

## Offline-first architecture (2026-11-04)

See [OFFLINE_SYNC.md](OFFLINE_SYNC.md) for durable behavioral queues, authenticated
guest coverage, idempotent server-backed offline XP/coins/achievements, legacy
recovery, separate competitive authority, device diagnostics and explicit storage
limits. The quiet home notice/settings replaces automatic permission prompts.
Registered-account denominators remain separate from guest activity. Protected user
rows and timelines now show offline completions and canonical offline progression.
