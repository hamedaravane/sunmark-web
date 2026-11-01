# Asset guide

## Runtime organization

Put files loaded by the browser under `public/assets/`. Keep the directory tree shallow and group files by their role:

```text
public/assets/
  backgrounds/
  characters/anahita/
  dice/
  effects/
  fonts/
  ui/emblems/
  ui/ornaments/
```

Use lowercase kebab-case names with the extension matching the file format. Keep filenames concise, descriptive, and stable. Include the asset's role in the filename when that helps distinguish its use. Example: `backgrounds/main-menu.webp`.

See [ASSET_PRODUCTION_BRIEF.md](ASSET_PRODUCTION_BRIEF.md) for the proposed next art batches, the inspected existing-art inventory, mobile display sizes, ownership layers, component states, and designer handoff requirements. Its future filenames and export sizes are proposals; the current runtime files and loading conventions remain documented below.

## Loading

Vite copies `public/` files unchanged to the build output. Load them from their public URL in Phaser, for example:

```ts
this.load.image('menu', `${import.meta.env.BASE_URL}assets/backgrounds/main-menu.webp`);
```

Full-image paths live in `TEXTURE_FILES` and cropped illustrations in `ART` within `src/game/assets.ts`. Use a stable asset key in code and build the URL from `import.meta.env.BASE_URL` so deployments under a path prefix keep working. Keep the source path in the relevant scene or an asset registry. If the project later moves assets into imported modules or an atlas pipeline, update this guide and all paths together.

Match terrain textures initialize on first match entry rather than at the menu. The participant introduction provides reading time for existing dust/spark downloads and the first guided narrator portrait. Optional decoration never blocks entry and missing effect textures are skipped. Cached textures are reused across matches. Audio feedback is synthesized locally by `ui/GameAudio.ts`; no audio files, downloads, ownership-color exports or source-art replacements are added.

## Asset requirements

- Preserve transparency for cutout sprites and check alpha edges against both light and dark backgrounds.
- Confirm image dimensions, padding, and intended crop before defining frames for a sprite sheet.
- Do not infer atlas frame boundaries from filenames; document frame coordinates or add machine-readable atlas metadata.
- Keep Persian labels as runtime text rather than rasterized text.
- Keep player ownership tint as runtime data; do not create one copy per player color.
- Prefer optimized web-ready images. Preserve source masters outside the runtime tree when they are needed for future editing.
- Do not remove or replace existing project assets without a documented reason.

## Image export workflow

In addition to the shared SVG icon atlas described below, there are **14 preserved runtime WebP images**, totaling **8,201,868 bytes**. Ten former exports (six terrains, traveler, bank scale, number medallion and resource atlas) now use procedural drawing, saving 5,999,036 compressed bytes against the original 24 exports. Complete PNG masters remain unchanged at matching paths under `art/reference/`, with checksums and historical crops in the manifest's `references`. Terrain uses 24 generated 320 × 320 textures, functional icons one shared 1024 × 1024 library atlas, and number medallions direct Graphics paths. See [PROCEDURAL_BOARD_ART.md](PROCEDURAL_BOARD_ART.md) for composition and memory budgets.

The palace background and legacy dice sheet use lossless WebP to satisfy the quality checks, and the other active images use quality 95. The retired pasture export previously used quality 100. Lossless mode is distinguished from the quality-100 lossy profile.

`scripts/image-exports.json` records active `assets` and retired `references`, including original dimensions, source SHA-256, and the documented atlas/illustration crops. Only active assets are exported; full inventory checks also verify retired masters. `scripts/optimize-images.py` regenerates exports from those masters using the local WebP encoder through Pillow. It requires Python 3 and Pillow >= 10.2 with WebP support; normal game development, builds, and deployment use the checked-in exports and do not need Python.

```sh
npm run assets:optimize
npm run assets:check
npm run assets:optimize -- --group effects
npm run assets:anahita
npm run assets:anahita:check
```

Exporting replaces each destination atomically after verification. `assets:check` is read-only and verifies every export plus the runtime image inventory. The Anahita commands remain compatible aliases for that group. New assets must be registered in the manifest; intentionally updated source art requires updating its reviewed checksum and geometry there.

