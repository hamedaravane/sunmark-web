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

## Arrival redesign

Synced main 4842e0f. Replaced competing profile/online/dashboard elements with four
mode/account choices, a capability-aware install card, and secondary collection,
sharing and privacy paths. Updated install sheet with separate embedded/iOS guides
and collapsed technical status. Browser handoff preserves inbound links.

Hypothesis: prioritizing install and clarifying the four choices improves successful
entry and first-match completion; assess existing permitted signals and player
feedback. No new analytics or reward rules. Seven Playwright contexts cover desktop,
tablet, mobile, iPhone Safari, Instagram, installed mode and Android install prompt
including dismissal. Screenshots visually reviewed in output/playwright/onboarding.
Physical iOS/Android installation and actual host-app handoff remain device checks.

Final arrival verification: 418 tests passed, typecheck/lint/format/build/PWA passed.
Seven entry contexts passed in both offline and online-enabled local builds; online
identity responses were mocked as signed out. Native Android prompt availability and
dismissal, installed-mode suppression and iOS/social guidance verified. No page errors.
No production deployment. Browser handoff and installation require real-device checks.

## Five-character title screen

Replaced the menu dashboard with a cinematic five-character ensemble over the
palace, restrained dark scrim, and typographic navigation. Removed the dedicated
character-introduction action and all title-screen button/panel frames in the Phaser
renderer. Only the primary play action and interaction feedback receive a gold rule.
Installation remains a contextual text entry; modes and account access stay direct.
Portrait tablet now uses a larger stacked ensemble rather than a cramped two-column
composition. Gameplay dialogs and their surfaces are unaffected. Existing companion
dialogue/gallery access inside gameplay remains intact.

Title-screen verification: visually reviewed fresh phone, tablet and desktop views
including a second portrait-tablet composition pass. Playwright entry checks cover
five portraits, four main actions, no companion-introduction button, installed mode,
iOS/social guides and Android prompt/dismissal. All 418 tests and lint/format/build/
PWA checks pass. Changes remain local; no device-installation claims.

## Compact menu correction

User rejected underlined text controls and requested minimal scrolling. Replaced
these with a single gold Play button, paired Tutorial/Online controls, and full-width
account control. Secondary collection/account/privacy tools are in native More;
Invite stays directly visible. Art scales with viewport height and width together so
short phones retain visible faces and 44px minimum main targets. Native scrolling
remains available for expanded tools, rewards, zoom and larger text.

Fresh filenames: output/playwright/menu-compact-v3 (previous screenshot filenames
were reused). Geometry assertions verify zero collapsed-menu overflow and all four
actions entirely inside 320x568, 360x640, 390x844, 820x1180 and 1440x900 viewports.
Screenshots visually inspected. More expansion and privacy access tested.

## Supplied wordmark integration

Synced latest main c6f1b18 and inspected the uploaded gold/red Sunmark logo. Preserved
its original PNG under art/reference/branding and exported a full-frame lossless
WebP (23% smaller; alpha exact). Menu heading now uses the supplied logo, removing
the former plain wordmark/extra rosette. Accessible h1 name is retained. Logo sizing
respects short-phone navigation space; square PWA icons remain legible emblems.
Fresh captures: output/playwright/menu-logo-final.
Verified all four actions fit without menu scrolling at all five review sizes.
26 focused tests, typecheck, lint, formatting, build and PWA checks passed.

## Foreground logo composition

Moved the logo from the header into an absolute foreground layer at the cast's
base, painted after the portraits. Characters sit 30px above the stage edge so the
wordmark conceals lower-body crops while faces remain exposed. Header retains the
settings control. Main actions still fit without scrolling at all five review sizes.
Fresh preview folder: output/playwright/menu-foreground-logo-v5.

## Balanced ensemble refinement

Brought outer figures within the wordmark's opaque backing, raised supporting
characters above adjacent shoulders, and moved Ahriman in front of Anahita's arm.
The renderer clips only title-screen portraits below the measured midpoint of the
foreground logo, preventing source waist edges from leaking beneath/around it.
Source artwork and narrative portraits are unchanged. Initial tighter pass obscured
Anahita; corrected after visual inspection. Final captures:
output/playwright/menu-balanced-cast-final. Main navigation remains scroll-free
at all five tested sizes.

## Anahita-centered final ensemble

