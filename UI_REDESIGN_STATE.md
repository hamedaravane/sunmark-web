# Sunmark redesign

## Discovery (base d4b82b3 + preserved local tooling)

Real Phaser UI captured in `output/playwright/redesign/discovery/`: 40 game states
at 390×844, 820×1180, 1440×900. Native account and real online entry/lobby
controllers use isolated browser fixtures; no saves, accounts or live service writes.
Rare phases use `?review` (development only); ordinary practice/story flows retained.

| Screens / journey                             | Player goal; audit                                                                               | New composition                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Home, ranked entry                            | Begin/resume; profile and disabled tiles dominate, no emotional invitation                       | Character-led invitation, one dominant start, compact identity/navigation, quiet secondary modes                   |
| Name, introduction, restart                   | Enter confidently; participant prose and repeated frames obscure the next step                   | Brief welcome, participant roster, anchored entry action; focused confirmation dialogs                             |
| Board, roll, rival turn                       | Read island and next action; large empty deck, detached inventory and scattered desktop controls | Inventory beneath standings; island over a compact command shelf; integrated desktop turn workspace                |
| Placement, targets, inspect                   | Preview then confirm; identical blue list buttons look like actions                              | Structured destination rows and clear preview/confirm hierarchy; preserve coastal clearance                        |
| Build                                         | Compare costs and choices; tall stacked cards waste desktop width                                | Three-column desktop planning workspace, compact phone decisions, disclosure for optional detail                   |
| Bank, port, domestic offers                   | Understand both sides before spending; huge colored blocks, duplicated explanations              | Give/receive workbench, explicit exchange summary and fixed confirmation; negotiation grouped by recipient/bundles |
| Development, rules/effects                    | Understand and select cards; same large card tiles hide selected detail/purchase                 | Compact card catalog plus selected-card inspector; acquisition visibly separate                                    |
| Discard, robber, steal                        | Resolve mandatory decision safely; lengthy copy, weak progress hierarchy                         | Short task lead, prominent selection progress, resource rows and persistent confirmation                           |
| Own/rival players, opponents, tile/port facts | Inspect public facts; private/public sections undifferentiated and verbose                       | Clear identity header, stat grid, grouped factual rows; rival personality as an introduction                       |
| Pause, review, settings                       | Resume/find tools; unnecessary submenu nesting, all actions equally loud                         | Grouped pause dashboard with direct settings, companions, journal, events; restrained switch rows                  |
| Rules, journal, history, turn report          | Learn/recall; undifferentiated walls/lists of buttons                                            | Reading surfaces, chapter grouping, timeline/event rows; calm secondary navigation                                 |
| Characters, dialogue/replay                   | Meet distinct people; illustrations confined to small padded cards                               | Portrait-led gallery and cinematic dialogue with clear speaker/body/reply/action zones                             |
| Profile, name edit, badges, seals             | See progress; equal cards and repeated navigation                                                | Identity/progress overview, responsive collections and compact earned/locked states                                |
| Results, rewards                              | Understand outcome; trophy and repeated blocks dominate                                          | Winner moment, readable standings, distinct play-again/inspect actions                                             |
| Install, update, status                       | Understand availability; long first-entry interruption                                           | Optional installation from settings; grouped readiness/save/version information                                    |
| Account register/credentials/login/recover    | Enter safely; tall generic form, excessive prose                                                 | Branded split welcome/form desktop, compact stepper/mobile; retain native input/autofill/validation                |
| Online guest/home/join/search/lobby           | Find/invite players; tall stacked marketing cards                                                | Mode dashboard, focused code entry, waiting roster and invite panel with explicit readiness                        |

Authenticated progression/referrals/privacy are additionally exercised through mock
service responses and the real entry/controller/rendering paths; no live backend is available. Admin is an access-controlled operator
tool, outside the player game redesign. No feature is removed for lack of a service.

## New direction: Council of the Sun

Atmosphere: an intimate, strategic council on a Persian palace terrace. The supplied
characters carry the drama; interface craftsmanship supports them rather than
competing. Midnight petrol #102a30, deep slate #193a40, warm ivory #f4ebd6,
aged brass #d9b66f, jade #337365, muted rose #a85e58. Ownership colors remain intact.
Vazirmatn runtime Persian: 30/24 display, 20 headings, 15 body, 12 supporting text.
Use quiet single-edge surfaces, modest 10–16px corners, bronze rules, clear selected
states, low-motion feedback. Gold belongs to the next meaningful decision.
RTL text alignment; purposeful full-width phone workspaces, wider comparison panels
on tablet/desktop. All visible game UI stays in the shared Phaser renderer.

## Completed implementation

- Replaced four overlapping visual/layout imports with one council composition stylesheet.
  Shared Phaser surfaces now use quiet petrol/brass materials; original illustration,
  owner colors and native semantics remain intact. Close controls use a restrained cross.
