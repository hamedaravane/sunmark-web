# Player-to-player trading

## Rules and attribution

Domestic trades use the [official CATAN Rules & Almanac, Domestic Trade, page 7](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf#page=7) and [CATAN's trade FAQ](https://www.catan.com/faq/basegame). Trades happen after production/Ahriman resolution, always include the active player, and exchange nonempty resource bundles simultaneously. Ratios and quantities are negotiated; matching resource types on both sides, gifts, credit, services, and development-card trades are disallowed. Trades are public. Opponent resource types stay private; their total card count is public. Sunmark retains its already-approved combined build/trade action phase and other MVP rules.

These rules apply equally to humans and bots, including human responses/proposals during a bot's action phase. Bank/port trading still requires the human's own turn. Inactive bots cannot trade with one another on someone else's turn. Only actual held cards can fund payment; incoming cards never fund an outgoing obligation.

## Interface

The personal five-resource inventory (including zero balances) stays pinned between the sheet heading and the scrolling content in composing, conversation, and review modes. It is a measured semantic `SheetContent.context` slot painted on the modal layer outside the body mask. The strip shows only resource icons, names, and current counts; building choices and planning guidance stay out of negotiation. Unaffordable payments show their exact shortfall, and final review retains the before/after balance check. Incoming open offers have only accept, counter, and reject actions; the header close control handles leaving the workspace.

Official rules allow proposals and counteroffers and keep resource hands private; they do not require a proposer to know the recipient's exact holdings. Sunmark therefore keeps unaffordable counteroffers negotiable, disables acceptance, and identifies the exact missing payment resources. Decrementing an inherited oversized counteroffer remains possible until it fits the hand. As a local interruption policy, unsolicited bot proposals are delivered to the human only when the human can currently fund the requested bundle. This check happens in the session adapter after blind bot planning; it does not supply hidden inventory to the planner, change core proposal validity, or limit human-initiated negotiations/counters. Skipped unsolicited offers create no pending consent and never stall a bot turn. This is a UX policy, not an additional CATAN rule. See the [official domestic-trade rules](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf#page=7) and [official FAQ on private resource information](https://www.catan.com/faq/basegame).

The existing dock has Build and **معامله**. Trading opens a two-tab workspace: **بازیکن‌ها** and **بانک و بندر**. Domestic trading is enabled during the action phase, even on a bot's turn; in that case, the only possible recipient is the acting bot. Bank trading is unavailable off-turn. No additional persistent HUD row is added.

On the human's turn, the normal editor announces a new bundle to all eligible opponents without recipient selection. Outside that turn, it addresses only the active player. Counteroffers remain tied to their original partner. Five resource rows contain independent give/receive counters with 48-pixel touch regions and compact stone faces. The give side cannot exceed the human's current inventory; opposite-side increment buttons prevent matching resource types. Requested quantities are never clamped to an opponent's private hand. A short read-only audience note explains who receives the offer; partner names remain on responses and final confirmation.

Every offer and counteroffer uses the human's orientation: **تو می‌دی** and **تو می‌گیری**, including incoming offers during bot turns. Offer status, counterpart, quantities, and concise bot rationale appear together. Open, accepted, rejected, countered, withdrawn, expired, and completed states have distinct Persian text. Countering starts a new immutable offer revision; old terms become nonactionable. Editing a fresh proposal withdraws earlier human promises. Closing the workspace or changing to the bank withdraws/rejects outstanding human negotiations without moving resources.

A bot acceptance does not transfer cards. The human chooses an accepted proposal; incoming offers first require human acceptance. A separate final review resets content scrolling, focuses its confirmation action, and shows the exact bundles and resulting human balances. **تأیید نهایی و جابه‌جایی منابع** revalidates both hands and commits once. The renderer guards rapid taps across review/confirmation; consent and payment remain deterministic core operations. A clear receipt remains open afterward. Live offers appear before obsolete conversations; after completion, the receipt appears first. Any competing accepted promises are withdrawn after one deal completes. New offers and repeated trades remain unrestricted.

Body content scrolls independently. The give/receive summary and send/final confirmation controls use a fixed sheet footer, painted outside the body mask. All surfaces, labels, resource icons, status, and controls use the existing Phaser Graphics/Text and semantic-DOM architecture. No new raster assets, native dropdowns, or hidden opponent inventory screens are introduced.

## Core and session boundaries

- `core/domesticTrade.ts`: bundle validation, active-party/phase rules, safe integer/payment checks, atomic immutable exchange, and a provisional consent ledger with monotonic IDs. Proposal, acceptance, rejection, counter, withdrawal, and snapshot operations never mutate resource state. Only accepted, current, participant-authorized offers can confirm. Both payment and receipt happen together; repeated confirmation fails.
- `core/commands.ts`: the `domestic-trade` command dispatches the validated exchange and supplies serializable transition terms.
- `ui/playerTrading.ts`: human drafts, eligible audience scope, conversation/review state, actor guards, bot proposals/responses, and public history descriptions. `GameSession` publishes confirmed changes through its existing transition pipeline; hand deltas derive from actual state differences.
- `ui/domesticSheet.ts`: human-oriented bundles, audience notes, responsive counters, per-offer decisions, review, receipt, and compact in-game rule reference.
- `ui/botTurns.ts`: the existing 650 ms runner paces bot replies as well as normal actions. While a domestic sheet is open, only replies to human proposals may advance. Other dialogs, hidden pages, and app updates pause all bot work. Bot-to-bot negotiation cannot close or interrupt a human editor. An incoming human decision waits indefinitely, without an acceptance timer.

The table is scoped to the active seat and round. A turn/phase change expires old offers and resets draft/automatic-offer policy memory. Replacing or leaving the match cancels scheduled work using existing session/runner guards. The consent ledger is separate from authoritative card state: an announcement reserves nothing and creates no debt.

## Bot negotiation

`core/botTrading.ts` evaluates the bot's own inventory against useful road, settlement, and city plans on the public board. Reserved construction resources are more valuable than surplus; resources without local production are scarcer. Completing a build plan earns additional utility. Bots decline help to a near-winning public leader unless they are also close to winning. Different acceptance thresholds give the opponents different bargaining preferences.

Bots accept useful deals, explain rejection without revealing exact private inventory, and can counter by asking for additional offered resources or reducing their own payment. Their proposals use actual own surplus and request missing resources; proposing never inspects the recipient's private holdings. Privacy tests change every other hand and verify identical planning/evaluation.

An active bot tries domestic negotiation before falling back to a bank trade or ending its turn, after taking immediately useful builds. It can approach the human and other bots; bot-to-bot exchanges follow the same consent/payment rules. Inactive bots can also initiate a useful offer to the human active player. To avoid repetitive interruptions, automatic behavior tries each partner once per active bot turn, sends at most one unsolicited pitch during each human turn, and counters at most once per thread. These are AI pacing choices, not CATAN restrictions: the human can make as many new proposals, counteroffers, and completed trades as desired. There are no resource gifts, forced acceptances, invented bargaining currency, network services, or changes to dice randomness.

## Persistence and tutorial

Version-1 saves gain an optional `trading` snapshot. It preserves public offers/status/revisions and automatic-offer attempts for the current active seat/round; typed, unannounced drafts and final-review selection remain transient. Pending human consent resumes in the domestic sheet after reopening or a PWA update, without moving cards or replaying a completed exchange. Reviewed accepted offers require final confirmation again after reload. Completed transactions already reside in the authoritative player hands and public history. Older saves without trading data remain valid.

`persistence/validateTrading.ts` checks context, participants, IDs, statuses, bundles, parent ordering, sizes, and attempt keys before restore. Invalid trading data invalidates the snapshot safely without overwriting stored data. Existing save-error handling still prevents a PWA update from discarding an unfinished unsaved match.

Anahita introduces **domestic** when its workspace first opens, including off-turn invitations. **domestic-done** follows a completed trade involving the human, even when the active seat is a bot. Bot-to-bot trades never earn human practice or bank-trade practice. Narration restores the interrupted negotiation/receipt.

## Verification

Focused Node tests cover rule restrictions, multi-resource conservation and immutability, invalid quantities/types, gifts/overlap/overspending, consent ownership, revisions, one-time confirmation, broadcast selection, stale/expired offers, bot plan/privacy/counter behavior, paced replies and initiated offers in both turn directions, human editor protection, off-turn permissions, dismissal, final balances/history, legacy and pending-offer recovery, PWA updating, and tutorial practice. Seeded session simulations include negotiated trades and progress to victory without browser rendering.

The user performs interactive/device testing, production builds, and CI. Node checks do not establish native-modal, scrolling, typography, or touch appearance. Device review should cover a five-resource bundle, broadcast responses, an unaffordable counter, incoming bot offers, cancellation/closing, final review/receipt, switching bank tabs, and reopening while an accepted proposal is pending.

## Returning to the board after a final outcome

A successful human rejection closes the panel without transferring resources. Completed final confirmation closes it after one atomic transfer; the public receipt remains in history/table. A human broadcast stays open while responses are still pending and closes after its final rejection. Stale/invalid responses do not dismiss an active workspace. Acceptance awaiting final confirmation is not yet a completed exchange. Tutorial credit no longer opens a completion modal over the returned main screen.

## Online audience delivery

The online editor sends one existing server-validated offer command per eligible
recipient, sequentially using the client’s latest confirmed revision. No protocol or
server authority changes are required. Repeated sends/edits are blocked while sending.
Delivery stops on failed/uncertain acknowledgement, changed match/turn/actor, expired
eligibility or insufficient outgoing resources. Partial delivery is reported explicitly;
uncertain commands remain in the existing idempotent retry path. Offers never transfer
resources; acceptance and final confirmation remain per partner. Live broadcast is
not atomic across the network.