User clarified Anahita is the main character. She now occupies the largest central
portrait and is painted last among the cast, immediately behind the logo. Mithra
sits left and slightly higher to clear her hair/shoulder; supporting figures retain
separate readable faces. The wordmark-backed waist clipping remains unchanged.
Ashi sits slightly farther right to clear Anahita’s water effect.
Final preview: output/playwright/menu-anahita-final-v9.

## Annotated menu feedback — visible controls and returning users

User screenshot exposed a persistent reward banner, ghost install/share controls
and an easily missed settings icon. Install guidance is now one surfaced teal button;
settings has a text label, bounded target and gold outline. Invite and More live inside
the decision workspace, aligned with play modes. Removed redundant installation
heading. Past rewards are shown only in profile, with stored rewards unaffected.
Practice verification now checks the reward through profile rather than expecting
a permanent home banner. A regression test exercises a returning profile with reward.
Browser captures seed a real saved practice reward and verify no menu scrolling.
Fresh folder: output/playwright/menu-visible-controls-final.

Verification completed: 419 tests plus typecheck/lint/format/build/PWA passed. All five
returning-player browser contexts passed without page errors or main-menu scrolling;
profile reward access was verified in each. Updated desktop/mobile screenshots were
visually inspected against the annotated issues. Changes remain local.

## Gameplay spacing and task workspace correction

Annotated issues reproduced in actual board, bot, construction, player-trade and
accepted-trade fixtures. Header menu is now a separate edge control outside the
standings. Sidebar is content-sized; receipts no longer inherit 100% height or
auto width, and shortcuts each span the workspace. The apparent strip was unused
space beside a stretched button rather than a functional scrollbar.

A shared 8/12/16px spacing rhythm reduces body/footer margins. Non-narrative dialogs
use fit-content height with bounded scrolling; initial auto-height experiment
stretched dialogs and was corrected after screenshot inspection. Construction cards
stretch uniformly with shared action/detail rows. Trade editor uses bounded columns,
44px stepper targets with gaps and labeled mobile Give/Receive groups. Optional rules follow the editor. Scroll indicators use subdued slate
instead of a high-contrast gold track. Confirmation omits irrelevant paused-bot
controls and keeps actions directly below the summary. No game rules changed.

Before: output/playwright/redesign/spacing-before. Refined captures: spacing-compact.
Targeted geometry/action captures and reports: spacing-verified. Final checks passed:
419 tests, typecheck, lint, format, build and PWA. All three viewport categories
passed geometry checks, proposal submission and final exchange with no page errors.
Screenshots visually reviewed after each pass. Changes remain local.

## Broadcast-first player trading

Removed recipient cards from the editor. New UI offers reach all eligible opponents
on the player's turn, only the active player off-turn; incoming counteroffers keep
the original partner. Fresh local editing clears a previous partner selection.
Online delivery uses sequential acknowledged existing offer commands, stops on
context/transport failure, reports partial delivery, and blocks double taps/edits.
No resource transfer or consent rule changed. Focused tests cover broadcast, off-turn,
counter, turn-change, failure and partial-delivery cases. Verification: 426 tests,
lint, format, typecheck/build and PWA checks passed. Playwright passed proposal and
final-exchange interactions at 390×844, 820×1180 and 1440×900 with no page errors.
Trade editor screenshots visually inspected at all three sizes; captures and report:
output/playwright/redesign/broadcast-final. Online delivery uses mocked-transport
tests; live multiplayer was not exercised. Changes remain local.

## Casual Persian character dialogue

Rewrote all story beats, optional replies, character quotes, move-review dialogue
and Anahita lessons/tasks in concise spoken Persian, with distinct cast voices.
Ahriman joins three existing checkpoints with correct art/history attribution;
he remains separate from opponent seats and reply personalities. Existing triggers,
pacing, saves, opt-outs, rules and private-information boundaries are preserved.
Verification: npm run check passed (429 tests, API contract, lint, formatting,
typecheck/build and PWA). Focused dialogue/tutorial/character tests pass (39),
including Ahriman art, history, saved-line restoration and unchanged rule state.
No browser review for this copy-focused change; changes remain local.

## Cinematic entrance — 2026-11-09

Base dc96f23 (latest main with four supplied layers). Verified PNG dimensions and
alpha, visually inspected every source. Preserved PNG masters under art/reference/menu;
responsive, alpha-preserving WebP exports under public/assets/menu. No new dependencies.

Direction: bright golden-hour Persian world with separately positioned landscape,
palace, garden and ensemble. Native CSS menu for independent art direction and immediate
usable controls; existing transparent Phaser canvas still renders gameplay and dialogs.
Desktop: controls left, cast/logo right; portrait: cast above centered menu; short
landscape: compact split layout; unusually small views may scroll safely. Anahita stays
central. Wordmark occludes the ensemble's source crop. No illustration repainting.

