# Player hub and progression — first version

Status: implemented in the frontend and authoritative backend. Offline rewards now synchronize to a separate server-backed offline ledger; competitive/online progression remains separate. The reward values are initial product tuning, not changes to the ten-point board-game rules.

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
offline-only build. Competitive opens the live ranked profile and four-human queue. Five completed ranked games reveal a visible rating and tier. Signed-in players see server XP, coins and rank in the main card; offline goals and local rewards remain explicitly separate.

The profile reports completed offline games, wins, losses, total XP, coins and
unlocked badges. Players can edit the profile name without changing an ongoing
match. New matches suggest that profile name; a returning player's existing save
can supply the initial profile name. Historical completed matches are not
retroactively rewarded.

## Three distinct forms of progress

| System               | What it means in this version             | How it changes                                                      |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Account XP and level | Participation and learning on this device | Complete offline games and milestones                               |
| Coins                | A local cosmetic balance                  | Earn rewards; buy profile-seal appearances                          |
| Competitive rating   | Skill against other human players         | Server-owned ranked results; never inferred from XP or offline wins |

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

The local profile uses `sunmark.progression.v1` (or that key suffixed by the signed-in player ID) in localStorage, separate from the match,
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
not an anti-cheat boundary. The offline-sync release adds an idempotent canonical
server ledger and a version-2 local profile/outbox envelope; see OFFLINE_SYNC.md. Clearing browser data
clears this profile. The online account has its own recoverable, server-owned progression. Local wealth is never imported into it.

## Server account, ranked and referral progression

The existing username/password account and recovery key now carry server-owned
XP, coins, wins, badges, purchases, rating and referral goals across devices.
The hub refreshes that profile after account entry, returning from online play and
receiving a finished match. Requests validate the backend-pinned runtime schema;
stale responses from another account cannot replace the current player's profile.
The cosmetic collection uses the server catalog and committed balance.

Ordinary completed online games give 100 XP/20 coins, or 150/30 for a win, with
first-match/first-win/five-match/five-win bonuses matching the local tuning above.
Private and casual online matches earn participation rewards without rating.
Online practice cannot be claimed from client saves. Results show the committed
online receipt separately from local rewards.

Ranked requires four distinct recoverable accounts, never bots or private invites.
Its separate persistent queue favors similar ratings, widening the range as people
wait. Unassigned searches expire after 30 seconds without a heartbeat. Assigned
players resume the same match after reconnection; cancellation cannot abandon an
already assigned seat. Existing turns remain untimed and resumable, which the
competitive entry explains before searching.

After five provisional games, six tiers are visible: Bronze below 900, Silver
900–1099, Gold 1100–1299, Platinum 1300–1499, Diamond 1500–1699 and Master at 1700+.
Internal ratings start at 1,000. A winner-only pairwise Elo update gives an equal
four-player match +24/-8/-8/-8, with a zero sum. A lower-rated winner gains more.
Losing players are not sorted by public or hidden victory points. Skill rating is
independent of XP, coins, purchases and referrals. The initial model needs actual
player calibration; no timed-mode or seasonal reset is implied.

The referral panel provides the player's username as a code and a shareable link.
Following a link prefills a confirmation screen. A new player selects one friend
before completing their first online game. After three completed ranked matches
with different opponent groups, both players automatically receive 100 XP/40 coins.
Repeating one group does not advance this goal. Referrers can earn for ten friends;
self-referrals, changing referrers and repeat payouts are rejected. A successful
referrer also earns the Ambassador badge. Phone ownership remains unverified;
these basic controls do not prove resistance to coordinated real-account collusion.

The backend settles match state, command receipt, completion marker, reward ledger,
rating, referral qualification and outbox in the same PostgreSQL transaction.
Failed reward persistence rolls back the result; retries cannot duplicate credit.
The new API is additive and existing match snapshots remain compatible. See the
backend `docs/PROGRESSION_AND_RANKED.md` for endpoint, model and migration details.

## Future decisions and review

Turn deadlines, surrender, abandonment, server-outage policies, seasons, public
leaderboards, stronger identity verification and moderation remain separate
product decisions. Keep raw-minute payouts, invitation-send rewards, trade spam
and XP-driven skill rank out of the economy. Weekly goals should reward enjoyable
completed play and learning rather than daily streak loss.

Node/PostgreSQL tests cover concurrency, duplicate grants, failed-write rollback,
private bot outcomes, cross-device recovery, cosmetic charges, referral groups and
caps. Frontend tests cover rank rendering, owner-specific caches, stale responses,
server purchases and ranked heartbeat/cancellation routes, alongside existing local
save and gameplay suites. The release pins exact backend source and image versions.

The repository leaves interactive/device testing to the user. Review mobile hub
scrolling, long names, IME and modal focus, account login/recovery, ranked search
and reconnect, referral-code confirmation, cosmetic purchases, installed-PWA
updates/offline behavior and private-room invitations. Automated checks are not a
claim of browser/device verification.

## Offline synchronization update (2026-11-04)

The prior device-only description above records the original version. The current
implementation stores offline coins, XP, achievements, practice, cosmetics and
completion IDs on the server after connectivity returns, including authenticated
guests. Registered accounts can restore that canonical offline profile on another
device. Pending commands are durable locally and acknowledged transactionally;
legacy profiles are preserved/imported and conflicting old snapshots archived.
Offline rewards remain client-reported and separate from ranked/online wealth.
Unfinished board saves remain local. See OFFLINE_SYNC.md for exact migration and
recovery limits, privacy and verification.