The quality profile starts at WebP quality 95, method 6, and tries 98, 100, then lossless if needed. Every candidate must retain exact alpha, image dimensions, and color-profile metadata. Visible RGB PSNR must reach 38 dB over both dark and light stone backgrounds for the complete image **and each registered crop**, so transparent atlas padding cannot hide a poor resource/ornament frame. Every output must be smaller than its PNG master. Color compression is high-quality lossy unless the asset requires lossless encoding; quality 100 alone is not lossless. PSNR is a regression floor, not proof of indistinguishability.

[Google's WebP documentation](https://developers.google.com/speed/webp/docs/cwebp) describes the encoding modes; [Pillow's WebP documentation](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp) describes the local encoder options. No hosted API, key, or runtime conversion is used.

`tests/asset-exports.test.ts` checks packaging, source checksums, texture paths/dimensions, and agreement between renderer crops and the export manifest. The Python check decodes images for alpha and quality comparisons. The user retains interactive/device review; static source/export comparisons should include small procedural icons, terrain detail, soft effects, and the menu background. Historical artwork outside the runtime inventory (procedural-piece and ocean references) remains unmodified PNG source art.

## Procedural interface materials

The current stone UI is drawn with Phaser Graphics, with cut corners, broad chisel facets, recessed keylines, deterministic mineral flecks/patina, and shallow border seams. These are presentation geometry, not new PNG textures. Grain stays at the perimeter so text remains legible, and its local generator never uses `Math.random()` or the core random source. No runtime/source art is replaced or duplicated for this treatment. The match uses a lighter fixed lapis/limestone treatment with shared surfaces and thin rims; heavier carved surfaces remain in focused sheets and menus; ornaments and victory art retain their original Image frames, while resource frames come from the shared library atlas. Semantic icon dimensions use a shared CSS `--icon-size`, preserving the frame aspect ratio at each placement size without transform or negative-margin offsets.

## Current files

- `characters/anahita/{calm,explaining,warning,worried,joyful,playful}.webp`: six high-quality full-resolution transparent narrator exports. Calm and playful are 1086 × 1448; the other four are 1024 × 1536. The registry now uses each complete illustration, showing more of the figure and legs above the dialogue panel. The original full PNGs are preserved byte-for-byte under `art/reference/characters/anahita/`, outside the runtime tree. Exports use WebP quality 95, method 6, with pixel-identical alpha; RGB compression is lossy, not mathematically lossless. No resizing, background removal, repainting, or AI generation is applied. Visible expressions load first; after that texture is ready, the renderer prefetches only the next queued expression while the player reads. Unguided menus do not load the portrait set. Original names map as follows: `Regal Turquoise Goddess Character Sprite` → calm; `Turquoise Goddess in White Drapery` → explaining; `Regal Turquoise-Gold Warning` → warning; `Worried Mediterranean Goddess in White Robes` → worried; `Joyful Laughing Greco-Roman Muse` → joyful; `Goddess Enjoying Grapes` → playful. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

