# Art direction

## Historical language

- Lead with Achaemenid Persian forms and references.
- Parthian and Sasanian influence may support the main direction.
- Avoid Arabian Nights imagery and medieval Islamic Persian visual language.
- Prefer historically grounded architecture, materials, landscape, ornament, and objects over generic fantasy shorthand.

## Rendering and composition

- Keep silhouettes, lighting, shading, detail, and material rendering consistent across the game.
- Use light from the upper left as the default unless a scene has a clear reason to differ.
- Design board art for quick recognition at mobile portrait size.
- Keep the board as the primary visual focus when interface elements are added.
- Keep ownership colors and Persian text in runtime UI or rendering data, not duplicated or text-baked artwork.

## Existing art

The repository includes a palace terrace background and illustrated terrain, dice, resources, and building assets. Retain this work while organizing the project. Review each asset for historical fit, readability, transparency, atlas boundaries, and consistency before putting it into gameplay. The current files do not yet establish a complete palette, typography system, or final camera composition. The MVP terrain-to-resource mapping is listed in `docs/GAME_RULES.md`.

## MVP presentation

The user-supplied Anahita narrator portraits retain their original design, including their Mediterranean drapery; full PNG masters are preserved separately from the optimized runtime WebP exports. This is a specific character-art exception, not an extension of the architectural/historical direction. Use her six expressions consistently with the intent of contextual dialogue; keep her name and all words in runtime Persian text. Present her as a large transparent character above the dialogue panel, with her lower silhouette behind its front stone edge. Use the complete supplied figure to show more of her legs while preserving her face, gestures, and drapery; use restrained amber light and gold/turquoise interface details to tie the art to the scene. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md).

The main menu uses the palace art as its background. During a match, muted procedural terrain tiles form a fictional coastal island over a calm procedural ocean. The water uses deep blue/blue-green depth variation and several small, slowly evolving ripple patterns with soft surface reflection. Keep highlights low contrast and blue-green, without foam crests, glitter, a horizon, or a fixed island silhouette. The original user-supplied ocean PNG is preserved outside runtime assets; see [GAME_BACKGROUND_PLAN.md](GAME_BACKGROUND_PLAN.md). A subtle runtime shallow-water wash, narrow warm coastal rim, and broken surf follow the board's actual stepped outer boundary. Keep the full island visible without zoom or panning, with 40 CSS pixels of ocean clearance for the coastal shelf and compact trade-port islets. Keep the sea secondary to the land and darken it gradually behind the interface. The ocean remains a visual setting; port rules are defined separately in `GAME_RULES.md`. Ports use original top-down carved-stone octagonal islets with warm bevels, navy insets, restrained shadows, two narrow dock links, shared library resource icons and runtime rates, and an ownership-colored rim. These markers are trading locations, not additional playable terrain.

Draw point-up terrain hexes from shared procedural palettes and restrained cypress, meadow/sheep, grain, bluff, mountain and dune motifs. Preserve a quiet number-token area; avoid tiny decorative clutter or flat-color-only tiles. Generate small cached textures in memory without per-tile masks. Number tokens sit near the lower part of each tile to leave the landscape visible; roads and player pieces render above the artwork. Shared library resource icons supply symbols across the board and UI; turned limestone-and-bronze number medallions are also procedural. Each repeated terrain receives a distinct composition of groves, field plots, meadow contours, rock strata or dunes. Vazirmatn Regular supplies runtime Persian text. The current interface uses a colorful royal-expedition language: turquoise, emerald, coral, amethyst and lapis enamel, warm parchment, polished gold settings and soft dimensional highlights. This supersedes the previous carved-stone and flat/restrained interface treatments. Keep Achaemenid character through sun seals, stepped wing inlays, architecture and craftsmanship, while allowing a vibrant contemporary mobile-game palette. Resources feel like collected objects; action seals, cards and primary decisions have different silhouettes and materials. Preserve quiet high-contrast label fields within the richer framing. Menus, participant entry, HUD, construction, trade, development, narrator dialogue, confirmations and results share the same primitives. See [UI_SYSTEM.md](UI_SYSTEM.md).

Human and server bot identities use Fluent Emoji Flat glyphs inside runtime
ownership-colored seal rims. Local offline rivals use their supplied portraits.
Names and explicit AI labels distinguish participants. The collection is a playful
interface language, not new world architecture or character costume guidance.
See [ICONOGRAPHY.md](ICONOGRAPHY.md).

Settlements, cities, and roads now use original top-down orthographic Phaser Graphics geometry: a compact dwelling plan, a wider L-shaped compound with a deep open quarter, and a narrow chamfered stone road. Keep silhouettes readable at 21/25/28 × 8 board pixels, with broad bevels and restrained contact shadows. Ownership insets accept arbitrary runtime colors independently of the neutral stone. Do not reintroduce oblique bitmap facades or texture noise into these three pieces. Original paintings remain under `art/reference/pieces/` as preserved references; see [PIECE_RENDERING.md](PIECE_RENDERING.md).

Ahriman is represented by an original procedural winged shadow emblem, with a restrained pale rim and amber eyes; it is a fictional game design rather than a reconstructed historical depiction. Trade scales use the shared Fluent Emoji Flat icon in the dock and bank workspace. The previous terrain paintings, traveler and trade illustration remain preserved PNG masters outside runtime packaging. See [PROCEDURAL_BOARD_ART.md](PROCEDURAL_BOARD_ART.md) for the documented replacement issues, static size study, cache budget, and review limits.

The user-supplied Mithra, Ashi and Spenta Armaiti illustrations are a specific character-art exception, like Anahita. Preserve their costumes, backgrounds, alpha and complete figures. The red-ponytail Ashi avatar matches the full illustration; her alternate brown-haired avatar remains a reference. These character portraits identify local offline rivals, while human/online functional identities retain the shared icon vocabulary. See [Offline characters](OFFLINE_CHARACTERS.md).
