# Player hub and progression — first version

Status: implemented locally in the frontend. The reward values below are initial
product tuning, not changes to the ten-point board-game rules. Nothing in this
change implements or publishes ranked matchmaking or a persistent online account.

## Player experience

The main menu is now a Persian, right-to-left player hub, using the existing
palace, runtime seal avatars, enamel materials, gold rosettes and Vazirmatn font.
The reference remains 390 × 844 CSS pixels. The panel is capped at 480 pixels;
shorter and narrower screens scroll without shrinking touch targets below 48
pixels. All visible surfaces and words remain Phaser Graphics/Text, measured by
the transparent semantic controls and native modal system.

The hub brings together:

- A named profile, equipped cosmetic seal, level, XP progress and coin balance.
- Four clear mode cards: Competitive Online, Private Rooms, Offline and Practice.
- The next unearned milestone with its requirement and reward.
- Profile, achievements and cosmetic-collection panels.
- The latest reward receipt and the existing installation, update and offline status.

Offline resumes the unfinished local match. Practice remains a separate exercise
that preserves the main save. Private Rooms opens the existing online lobby and
its code/link invitation flow; it stays visibly unavailable in an explicitly
offline-only build. Competitive opens an explanatory panel marked coming soon
and unranked, with a shortcut to private rooms when available.

The profile reports completed offline games, wins, losses, total XP, coins and
unlocked badges. Players can edit the profile name without changing an ongoing
match. New matches suggest that profile name; a returning player's existing save
can supply the initial profile name. Historical completed matches are not
retroactively rewarded.

## Three distinct forms of progress

| System               | What it means in this version             | How it changes                                            |
| -------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Account XP and level | Participation and learning on this device | Complete offline games and milestones                     |
| Coins                | A local cosmetic balance                  | Earn rewards; buy profile-seal appearances                |
| Competitive rating   | Skill against other human players         | Not available yet; never inferred from XP or offline wins |

A loss still makes progress. The first level requires 300 XP; each subsequent
level requires 100 more than the previous one, up to 1,500 XP per level. Levels
never consume coins or change the rules, dice, resources, bot strength or score.

## Initial reward policy

Rewards apply automatically after confirmed completion. There is no claim button,
login payout, elapsed-time payout or reward for repeatedly opening a panel.

| Event                                    |        XP |    Coins | Repeat policy                                     |
| ---------------------------------------- | --------: | -------: | ------------------------------------------------- |
| Finish an offline game without winning   |       100 |       20 | Once per match                                    |
| Win an offline game                      | 150 total | 30 total | Once per match                                    |
| Complete the four-step practice exercise |       100 |       40 | Once per local profile, including its badge bonus |

The following badge bonuses are additional to ordinary match rewards:

| Badge        | Requirement               | Bonus XP | Bonus coins |
| ------------ | ------------------------- | -------: | ----------: |
| اولین گام    | Complete practice         |      100 |          40 |
| همسفر        | Finish one offline game   |       50 |          10 |
| اولین پیروزی | Win one offline game      |      100 |          25 |
| جهانگرد      | Finish five offline games |      200 |          50 |
| پیروز جزیره  | Win five offline games    |      200 |          50 |

The practice row in the first table is the اولین گام badge award, counted once.
For example, a first offline win grants 300 XP and 65 coins: 150/30 for the match,
50/10 for the first completed match and 100/25 for the first win. It reaches level 2. Completing practice separately adds 100 XP and 40 coins. Replaying practice is
always available, but does not repeat its reward.

Leaving an unfinished game, an invalid action, a preview or a failed victory
declaration grants nothing. A bot victory grants the human the participation
reward and records one loss. Private online matches currently do not affect this
local ledger or competitive rank.

## Coins have a usable purpose

The collection contains a free gold Sun seal, a Turquoise seal costing 100 coins
and an Amethyst seal costing 200 coins. Buying a seal debits coins and saves its
ownership and selection together. Equipping an owned seal is free; insufficient
funds cannot create ownership or a negative balance. Only the profile avatar rim
changes. Match ownership colors and every gameplay rule retain their meanings.

These prices make the first cosmetic reachable through a first win plus practice,
or through repeated completed matches. They should be adjusted using playtest
feedback about match duration and perceived effort. There are no paid coins,
random purchases, stat boosts or exchange into board resources in this version.

## Persistence and implementation

`src/game/progression/progression.ts` owns the typed, validated device profile and
reward policy independently of Phaser and core rules. `progressionMarkup.ts`
projects its values into semantic hub and modal content. The existing Graphics
components paint those measurements; the new layout lives in `player-hub.css`.

The profile uses `sunmark.progression.v1` in localStorage, separate from the match,
tutorial and experience-preference slots. It stores the balance, XP, milestone
ownership, purchased seals, selected appearance and latest reward receipt in one
JSON write. Runtime validation checks version, numeric limits, known identifiers,
ownership and milestone consistency. Reads return detached copies. Storage
failures preserve current-session play and show a persistence notice.

Every new local match receives a UUID stored as optional `progressionId` in the
existing version-2 match envelope. An unfinished legacy save gets an ID when
resumed and writes it before further play. The completed-match ledger remembers
IDs, preventing repeated rewards when results reopen or a completed save reloads.
The ledger is bounded to 20,000 matches. It is never pruned in a way that would
make an older remembered match eligible again.