- `backgrounds/main-menu.webp`: portrait palace background used only by the main menu.
- The former `backgrounds/game.png` (853 × 1844 RGB; 2,027,549 bytes) is now preserved unchanged as `art/reference/backgrounds/ocean-surface.png`, outside the runtime tree. Its download/upload cost and static appearance motivated replacement with `rendering/ProceduralOcean.ts`, a small procedural shader with a generated Canvas fallback. No ocean PNG is loaded or shipped. See [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md). `src/game/rendering/boardCoast.ts` draws a shallow-water wash, narrow sand/stone rim, and broken surf along the actual board perimeter; no coastline is baked into this image. Board presentation measurements are shared in `src/game/ui/layout.ts`.
- `fonts/vazirmatn-regular.woff2`: unmodified Vazirmatn v33.003 Regular (400), 50,684 bytes, downloaded from the [official release](https://github.com/rastikerdar/vazirmatn/tree/v33.003/fonts/webfonts). This is the only weight currently used; no variable font, TTF, or extra weight files are shipped. Retains the upstream Persian and Latin glyph coverage.
- `fonts/vazirmatn-license.txt`: the unmodified SIL Open Font License 1.1 and copyright notice downloaded from the same [release](https://github.com/rastikerdar/vazirmatn/blob/v33.003/OFL.txt).
- Terrain hexes are generated in memory by `rendering/terrainArt.ts` / `terrainTextures.ts`. Former `board/terrains/*.webp` files are removed; complete PNG masters remain under `art/reference/board/terrains/`.
- `dice/dice.webp`: dice artwork; frame layout has not been documented.
- `dice/faces.webp`: preserved supplied six-face stone dice sheet. The match bar now draws its two confirmed dice with Phaser Graphics. Its front faces are ordered 1–3 across the top and 4–6 across the bottom. The source is **RGB with a baked checkerboard**, not transparent. The previous DOM implementation used inset silhouette clipping, trimming the painted edges and shadow. This documented art issue motivates clean procedural ivory dice in the new Graphics UI. A future transparent re-export could restore the painted version; the inspected original crops remain in the registry. The PNG source master remains unchanged under `art/reference/dice/`.
- Settlements, cities, and roads use reusable Phaser Graphics components rather than runtime images. Their original paintings are preserved under `art/reference/pieces/`, outside the runtime tree. See [PIECE_RENDERING.md](PIECE_RENDERING.md) for dimensions, material layers, visual states, API, and the `?demo=pieces` gallery.
- Ahriman is drawn by `rendering/ahriman.ts`; previews and movement use the same vector emblem. The former traveler PNG is preserved at `art/reference/pieces/robber/robber.png`, with checksum metadata in the manifest's `references` array. There is no marker image request.
- Number medallions are code-drawn limestone and bronze using `NUMBER_TOKEN_ART` in `rendering/boardEmblems.ts`. Runtime Persian numbers retain their 15.4-pixel size. The original `board/tokens/number.png` remains under `art/reference/`; its WebP is retired. Desert has no token.
- `ui/ornaments/ornaments.webp`: supplied corner, divider, and rosette sheet. Explicit source frames supply menu corners/crest/divider and small sheet-heading ornaments; there are no baked labels or separate player-color images.
- `ui/emblems/victory.webp`: supplied griffin/rosette medallion, preserved for brand exports; the results sheet now uses the collection trophy with runtime winner/score text.
- The trade scales use the shared library icon at dock/workspace sizes; former `rendering/tradeArt.ts` is retained as historical source. `art/reference/ui/illustrations/bank.png` preserves the original painting; it is a retired reference, not an active export.
- `effects/dust.webp`: short construction puff behind the building marker within its container.
- `effects/spark.webp`: restrained road-placement sparkle over the confirmed edge.
- `effects/glint.webp`: short glint over the victory medallion in the dialog's top layer.
- Functional icons use one locally bundled `ui/icons/fluent.svg` atlas, backed by
  reviewed SVG masters in `art/reference/icons/fluent-emoji-flat.json`. Its 59
  semantic frames replace the separate procedural resource, action, trade and
  avatar glyphs. Hands, costs, flights, selectors, ports, card effects, controls,
  account forms and admin use this same collection. See [ICONOGRAPHY.md](ICONOGRAPHY.md)
  for the complete inventory, MIT license, regeneration and texture budget. The
  source paintings and historical procedural source are preserved; no per-player
  color copies are introduced.

The MVP maps forest to wood, mesa to brick, wheat to wheat, pasture to wool, and mountain to stone. Those rules are unchanged. The six 1254 × 1254 painted PNG masters are preserved as references; procedural point-up hexes now provide the terrain. Broad motifs sit above the token area. Stable axial-coordinate variants use no gameplay randomness. Number text remains a runtime overlay, and the desert has no number token. Roads, player-colored buildings and Ahriman render above the static terrain layer.
The ocean and its coast are presentation only. `BackdropScene` switches between the menu Image and the match procedural ocean inside the full-shell Phaser canvas. The water caches an opaque shader pass in a capped 320 × 640 render target, updating at 30 Hz while active; stationary views reuse the cached surface. The fallback generates its small color field in code and uses Graphics wavelets. An inset board camera and full-shell interface scene share this canvas. Coast geometry is recreated when board state or viewport measurements change, and stays below the terrain. A ResizeObserver explicitly resizes the canvas with `Scale.NONE`; the island automatically fits the available width and height with a 40-pixel ocean margin for the coast and port markers. There is no interactive zoom or panning. Transparent semantic controls retain CSS-pixel touch dimensions; Graphics surfaces and runtime labels match their measured geometry.

The art is retained from the existing project. Retired resource crop rectangles remain only as historical manifest metadata. The older dice sheet remains available. The original settlement/city/road paintings are reference art under `art/reference/pieces/`; the user's chosen replacement is original procedural Graphics geometry, so bitmap ownership masks are not required.

## Supplied polish assets: frames and review

The supplied polish PNGs are preserved as masters under `art/reference/`. Active WebP exports preserve full dimensions and crops; the traveler and bank scale are now retired procedural-art references. Renderer rectangles in `src/game/assets.ts` are checked against `scripts/image-exports.json`; Phaser adds named texture frames for board and interface Images. Semantic components attach art names and proportional placeholder measurements from the same registry. Asset URLs use `import.meta.env.BASE_URL`. These are presentation frames, not animation grids or rule data.

| Art key                            | Source rectangle (`x`, `y`, `width`, `height`)                  |
| ---------------------------------- | --------------------------------------------------------------- |
| Traveler (reference only)          | `380, 60, 610, 1130`                                            |
| Number token (reference only)      | `95, 75, 1065, 1075`                                            |
| Corner ornament                    | `35, 390, 380, 400`                                             |
| Divider ornament                   | `385, 575, 485, 110`                                            |
| Rosette ornament                   | `930, 480, 310, 310`                                            |
| Victory emblem                     | `40, 50, 1175, 1135`                                            |
| Bank illustration (reference only) | `15, 80, 1225, 1095`                                            |
| Dust                               | `125, 210, 1010, 850`                                           |
| Spark / glint                      | Full source images, respectively `1283 × 1226` / `1278 × 1230`  |
| Dice 1 / 2 / 3                     | `96, 80, 344, 346` / `590, 80, 344, 346` / `1084, 80, 344, 346` |
| Dice 4 / 5 / 6                     | Same x coordinates, with `y = 542`                              |

The new illustrations share warm stone, gold, and navy materials. Some fine details disappear at mobile scale, especially the preserved traveler's face and the active token's relief; their silhouettes and clear number center carry their function. Several PNGs contain faint alpha specks outside the main subject, so full-image alpha bounds are not a reliable intended crop. Frames avoid most excess padding while preserving the supplied work. Soft/uneven effect edges are used at low opacity in small finite effects.

Runtime WebP exports now reduce download size for all image groups, with original PNG masters retained separately. Full source dimensions remain deliberately unchanged, so decoded-texture memory is unchanged. No per-color copies are introduced. Actual-size visual review on the user's device remains necessary, particularly for the procedural dice and token-number readability.

## Ports

`src/game/rendering/ports.ts` draws nine small stone trading islets with Phaser Graphics, runtime ratio text, and resource icons from the shared library atlas. No port PNGs or per-player asset copies are needed. Marker bodies are 32 pixels across, with a 38-pixel water halo and two links to the associated coastal edge endpoints. An arbitrary runtime ownership color accents the inset border. See [PORTS.md](PORTS.md) for geometry, access rules, and interaction.

## Platform icons

Sunmark retains the existing gold sun-rosette/griffin victory emblem as its app mark; the naming change does not replace or repaint source art. Installable-app icons live in `public/icons/` as PNG platform exports, separate from the optimized in-game image inventory under `public/assets/`. `scripts/export-pwa-icons.py` derives them from the preserved victory emblem and its reviewed crop, without new artwork or baked text. App icons are 192/512 pixels, the maskable icon is 512 with safe padding, and the Apple touch icon is 180. These packaged sizes intentionally differ from full-resolution WebP runtime illustrations. Run `npm run pwa:icons` to regenerate; see [PWA_RELEASE.md](PWA_RELEASE.md).

## Player avatars

Player identities use shared library human/robot icons within runtime
ownership-colored seal rims. `ui/playerIdentity.ts` still owns names and seat
identity. Former original avatar drawing code is retained as historical source;
it is not a runtime consumer. No manufacturer logos or per-color images are added.

## Royal expedition interface

The royal UI retains enamel, gold, parchment, stepped ornament, palace and
narrator art. Functional icons now add a single 51,717-byte Fluent Emoji Flat SVG
atlas; no icon font, external service or per-color image is used. Both renderers
consume that atlas, and it is included in offline preparation. The original
rosette remains brand artwork; results use the collection trophy. Persian labels
remain runtime text. Historical review captures are development artifacts, not
current icon references. See [ICONOGRAPHY.md](ICONOGRAPHY.md).