- Character-led home, compact identity/XP, dominant start/resume, clear practice and
  secondary online choices, progression navigation and account entry.
- Match inventory moved below standings; compact two-tier phone commands, continuous
  desktop turn workspace, bounded rival stage. Map/ports remain independently fitted.
- Phone construction piece selector; three-column comparison on larger screens.
  Planning disclosures and real target preview/confirmation remain available.
- Trading workbench and persistent confirmation; compact card library/inspector;
  direct pause tools, recognizable preference switches, expandable rule chapters.
- Responsive profile/collection/results layouts and illustrated account entry.
  Online mode dashboard, four-place waiting state, invite/roster lobby and focused code entry.
- Optional installation no longer interrupts first entry. Install/update/save information
  remains available from the home gear and pause menu.

## Validation / iteration

1. Rebuilt shared materials, home and match composition; corrected the phone start
   action falling below the fold.
2. Reviewed every screen family; corrected negotiation contrast, empty card inspector,
   illustration proportions and native/online workspace hierarchy.
3. Introduced phone construction selection, preference switches, quiet close controls
   and expandable rules; reviewed authenticated progression/privacy/referral states.
4. Refined circular frames, hero composition, player/results hierarchy and guest-first
   startup; completed ordinary practice, rewards and all three rival dialogue journeys.

- Playwright: 43 game + 9 entry/online + 8 authenticated fixture states across
  390×844, 820×1180 and 1440×900. All reports have no page errors. Final screenshots
  were visually reviewed, including focused full-resolution character/task views.
- Focused real session actions verify construction payment, development effects,
  negotiation, discard/theft, keyboard disclosures and preference persistence.
- Ordinary startup verifies guest home, offline entry, account entry, online account
  gate and return home. Ordinary practice completes roll/build/trade/settlement/reward.
  Ordinary narrative verifies Mithra, Ashi and Spenta dialogue at every size.
- 406 unit/session/layout tests passed; typecheck, lint, format, build, PWA and API
  contract checks passed. Core rules and supplied assets are unchanged.
- Captures: `output/playwright/redesign/discovery/` (before), `final/` (after).
  Reports in `final/`: inventory, entry, auth, flow, practice and startup JSON files.
  Rival portraits: `output/playwright/ui/redesign-story/`.
- Browser environment restarted during pass-3; that folder is partial. Completed
  final runs and refinements supersede it; filtered runs preserve the base inventory.

## Remaining / limitations

No critical or major issues remain in the reviewed player flows. Live multiplayer,
service-side account behavior, WebKit and physical devices remain unverified.
Online/authenticated fixtures intercept local API responses; they establish UI behavior
only. The access-controlled operator admin tool is outside this player redesign.
Changes are local; no production deployment or live player writes.

## Guardrails

Core mechanics, authority, costs, privacy, artwork and opt-outs preserved. No new
analytics. Hypothesis: clearer goals and task workspaces reduce scanning and failed
first-match actions; assess existing progress/rejection data plus player feedback.
Screenshots do not establish engagement improvement. No production deployment.

## Gameplay-focused review — latest artwork revision 88c22e0

Problems: passive rival cutouts narrowed phone commands and reserved an otherwise
empty desktop column; redundant Events navigation competed with primary actions;
square header surfaces overwrote rounded modal corners; the mobile cast's intrinsic
aspect-ratio width was right-aligned by RTL layout.

Two implementation passes remove the passive portrait presentation, expand the
desktop board region, stabilize phone controls, make automated-turn Events secondary,
and keep only one Events destination. Dialog headers now share the parent surface,
with inset separators and one quiet perimeter. The mobile cast has a centered box.
Characters continue speaking through existing narrative dialogs and remain in standings.

New Anahita and Ahriman masters are preserved under art/reference/characters, with
full-size alpha-preserving WebP exports. All Anahita expression keys use the supplied
new illustration (one supplied pose, no invented expression variants). Old expression
masters remain reference-only. Ahriman appears in occupied-tile information; the small
board marker stays legible and unchanged. No rules or authority changes.

Captures: output/playwright/redesign/gameplay-before and gameplay-final.
Validation: two implementation passes with fresh, visually inspected mobile/tablet/desktop
captures. Focused gameplay flows passed at all three sizes with no page errors:
construction payments, card effects, negotiation, mandatory discard/theft, keyboard
disclosures and preferences. All 406 tests, typecheck, lint, format, production build,
PWA check (32 offline files), full asset integrity and diff checks passed. Ordinary
practice completed and rewarded at all three sizes; new Anahita art visually reviewed
in actual phone and desktop dialogue. Flow/practice reports have no page errors.
Hypothesis: stable commands and fewer passive surfaces
reduce scanning and missed actions. Assess existing rejection/completion signals plus
player feedback; screenshots alone establish no engagement improvement. No analytics
changes. Changes remain local for this follow-up.