A successful transition into `finished` settles the human reward, whether the
winner was human or bot. Completion of the full practice sequence settles its
one-time milestone. Rewards do not depend on rendering, animation callbacks,
opening results, or clicking the menu. The existing game-state and reward writes
are separate localStorage entries: settling the reward first allows an older
match snapshot to replay completion without granting again when the reward write
succeeded. A failed profile write cannot promise durable rewards after a reload.

Sequential changes from another tab are read before profile mutations, and
storage events refresh the hub. localStorage does not provide a transaction across
simultaneously active tabs; this is a local, single-player convenience ledger,
not an authoritative economy or an anti-cheat boundary. Clearing browser data
clears this profile. No account linking, cross-device recovery, online currency
claim or import of local wealth is implied.

## Next phase: persistent online progression

The next useful milestone is a stable player identity and a server-owned reward
ledger, then online rewards and social goals. Current guest sessions expire after
30 days and are tied to the browser; they are not sufficient for a recoverable
competitive career. Design player identity independently of the guest-session
row, with account linking/recovery and an explicit migration policy.

Add a durable match-completion record through both the human-command and bot-step
paths in the backend. Settle eligibility and rewards exactly once per match,
player and reward kind; capture the policy version as metadata, never as a way to
re-grant the same match. Store the result and outbox entry atomically, then apply
an idempotent reward transaction. Persist balance changes, milestones and their
receipt together. Reconnection reads the committed receipt instead of trusting
an animation or uploaded save. Failed delivery must remain retryable.

Keep local and server progression distinguishable. Do not upload client totals
as authoritative coins, XP, wins or competitive eligibility. Any welcome grant
or cosmetic carryover requires its own explicit, bounded migration decision.
Follow the existing server-owned OpenAPI/runtime schemas and frontend contract
pinning; use migrations and cross-repository integration tests for the actual
online implementation.

## Ranked design to refine before implementation

Recommended direction, not shipped requirements:

1. Start with one solo queue of four human players. Friends continue to use private
   rooms, where negotiated trades and repeated opponents make rating manipulation
   easier. Avoid splitting a small population into many queues; never silently
   fill a ranked match with bots.
2. Keep one competitive rating distinct from XP, with a visible tier, emblem,
   recent changes and season-best display. A short provisional period should
   communicate uncertainty rather than pretend that five matches establish an
   exact skill estimate. Choose the model, starting distribution, tier thresholds
   and placement count using simulations before locking numbers.
3. Use a tested multiplayer model with an explicitly supported winner-only outcome.
   Sunmark records one winner, not an agreed complete finishing order. Do not
   manufacture second/third/fourth from visible scores or reveal private VP cards
   to compute them. Volume, referrals, purchases and activity badges cannot raise
   the skill rating directly.
4. Resolve ranked interruption rules before opening the queue: turn deadlines,
   reconnect grace, setup/discard/trade timeouts, abandonment, surrender and server
   outages. These are currently undecided online rules; this UI does not invent
   durations or bot takeover.
5. Add bronze-to-top-tier medals after the model is calibrated. Prefer distinct
   shapes, readable Persian labels and restrained material differences over color
   alone. Show current rating, previous-to-new change and an intelligible result
   explanation in match results.
6. Use seasons for optional competitive milestones and cosmetics after the queue
   is healthy. Lifetime XP, earned coins and collection ownership should survive;
   any rating recalibration requires a documented policy. Season length and reset
   behavior remain open.

## Engagement and friends

Encourage another enjoyable session through a clear next milestone, understandable
results, rematches and private invitations. Avoid rewards for raw minutes online,
trade spam, resource cycling, invitation sends or simply keeping the app open.
They are poor measures of meaningful play and create farming incentives.

A later friend/referral program should reward both players only after a genuinely
new, recoverable account completes verified play, using one referrer per new
account, a bounded reward budget and repeat-pair/collusion checks. Sending a link
alone earns nothing. Start with a modest one-time cosmetic/XP reward; do not
award rating. Invitations should be player-initiated through the current room
flow. A social graph, presence, party queue, moderation and reminder notifications
need separate scope; they are not implied by the existing invite links.

Once server completion events exist, add a small optional weekly set of goals
around finishing games, learning and playing with a friend. Avoid daily streak
loss or objectives that encourage players to sabotage winning decisions. Measure
match completion, voluntary return rate, invite-to-completed-match conversion,
reward error rate and earned-versus-spent coins. More minutes alone is not a
sufficient success metric.

## Verification and user review

Focused Node tests cover completion and practice integration, human/bot outcomes,
level thresholds and milestones, duplicate grants after reload, legacy-save IDs,
cosmetic purchases, insufficient funds, corrupted/unavailable storage, sequential
tabs, escaped names and menu/sheet routes. Existing game-rule/session tests remain
applicable because the core rules were not changed.

The repository asks that browser/device interaction remain with the user. Review
390 × 844 and 320-pixel portrait layouts, short landscape scrolling, long Persian
names, profile-name keyboard/IME, modal focus, reward visibility, installed-PWA
offline/reload, and the private-room invitation round trip. No manual browser or
device verification is claimed by the automated checks.
