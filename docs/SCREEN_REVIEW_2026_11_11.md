# Sunmark screen review — November 11, 2026

## Basis and acceptance standard

Owner-authorized screenshot review against the November 10 player report. This
continues the existing uncommitted implementation; before screenshots represent
that working state, not a reconstructed production release. Review uses local
Chromium at 390 × 844, isolated memory/browser saves and intercepted account/API
responses. No production traffic, account creation or data changes are required.

For each screen: inspect the captured pixels, identify its possible relationship
to the report, make a focused correction when supported, recapture, and assess
readability/navigation/state integrity. A visual pass does **not** establish a
causal retention improvement. Maintain opt-outs, fixed rules, hidden information,
real costs and the ability to pause/leave/resume. Online scarcity is treated as a
population constraint, not an assumed matchmaking defect.

Evidence is in ignored `output/playwright/` artifacts. Main-menu before/after and
practice-intro before/after were captured through the Playwright CLI. The fixture
inventory then covers rare screens with the real renderer. `report-before`
contains the first captures; `report-setup` covers real-command opening fixtures;
`report-after` includes top and overlapping scrolled captures. `report-practice`
exercises actual practice → name → introduction → starter → settlement → road →
save/resume. Fixture-prepared state is not a claimed full live multiplayer match.

## Player match screen inventory

