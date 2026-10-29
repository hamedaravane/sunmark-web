# Repository guide for coding agents

This repository is a Phaser 4 and TypeScript mobile-first Persian-language strategy board game with active, returning players. Prioritize a polished, usable full-match experience. Preserve the project’s real art and documented decisions. Do not treat a familiar board-game convention as an agreed rule.

## Read before changing

For gameplay, state, or rule work, read:

1. `docs/GAME_OVERVIEW.md`
2. `docs/GAME_RULES.md`
3. `docs/GAMEPLAY_INVARIANTS.md`

For visual or interface work, also read:

4. `docs/ART_DIRECTION.md`
5. `docs/UI_SYSTEM.md`
6. `docs/ASSET_GUIDE.md`

## Architecture

- Phaser draws the board and all visible UI in one full-shell canvas. Transparent DOM/CSS nodes measure responsive layout and provide semantic input, keyboard access, scrolling, and native modal focus. The board uses an inset camera; all presentation consumes the local session adapter and core state. See `docs/UI_SYSTEM.md`.
- Put deterministic rules, game state, and rule calculations in `src/game/core/` as plain TypeScript. Keep Phaser imports out of core modules.
- Scenes and game objects read state and send player actions to core APIs. Do not put rule calculations in scenes, sprites, or animation callbacks.
- Game state is authoritative. Animation displays state changes and never creates or reverses them.
- Keep rendering, layout, and input adapters separate from game rules.
- Prefer small modules with explicit types and no hidden global state.

## Product and visual conventions

- Design for mobile portrait first; 390 × 844 CSS pixels is the current reference size.
- The interface is Persian and right-to-left. Keep all text as runtime text; never bake Persian words into image files.
- Keep the board visually primary. Respect readable touch targets and the UI guidance in `docs/UI_SYSTEM.md`.
- Follow the Achaemenid-first historical direction in `docs/ART_DIRECTION.md`.
- Do not create separate copies of assets for each player color. Ownership color is runtime data.
- Treat existing assets as project work. Document a specific art issue before replacing an asset.

## Assets and naming

- Store runtime assets below `public/assets/`, grouped by purpose as described in `docs/ASSET_GUIDE.md`.
- Use lowercase kebab-case for asset files and stable lowercase directory names.
- Reference public assets by URL from the public root, such as `/assets/board/terrains/forest.webp`.
- Keep source art outside the runtime asset tree if it is not loaded by the game, and document its location when added.

## Rules and documentation

- `docs/GAME_RULES.md` records only decisions that have actually been specified. Keep unknown values and mappings marked as undecided; do not fill them in by inference.
- Do not change a fixed gameplay rule without updating `docs/GAME_RULES.md` and, if relevant, `docs/GAMEPLAY_INVARIANTS.md` in the same change.
- Update architecture, naming, asset, or art guidance when implementation conventions change.

## Project checks

- The user handles interactive/device testing. Do not launch a browser or perform manual browser checks unless explicitly requested. Pushes to `main` automatically run CI and deploy to production. When the user authorizes publishing changes, commit/push and monitor that CI/CD run as part of the task; no separate routine CI/deployment approval is needed. Favor low-cost TypeScript checks, scoped lint/format checks, and focused Node layout/unit tests for local implementation verification.
- `npm run typecheck` checks TypeScript.
- `npm run build` type-checks and creates the Vite production build.
- `npm test` runs Vitest rule, session, and layout tests in Node; `npm run test:watch` watches them. Keep Phaser runtime/browser imports out of these tests.
- `npm run lint` checks ESLint rules, including core/presentation import boundaries; `npm run lint:fix` applies automatic fixes.
- `npm run format:check` verifies Prettier formatting; `npm run format` formats the repository's supported text files.
- `npm run check` runs lint, formatting, tests, and the type-checked production build. The automatic release pipeline runs full verification and the production build. Prefer focused local checks unless broader local verification is required; report the checks actually performed.
- Keep configuration small and shared between development and production unless a concrete deployment need requires a difference.
