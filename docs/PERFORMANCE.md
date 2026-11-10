# Rendering performance

The 2026-11-10 optimization follows Phaser's [Phaser 4 Rendering Concepts](https://phaser.io/tutorials/phaser-4-rendering-concepts), [Text guidance](https://docs.phaser.io/phaser/concepts/gameobjects/text), and [FilterList documentation](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist). Text updates upload textures; compressed image bytes do not reduce decoded texture dimensions; external filters operate on the full rendering context.

The player problem is repeated frozen menu interaction on older phones. The hypothesis is that lower input latency and retained graphics memory make players more willing to enter and complete matches. Success measures are input-to-present latency (especially p95), texture allocation/storage, stable repeated navigation and completed matches on affected hardware. Guardrails are unchanged rules and input geometry, readable Persian text, correct clipping, reliable saves, and no expansion of analytics collection. The local samples establish engineering changes, not an engagement improvement.

## Implementation

- `InterfaceScene` caches computed styles and element bounds for one paint only, so scrolling, font/layout changes and resizes always get fresh measurements. `BottomSheet` preserves unchanged markup. Hidden modal Text/Image instances survive closure until a different panel replaces them or the scene is destroyed. This is bounded to one panel, not an accumulating panel cache.
- Rectangular WebGL clipping uses a cloned Phaser 4 DrawingContext sharing the existing framebuffer. It intersects the parent's scissor, applies the UI camera's physical-pixel projection, flushes batches on entry/exit, and restores the parent context. It is restricted to untransformed full-shell UI containers. Canvas retains geometry masks. Do not apply this helper to rotated, scaled or filtered containers without extending and testing its coordinate model.
- Named art crops sharing the same file use one texture source and distinct frames. Narrator expressions currently reference one supplied image; this mapping automatically separates them if their files become distinct. Original art files and Persian runtime text are preserved.
- Only the static home screen with no dialog or pressed control sleeps after its final submitted frame. DOM/session/layout/asset invalidation wakes it. Gameplay and dialog animations continue running.
- Initial backing density is bounded before the first frame using optional hardware hints. Budget handhelds start at density 1.5 / one million pixels; unknown-memory handhelds at 2 / two million; strong hints at 3 / three million. Desktop retains 3 / four million. Budget devices omit decorative water drift. CSS layout, touch geometry, artwork and runtime Persian text stay intact.
- Visible unblocked gameplay samples 90 consecutive valid frame intervals. If at least 68 exceed 38 ms, backing density steps through 2, 1.5, 1.25 and a 1x floor. Stable 30 Hz is acceptable for this turn-based game and retains detail. Pauses over one second reset the window; menus, dialogs and hidden pages reset sampling. Caps stay lowered for that instance to prevent oscillation.
- Immutable number-token backing art and neutral port art share two small generated textures. This replaces repeated vector-path submission without rasterizing Persian text or creating per-player-color assets. Owned ports retain runtime color rendering.

## Staged measurements

Local Chromium, 390x844 CSS pixels, DPR 3, SwiftShader software WebGL. These are controlled engineering comparisons, not physical iPhone/Android benchmarks or process RAM measurements. Texture figures count live base-level RGBA-equivalent texture storage and exclude renderbuffers, compositor/driver overhead and decoded CPU images.

| Stage                       | Result                                                                                                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original                    | Warm Characters flow ~110 MiB; two warmed reopen cycles created ~83 textures and ~126 uploads.                                                                                |
| Reuse and measurement cache | Two warmed reopen cycles created zero textures/uploads; retains one panel's small text surfaces.                                                                              |
| Rectangular scissor         | Removed ~34 MiB of full-screen filter surfaces; mobile interaction capture passed.                                                                                            |
| Shared art                  | Removed ~12 MiB of ornament duplication. Final warm flow ~66 MiB. Loading the shared narrator source reached ~72 MiB versus ~146 MiB when six aliases were separate textures. |
| Idle home                   | Zero submitted frames during a two-second idle window; three real open/close interactions woke the loop and returned it to sleep.                                             |

The original 12-cycle measurement stabilized; no unbounded JS leak was established. Texture allocation churn and retained memory are different costs and must both be checked. The subsequent asset audit replaces the three full-size runtime avatar sources with verified 384-pixel derivatives, saving about 16.3 MiB of base-level GPU storage when all three are loaded. Original source files remain unchanged; see ASSET_GUIDE.md.

## Validation and follow-up

Run `npm run check` for the repository checks. Browser verification is separately authorized; `npm run browser:dev` and `node scripts/ui-capture.mjs <name> mobile` cover real menu, practice, construction details, pause and trade controls. Also verify desktop scrolling/clipping, keyboard controls and narrator frames. Check wake behavior after resize, visibility changes and returning from online/account screens.

Physical testing across budget Android and older iPhone classes remains necessary to measure input-to-present latency, actual process/graphics memory and sustained thermals. See [MOBILE_SUPPORT.md](MOBILE_SUPPORT.md) for dated market research, provisional hardware/browser targets and board-game acceptance criteria. Software graphics timing must not be reported as those devices' FPS.

## Broader device-class comparison

A seeded board on a prior local snapshot was compared with the new starting budgets and marker cache, across six synthetic Chromium profiles (12 runs). At 412×915 / DPR 2.625 / 4 GB hints, backing pixels fell from 2,595,481 to 847,896 (67.3%); draw calls from about 68 to 38 (44.5%); submitted indices from about 87,593 to 47,865 (45.4%). At 360×800 / DPR 2 / 4 GB hints, backing pixels fell 43.8%. Number/port caching also reduced draw calls at unchanged desktop and high-tier resolutions. The two generated surfaces add approximately 208 KiB of base texture storage.

All 12 fixture runs reported no browser exceptions. The comparison used a Linux SwiftShader software GPU and short four-second windows: measured rates ranged roughly 2–7 FPS and are not mobile FPS estimates, thermal tests, input-latency tests or evidence that the physical 30 FPS target is met. Lower draw work is the reliable result. The reusable `scripts/performance-matrix.mjs` records p50/p95 frame intervals for future local comparisons; repeated interactive flows and physical-device validation remain separate checks.