| Screen              | Report relationship                                 | Decision and critique                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `home`              | Opening progress                                    | Fresh guests were directed to full setup before seeing the resource/build/score loop. Make practice primary for fresh profiles, retain direct play and resume. Visually checked 390px; compact and desktop checks listed below. |
| `setup-roll`        | 15 of 64 starts lack starter-roll confirmation      | Keep conspicuous dice and an explicit no-production caption; preserve rerolls and bot ownership. No rule or pacing change.                                                                                                      |
| `setup-settlement`  | 14 rolls lack a first placement                     | Keep legal targets and free-placement instruction. Number the four human decisions. Selected preview exposes optional factual review.                                                                                           |
| `setup-targets`     | First placement and incomplete setup                | Reject the first implementation: full probability text on every row overwhelmed the list. Restore short resource/number rows; detail belongs in the selected-site review.                                                       |
| `setup-road`        | 12 partial openings lack all four commands          | Keep the anchor and legal road highlights. Explicitly identify the road after each settlement; clearing a preview cannot remove a committed settlement.                                                                         |
| `opening-review`    | First placement and second-settlement comprehension | Explain production probabilities without guarantees, new resource coverage and ports; disclose the second-settlement grant. Returning leaves confirmation on the board.                                                         |
| `board`             | Ordinary progression and repeat play                | Keep map and stable own inventory unobstructed. Affordable construction and pinned goals remain available; do not interpret longer thinking as failed play.                                                                     |
| `roll`              | Reach ordinary play                                 | Keep the direct large dice control. No extra animation or artificial income introduced.                                                                                                                                         |
| `bot`               | Turn ownership and continuity                       | Keep named acting player and own inventory; preserve pause/step. No automatic takeover or speed change justified by the report.                                                                                                 |
| `placement`         | Setup clarity and subsequent building               | Found dark placement copy on a dark ribbon. Correct to ivory text. Preserve preview, confirmation and full-size destination list.                                                                                               |
| `build`             | Meaningful ordinary decisions                       | Keep costs and reasons visible. Retain the earlier goal control beside the placement decision; resources and legal targets remain distinct.                                                                                     |
| `trade`             | Strategic agency and satisfaction                   | Keep give/receive, before/after effects and final consent. Test real 4:1 payment; no free trade or accidental confirmation.                                                                                                     |
| `domestic`          | Strategic agency and social appeal                  | Keep own hand, explicit offers and negotiated consent. Long editor remains scrollable with persistent draft/submit controls.                                                                                                    |
| `development`       | Understanding ordinary turns                        | Keep private hand separate from purchase and card timing. Check each card through the interaction script; no new cards or rules.                                                                                                |
| `development-rules` | Learning without blocking play                      | Keep optional rule review and return to actual hand; do not force a manual before a turn.                                                                                                                                       |
| `help`              | Safe interruption and return                        | Clarify same-device save continuity. Keep resume primary, replacement confirmation and narrative settings separate.                                                                                                             |
| `rules`             | Comprehension                                       | Keep progressive disclosures and optional complete rules. The full reference is not a mandatory onboarding step.                                                                                                                |
| `history`           | Understand outcomes and resume                      | Keep confirmed receipts and replay controls; actual account text is not inferred from fixture player IDs.                                                                                                                       |
| `turn-review`       | Comprehend bot turns                                | Keep empty-state route to history; never fabricate a move when there is no transition.                                                                                                                                          |
| `inspect`           | Placement comprehension                             | Keep full-size tile list as an alternative to small board targets. Scroll review covers remaining tiles.                                                                                                                        |
| `opponents`         | Turn ownership                                      | Improve AI-label contrast on pale cards. Do not expose hidden hands or hidden victory points.                                                                                                                                   |
| `experience`        | Pacing and comfort                                  | Keep opt-in audio/haptics and quick/reduced motion. Preserve player choices, no forced sound or speed.                                                                                                                          |
| `experience-guide`  | Comprehension                                       | Keep optional control guide; gameplay actions remain separate from reading.                                                                                                                                                     |
| `journal`           | Learning continuity                                 | Keep replayable lessons and distinction between read/practiced. Scroll-review all chapters; no fabricated mastery.                                                                                                              |
| `profile`           | Continuity                                          | Keep offline ledger and synchronization limits explicit. Do not promise cross-device unfinished boards.                                                                                                                         |
| `profile-name`      | Entry and ownership                                 | Keep optional local name and unchanged ongoing identity. Confirm remains explicit.                                                                                                                                              |
| `achievements`      | Return motivation                                   | Keep earned/unearned goals explicit and no login/minute rewards. Do not retune economy from three completing identities.                                                                                                        |
| `cosmetics`         | Satisfaction                                        | Keep costs, affordability and owned state clear; no gameplay advantage.                                                                                                                                                         |
| `competitive`       | Population constraint                               | Keep four-human ranked requirement honest. Prefer the private-room route in online home; no bot substitution in ranked.                                                                                                         |
| `app`               | Offline continuity                                  | Keep installation optional, save/status details and a continue route. Inspect expanded status; do not gate play behind installation.                                                                                            |
| `update`            | Reliable resume                                     | Keep defer and save-before-update behavior; pending previews remain uncommitted.                                                                                                                                                |
| `end-turn`          | Understand consequence                              | Keep explicit warning for unfinished exchange and return-to-trade. Do not interpret leaving as abandonment.                                                                                                                     |
| `player-name`       | Before starter roll                                 | Keep a blank-name fallback, but explain entry is local and optional. Actual flow verifies keyboard input and confirmation.                                                                                                      |
| `new-match`         | Retain investment                                   | Keep replacement confirmation and resume alternative. Do not silently discard an unfinished board.                                                                                                                              |
| `introduction`      | Before starter roll                                 | Lead with objective and immediate opening task. Fit all identities on the reference phone; move extra greetings into optional disclosure. Preserve colors and original characters.                                              |
| `player`            | Own progress                                        | Keep private own score and title requirements distinct from public values. Planning/card routes stay available.                                                                                                                 |
| `rival`             | Comprehend competitors                              | Keep public score/counts only; compare without revealing exact opponent resources.                                                                                                                                              |
| `tile`              | Production comprehension                            | Keep resource/number, blocked production and adjacent ownership. Desert correctly shows no production.                                                                                                                          |
| `port`              | Trade comprehension                                 | Keep payment-resource specificity, access requirement and 2:1 rate. A road alone does not grant access.                                                                                                                         |
| `discard`           | Mandatory action continuity                         | Keep exact count, editable own selection and disabled confirmation until valid. Pause remains available.                                                                                                                        |
| `robber`            | Mandatory action continuity                         | Keep required movement and legal destinations. Review fixture must be distinguished from a real session action; normal flow tests protect mandatory placement.                                                                  |
| `steal`             | Mandatory action continuity                         | Keep eligible public victims and random-resource explanation. No exact hidden hands or invented probabilities.                                                                                                                  |
| `results`           | Repeat play and organic growth                      | Keep factual final-board reflection. Expose friend play in the fixed footer when online is enabled; hide that action in offline-only builds.                                                                                    |
| `deal-incoming`     | Negotiation comprehension                           | Keep accept/review, counter and decline. Acceptance is not resource transfer.                                                                                                                                                   |
| `deal-confirm`      | Trust and agency                                    | Keep exact terms, own before/after balances and atomic final consent. Test real transfer.                                                                                                                                       |
| `deal-counter`      | Strategic agency                                    | Keep editable bundles and exact terms; preserve separate final consent.                                                                                                                                                         |

