# Offline-first behavior and progression synchronization

Implemented architecture, November 4, 2026. Deployment requires the coordinated
backend migration/image and frontend release; local code is not a production claim.

## Player problem and intended outcome

Our small population makes local bot matches the most dependable way to play.
Previously analytics required an account, kept only 100 events in memory, and lost
unsent data when the page closed. Offline XP, coins and achievements were separate
device-only data. These gaps made observed-account rankings incomplete.

Hypothesis: durable, unobtrusive synchronization improves recovery and lets us
understand offline entry, meaningful actions, endings and return visits. Evaluate
measured offline reach, distinct match IDs, synchronization failures and successful
cross-device recovery. Event volume and longer time alone do not establish enjoyment.
Existing samples remain too small for causal claims.

## Behavioral outbox

The recorder writes each validated event to an owner-scoped localStorage key before
upload. Individual event keys prevent one tab's acknowledgment from overwriting
another tab's newly queued event. A page restart restores unacknowledged IDs;
retries reuse them and PostgreSQL deduplicates `(accountId,id)`. Flushes run in the
background, on reconnect, when leaving a visible page, and periodically while online.
No browser background-sync permission or repeated consent dialog is required.

Both local bot play and practice emit gameplay events. Fixed interaction categories
cover game buttons, construction/trade decisions, tutorials, character dialogue,
account submit, app lifecycle and placement previews. Values entered in fields,
resource/hand contents, private card identifiers, coordinates, raw errors and game
snapshots never enter this event stream. Offline match IDs are stable across resumes;
run IDs still identify an individual entry/resume. An ending after resuming a
finished save is not another completed match reward.

`occurredAt` is client-reported UTC occurrence time; `receivedAt` is server receipt.
Dashboards use occurrence dates so reconnecting does not manufacture a return day.
Legacy rows retain their original receipt date as their best available occurrence
time. Dates and client reports are not anti-cheat proof. Extreme future device-clock
values are normalized to receipt time; events older than 90 days are acknowledged
without reinsertion.

The durable queue is bounded to 5,000 events per browser owner and expires events
after 90 days. The memory-only fallback remains bounded to 100 events if browser
storage is unavailable. Quota exhaustion, clearing browser data, private-mode
restrictions and exceeding the queue cap can still lose unsynchronized diagnostics.
No system can promise unlimited durable browser storage. Gameplay remains available.

## Identity and preferences

Registered players keep separate local queues/profile keys. Account changes suspend
an old queue rather than uploading it under a different account. Guests can start
while disconnected, queue under this browser's guest scope, and obtain/reuse an
existing authenticated guest session when connectivity returns. Anonymous browser
identities are not verified unique people. Upgrading that guest to an account
preserves its existing server ID; signing into a different account does not make
an arbitrary submitted UUID authoritative.

Basic diagnostics default on with a quiet home notice and an explicit privacy
settings button, including for guests. Existing server opt-outs remain enforced.
The cached local opt-out works offline; a pending withdrawal is retried after
reconnection. Withdrawal stops collection and deletes queued events, server events
and device diagnostics. Optional analytics never gate play or rewards. A previously
unknown server preference cannot be verified during an outage; the server checks
it again before accepting any upload.

## Progression ledger and recovery

The shared pure offline progression policy is owned by the backend and pinned into
the frontend with the rest of its runtime contract. Completion/practice/cosmetic/name
commands apply optimistically on the device. Profile, canonical baseline and pending
commands live in a version-2 atomic envelope. Individual command keys additionally
preserve concurrent-tab additions. A bounded batch uploads with authenticated identity;
the server serializes by identity, stores command receipts and the canonical offline
profile in one transaction, and acknowledges only after commit. Replaying a command
or match ID cannot grant rewards twice. A server response rebases still-pending
local commands and cannot replace another account's profile or a newer revision.
Conflicting cosmetic purchases are re-evaluated against the canonical balance.

Offline coins, XP, achievements, matches, wins, practice completion and cosmetic
ownership are now recoverable from the server after synchronization. Existing local
profiles are imported on the first canonical initialization, backed up locally, and
archived on the server. An additional old device's conflicting legacy snapshot is
archived rather than silently summed: the old format does not retain a per-match win
history or purchase ledger sufficient to merge it exactly. Its new queued commands
still settle against the canonical account. Historical conflicts require review;
we do not invent missing wins, mint duplicate balances or discard the original copy.

Guests also synchronize, but a recoverable registered account is needed to restore
from another device. An expired guest cookie creates a new guest and reimports the
remaining local profile. Clearing both local data and an unrecoverable guest cookie
cannot recover that guest's identity. Unfinished match snapshots remain device-local;
this change synchronizes progression, not a cloud save of every private board state.

Offline outcomes remain client-reported. Their separate offline wallet never affects
ranked rating, ranked wins, server-authoritative online balances or referral rewards.
The server calculates new rewards using shared policy; it does not accept arbitrary
requested XP/coin deltas. This is not proof that an offline client was untampered.

## Device diagnostics

During an enabled upload the browser sends a random installation ID, bounded user
agent/platform/language, screen and viewport dimensions, pixel ratio, touch support,
and CPU-thread/device-memory hints when available. The server records its observed
connection peer address. With a CDN/reverse proxy this can be an intermediary rather
than the player's public IP; untrusted forwarding headers are not treated as truth.
Device/browser data is reported, not verified. Exact model, exact RAM and physical
location are often unavailable and are not inferred.

No geolocation request, contact access, camera/microphone, filesystem enumeration,
canvas/audio fingerprint or high-entropy device-probing loop is introduced. These
are unnecessary for offline reliability analysis. Device snapshots/IP information
are admin-only, at most ten displayed per player, and expire after 30 days through
hourly cleanup. Event rows expire after 90 days. Existing backup retention applies;
withdrawal does not rewrite historical encrypted backup snapshots.

## Administration and verification

The dashboard keeps registered-account denominators separate from guest activity.
User rows show offline completions alongside online completions. Protected player
details show canonical offline XP/coins/badges, synchronization time, recent device
snapshots and occurrence-time events. A lack of telemetry still means unmeasured,
not uninterested. New diagnostics cannot reconstruct a player's past unrecorded play;
an existing local progression profile can migrate on opening the new release.

Node tests cover persistence/reload, immutable retries, identity isolation, concurrent
acknowledgments, legacy import, rebase and escaped diagnostics. Isolated PostgreSQL
tests cover migration, guest identity, duplicate/concurrent rewards, withdrawals,
authorization and occurrence-time cohorts. Interactive PWA/device verification remains
the owner's responsibility; no browser testing is claimed.

Browser model/hardware exposure varies. The optional high-entropy Client Hints API
can withhold exact models and may be permission-controlled; this release uses
bounded ordinary diagnostics without requesting those extra values. See
[MDN NavigatorUAData](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorUAData).

Release order: publish and verify the backend image, pin its immutable digest in
`deploy/backend-image.json` alongside this contract, then publish the frontend.
The normal deployment backs up before applying migration 0006. Do not deploy a
frontend bundle whose backend-image pin still names the previous contract.
A downgrade to an old client cannot interpret the version-2 local progression
envelope; prefer a forward fix and preserve pending browser data during recovery.
