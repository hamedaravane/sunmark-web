# Desktop tabletop experience

## Composition

Desktop play uses a bounded tabletop composition rather than enlarging the phone HUD. The ocean remains the setting; the land, public standings, and private decisions have separate regions.

- An 80-pixel player header spans the composition. The human identity, own score, latest public dice, and menu stay together on the right. Opponents get separate readable cards across the remaining width, with public scores and active-turn emphasis.
- The island is centered in the remaining board region. Hex radius is capped at 66 CSS pixels, limiting land to approximately 572 × 528 pixels, plus the existing 40-pixel coastal clearance on each side. The camera and pointer projection use the same capped geometry. Neither zoom nor panning is required.
- Pieces and number medallions receive a restrained 1.2× desktop detail scale (approximately 25/30-pixel settlement/city silhouettes and 18.5-pixel number labels in local play), so enlarging the terrain does not leave its important information looking miniature. Port geometry stays unchanged to preserve the coastal-clearance budget.
- A 340-pixel command panel groups turn/round context, dice when needed, the human resource hand, contextual guidance, three tools, and one full-width primary decision. Resource cards use vertical icon/count/name stacks. Review and history are quiet secondary controls below the turn actions.
- The composition has 24-pixel gutters and gaps, bounded at 1520 × 1040 pixels and centered within larger windows. Empty ocean provides breathing room instead of ever-larger terrain or UI.
- Dialogs float in the center with bounded reading width, scrolling bodies, and fixed footers. Narration retains the original portrait artwork and its separate stage.

The control panel uses a quiet inset surface; resource colors and action materials carry the accents. The gold primary decision is wider than the three tool seals, making confirmation or ending a turn visually distinct from opening a workspace. No new artwork, fonts, theme selector, or alternate rule behavior is introduced.

## Responsive boundaries

`src/game/ui/responsiveLayout.ts` owns composition limits and supplies CSS track variables. Layout selection observes the outer shell, so adding desktop margins cannot trigger breakpoint oscillation.

| Available window                                    | Composition                                                  | Land size limit             |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------------- |
| Portrait phones/tablets                             | Stacked HUD and fitted board                                 | Fits available width/height |
| Landscape below 1100 pixels wide or 700 pixels high | Compact rail with fixed player header and scrolling controls | Fits available width/height |
| Landscape at least 1100 × 700                       | Desktop header, command panel, bounded island                | 66-pixel hex radius         |
| Ultrawide / 4K                                      | Same bounded desktop composition                             | Same 66-pixel hex radius    |

At 1100 × 700, the board region is 688 × 548 and fits approximately 507 × 468 pixels of land. At 1366 × 768, the board region is 954 × 616 and the land reaches its 572 × 528 limit. Larger screens preserve that land scale. Public and private information remain separate at every breakpoint.

## Interaction details

The command panel scrolls when window height, long names, or warnings require extra room. Its Graphics surfaces and text share one scroll mask; the separate player header stays visible. The mask filter activates only when content actually overflows. A runtime scroll indicator exposes additional controls. Real semantic buttons preserve keyboard navigation and native dialog focus.

Dice have one command target. Desktop omits only the redundant idle dice hint; errors, storage warnings, and pre-roll card access remain visible. Mandatory discard, Ahriman, victim selection, and placement confirmation continue to use existing guarded actions. The board geometry does not change after a roll or when entering placement.

The online surface shares the desktop composition bounds, board-size cap, and inset panel materials. Its existing server-authoritative controls and scrollable action panel remain intact; this change does not start or deploy a backend.

## Verification and review limits

Node tests cover breakpoint boundaries, laptop-to-4K composition budgets, coastal clearance, coordinate round trips, fixed large-screen island scale, turn context, escaped names, human-only inventory, and preserving errors before a roll. Existing header, dock, display-density, and online unit tests remain part of focused verification.

These checks do not render a browser or validate appearance. Following AGENTS.md, interactive/device review and production builds remain with the user. Review the following in an actual game:

- At 1366 × 768 and 1920 × 1080: header labels, all five resource counts, selected tools, confirmation and End Turn hierarchy, and the complete island/ports.
- While resizing across 1100 × 700: semantic hit regions, keyboard focus, selected placement, and returning from a modal.
- With a long Persian player name and pre-roll/storage errors: panel scrolling, clipped surfaces, and access to every action.
- On ultrawide/4K displays: bounded island scale, centered composition, and legible text at the existing pixel budget.
- On phones and portrait tablets: opening setup, pre-roll dice, placement, trading, and narrator dialogs retain their existing interaction flow.
