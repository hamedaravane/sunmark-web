# Desktop tabletop experience

## Composition

The founder’s November 2 sketch guides the composition: public standings above a
central island, a separate right action rail, resources along the island’s bottom
edge, and a character at the lower-left boundary. The composition is LTR for
physical placement; each text/control region remains Persian RTL.

- The 80px standings header spans the composition. Human identity, private own
  score, public dice and menu remain grouped; other players expose public scores.
- A 280px decision rail holds phase/turn context, dice, tools and one primary action.
  It scrolls independently on shorter windows. The inventory is no longer buried
  among the actions: five resource cards occupy their own 88px tray below the map.
- A 180–240px character column sits to the left, with the complete existing rival
  portrait resting on a visible base. The resource tray and pedestal paint after
  the portrait so a cropped lower edge never floats in empty space.
- The central board receives its own measured rectangle and retains 40px coastal
  clearance. Radius stays capped at 66px; the smallest supported desktop gives
  roughly 46px hexes, ordinary laptops about 55px, and larger screens reach the cap.
  The existing 1.2× desktop piece/token detail scale remains unchanged.
- Desktop starts at 1100×700, with a bounded 1520×1040 composition, 24px outer
  gutters and 16px gaps. Portrait tablets retain the stacked island/deck/tray flow;
  short landscape devices keep the scrolling right rail.

## Responsive boundaries

`src/game/ui/responsiveLayout.ts` owns composition limits and supplies CSS track variables. Layout selection observes the outer shell, so adding desktop margins cannot trigger breakpoint oscillation.

| Available window                                    | Composition                                                  | Land size limit             |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------------- |
| Portrait phones/tablets                             | Stacked HUD and fitted board                                 | Fits available width/height |
| Landscape below 1100 pixels wide or 700 pixels high | Compact rail with fixed player header and scrolling controls | Fits available width/height |
| Landscape at least 1100 × 700                       | Desktop header, command panel, bounded island                | 66-pixel hex radius         |
| Ultrawide / 4K                                      | Same bounded desktop composition                             | Same 66-pixel hex radius    |

At 1100 × 700, the board region is 560 × 452 and fits approximately 403 × 372 pixels of land. At 1366 × 768, the board region is 795 × 520 and fits about 476 × 440 pixels of land. Larger screens reach and preserve the 572 × 528 land cap. Public and private information remain separate at every breakpoint.

## Interaction details

The command panel scrolls when window height, long names, or warnings require extra room. Its Graphics surfaces and text share one scroll mask; the separate player header stays visible. The mask filter activates only when content actually overflows. A runtime scroll indicator exposes additional controls. Real semantic buttons preserve keyboard navigation and native dialog focus.

Dice have one command target. Desktop omits only the redundant idle dice hint; errors, storage warnings, and pre-roll card access remain visible. Mandatory discard, Ahriman, victim selection, and placement confirmation continue to use existing guarded actions. The board geometry does not change after a roll or when entering placement.

The online surface shares the desktop composition bounds, board-size cap, and inset panel materials. Its existing server-authoritative controls and scrollable action panel remain intact; this change does not start or deploy a backend.

## Verification and review limits

Node tests cover breakpoint boundaries, laptop-to-4K composition budgets, coastal clearance, coordinate round trips, fixed large-screen island scale, turn context, escaped names, human-only inventory, and preserving errors before a roll. Existing header, dock, display-density, and online unit tests remain part of focused verification.

These checks do not render a browser or validate appearance. Following AGENTS.md, interactive/device review remains with the user; the agent runs the reported Node checks and production build. Review the following in an actual game:

- At 1366 × 768 and 1920 × 1080: header labels, all five resource counts, selected tools, confirmation and End Turn hierarchy, and the complete island/ports.
- While resizing across 1100 × 700: semantic hit regions, keyboard focus, selected placement, and returning from a modal.
- With a long Persian player name and pre-roll/storage errors: panel scrolling, clipped surfaces, and access to every action.
- On ultrawide/4K displays: bounded island scale, centered composition, and legible text at the existing pixel budget.
- On phones and portrait tablets: opening setup, pre-roll dice, placement, trading, and narrator dialogs retain their existing interaction flow.
