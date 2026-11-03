# UI iteration state

## Current base

Synced main to origin/main d4b82b3 before further implementation. Earlier captures
from 764cf98 were discarded as design evidence. Current baseline:
`output/playwright/ui/current-baseline/` (390×844, 820×1180, 1440×900).
Preserve founder composition, enamel palette, Persian RTL, Vazirmatn and source art.

## Completed

1. Hub: fixed stretched icon selector; prioritized offline play/practice; moved gold
   emphasis from secondary progress panels to the playable offline mode. Visually
   reviewed all three sizes; icons exactly 32px, no horizontal overflow or page errors.
   Screenshots: `output/playwright/ui/cycle-1/`.
2. Construction: compact decision cards, inline expandable details and full-width
   location action; planning goal stays available inside details outside practice.
   All three choices fit the reference phone. Removed redundant disabled practice
   planning controls. Caught and corrected hidden detail painting in display:contents
   traversal and duplicate disclosure icons before final capture.

## Verification

- 405 tests passed; lint, typecheck and production build passed.
- Final practice captures passed at all three sizes: no uncaught page errors or horizontal document overflow. Visually reviewed hub, board, construction, expanded details, trade and character dialogue across the viewport set.
- Real match-entry story passed at all three sizes: Mithra, Ashi and Spenta Armaiti each appeared and spoke. Confirmed portrait boundaries visually on phone, tablet and desktop.
- Final artifacts: `output/playwright/ui/final/`; narrative artifacts: `output/playwright/ui/story/`. Keyboard disclosure expansion/collapse, practice destination selection and paid road confirmation passed.
- No rule, cost, character art, analytics or bot-pacing changes.

## Remaining / next

Two improvement cycles completed; no critical or major issue found in the reviewed journeys. Desktop construction remains scrollable when the sheet reaches its height limit; all choices and expanded planning content remain reachable.
Online backend, complete-match playthroughs and physical-device behavior were not verified by this isolated Chromium run. No production deployment performed.