## Account and social screen inventory

`report-entry-before` and `report-entry-after` capture registration first step,
credentials, login, recovery, online account gate, home, join, search and lobby.
Keep optional offline play and existing registration/security requirements. The
four-human queues remain available, but private create **and** join move ahead of
them. Shorten the mobile brand line spacing and reduce header padding. The lobby
explains explicitly filling empty seats with bots; humans are never replaced.
Room completion/start remains a host decision. Search counts are not evidence of
an independently diagnosed backend failure.

`report-auth-before` captures recovery-key, profile, privacy and legacy profile
completion. The initial script could not reach online progression: a local
profile always exists, which incorrectly prevented selection of the loaded online
profile. Correct that navigation while retaining explicitly separate offline
progress access. `report-auth-after` verifies the four account screens plus online
profile, online achievements, online cosmetics and referrals through actual menu
controls. Preserve opt-out and recovery-key controls. The UI renderer now only
paints its own bottom-sheet dialogs, rather than assuming native account dialogs
contain game-sheet headers/bodies; the entry review's null-element error no longer
occurs.

## Rejected iterations and validation limits

- Rejected dense probability paragraphs on every opening list row. Detailed odds
  remain optional for a selected location.
- Moved narrator next-step copy from the bottom of the scrolling body into the
  persistent footer after screenshots showed it being cut off.
- Rejected duplicated private-create controls with join still below the queues;
  consolidated private create/join into the first mode card.
- Preserved screens with clear costs/consent/pause rather than adding arbitrary
  decoration or inferring that every stopping point is a defect.
- Browser automation initially collided with Vite reload during editing. Repeated
  capture runs after source edits stopped. Capture files from aborted runs alone
  are not a passing browser verification.

Physical iPhone/Android performance, player comprehension, real friend matches and
cohort retention remain empirical follow-up. Continue measuring starter roll,
first/all placements, ordinary turns, later-day confirmed gameplay, unique results
and invited friends who actually play; keep guest/account coverage and delayed
uploads explicit. Do not call this review a proven engagement or retention lift.

## Owner-directed dice iteration

The owner identified the lower-ocean dice and redundant bottom instruction as an
awkward, weak next-action signal. `dice-before` records the starting point with
and without pre-roll cards. Move the one native roll target into the board
viewport, center it on the island and paint a compact teal/gold CTA around larger
ivory dice. Include turn ownership in its label. The CTA exists only during an
eligible human roll; it disappears on confirmation and never covers placement
controls. Cards/declaration, storage warnings and menu/inspection remain available
where eligible. Remove the duplicated dice-ready sentence and empty dock paint.

`dice-after` and `dice-refined` capture the visual iterations. `scripts/dice-review.mjs`
checks 390px and 320px portrait, compact landscape and desktop: one roll target,
center alignment, unchanged board viewport, minimum hit size, real pointer roll,
CTA disappearance and usable pre-roll cards, with no page errors. Its fixtures do
not establish physical-device performance or improved starter-roll conversion.
The dice paint layer is outside the scrollable decision rail's clipping container,
so landscape scrolling cannot clip the centered board target.