Pass 1: replaced single dim background, individual cutouts and install-first ordering.
Pass 2: corrected garden's hard top edge and bounded control glow overflow.
Pass 3: verified 12 viewport compositions; detected palace/foreground gap in portrait,
corrected palace bottom overscan and reduced redundant short-phone text.
Shared Sunmark palette feeds native CSS and Phaser material/HUD colors; account
surfaces use the same colors. Pass 4 refined portrait base overlap and tablet-landscape
split composition. Pass 5 added a graceful missing-art fallback, reduced repeated
menu copy while preserving availability warnings, and aligned expanded More actions.

Inventory for shared review: home/more/settings/install/name/intro/practice,
board/build/bank/domestic/development/discard/robber/steal/players/inspection,
profile/badges/cosmetics/pause/help/history/results, account and online entry/room.
Complete: 12 final viewports (all ten requested + 2560×1080 + 320×568), screenshots
visually inspected individually/contact sheets. Normal phone/tablet/desktop actions
fit; the 320px phone scrolls safely. 43 fixture states captured and visually reviewed
at mobile/tablet/desktop; real practice through paid road, bank trade, settlement,
score/reward and return passed at all three. Account/online entry/room fixtures and
seven platform-install contexts passed. Keyboard focus/settings/profile, actual new
match + reload/resume, image failure, 200% text, rotation and reduced motion passed.

Checks: npm run check (430 tests, API contract, lint, format, typechecked build, PWA)
and npm run assets:check passed. All four PNG source hashes match latest main exactly.
No dependencies, rules, save schemas or API contracts changed. Browser coverage uses
Chromium with isolated contexts/fixtures; physical iOS/Android installation and live
multiplayer were not exercised. Only a short opacity reveal runs on desktop.

Artifacts: output/playwright/redesign/cinematic-before (baseline), cinematic-final
(12 final captures, report and contact sheet), cinematic-system (43×3 screen captures
and visual review sheets), cinematic-interactions, cinematic-practice, cinematic-entry;
platform guides in output/playwright/onboarding. No unresolved major design issues.
Changes remain local; no publishing/deployment performed.

## Portrait background composition refinement — 2026-11-09

Preserved approved typography, controls, cast/logo and desktop. Compared elevated,
blended-courtyard and bottom-anchored options in actual Playwright screenshots.
Following the owner's preference, kept the simpler bottom anchor and open sky.
Owner approved the tablet's scale/depth. Retained its wider architectural view;
phone comparisons favored a closer palace crop to keep it visible around controls.
No extra terrace plane, new art, assets, dependencies or multiplayer changes.

Implementation: portrait-only palace width/focal variables; bottom:0, independently
reframed horizon/garden and lighter local lighting. Verification: 12 viewport captures
visually inspected, no overflow/art distortion/page errors. Desktop 1440×900 is
pixel-identical to baseline. Browser comparisons confirm unchanged cast/control
bounds and typography/colors/borders; bottom anchor, hit testing, settings, profile,
install guide, play entry and phone rotation passed. Build/PWA, lint, formatting and
47 focused responsive/profile/account tests passed. No unresolved major issues.

Artifacts: output/playwright/redesign/portrait-scene-experiments (baseline/initial
options), portrait-bottom-experiments, portrait-phone-reference, portrait-scene-final
(12 captures, contact sheet, viewport report and interactions.json).
Changes local; no publication/deployment performed.

Phone sky follow-up: compared 200vw, 170vw and 145vw panoramas at 390×844,
375×667 and 430×932. Selected 145vw: roughly 69% of the source's horizontal
panorama is visible, including the low sun and mountain ridge, versus the previous
height-cover crop. Lower mist softly meets a matching atmospheric gradient.
Tablet composition remains owner-approved; desktop/tablet framing and the
bottom-anchored palace, cast, logo and controls are unchanged by this sky refinement.
Final captures/checks: output/playwright/redesign/portrait-panorama-final; comparison
captures in portrait-sky-experiments. Final verification passed: all 12 viewports
captured/visually inspected; all eight non-phone-portrait views pixel-identical to
the approved palace pass. UI geometry/styles, bottom anchor, hit testing, menus,
play entry and rotation passed again. Build/PWA and scoped format checks passed;
47 focused tests/lint passed for this scene-only change. No new artwork required.
