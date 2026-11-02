# Unified game iconography

## Decision and research

Reviewed 1–2 November 2026. Use **Microsoft Fluent Emoji Flat**, under the
[MIT license](https://github.com/microsoft/fluentui-emoji/blob/main/LICENSE),
for every functional game/UI pictogram. Bundle actual SVG artwork rather than
printing emoji characters: its appearance is identical across operating systems.
The [official collection](https://github.com/microsoft/fluentui-emoji) offers a
friendly, colorful style with broad silhouettes; the flat variant stays legible
at 16–32 CSS pixels and sits comfortably in the jewel-colored royal interface.

| Collection researched                                                | Result                                                                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Fluent Emoji](https://github.com/microsoft/fluentui-emoji)          | Selected: wood, brick, grain, yarn, rock, tools, rewards, controls and identities in one colorful family; MIT                                        |
| [IconPark](https://github.com/bytedance/IconPark)                    | Strong customizable multicolor controls; missing core wood/brick/grain/wool coverage would require another style; Apache 2.0                         |
| [Kenney Board Game Icons](https://kenney.nl/assets/board-game-icons) | Excellent board-game coverage and CC0; the abstract/monochrome treatment does not supply the desired collected-object color                          |
| [Game-icons.net](https://game-icons.net/about.html)                  | Broad game/fantasy coverage, CC BY 3.0; recoloring silhouette artwork would still need considerable adaptation to achieve this colorful object style |

This is a visual-language decision, not a claim that modern interface icons
reconstruct ancient objects. The historical setting continues through the palace,
island, architecture, narrator, gold settings and stepped ornament. Avoid adding
modern transport/weapon imagery to the world art merely because it exists in the
collection.

## Player problem and hypothesis

Inconsistent pictograms and reused mode emblems obscure which action a control
represents. The hypothesis is that one clear visual vocabulary, paired with
Persian labels, improves first-use recognition and reduces wrong-tool selection.
Evaluate recognition in user device feedback and observed progress to ordinary
play/first building action; the present sample cannot prove an engagement lift.
Guardrails are unchanged rules, preserved saves/private information, legible labels,
48-pixel control targets, bounded texture memory and offline availability. This
change introduces no new tracking or consent behavior.

## Inventory and mapping

The audit covered the player hub and its profile/progression sheets; offline,
practice and online match HUDs; setup; construction; bank/domestic trading;
development cards and titles; ports; pause/settings/tutorials; confirmations;
results; animated resource/card feedback; account/recovery forms; online entry and
lobbies; PWA information; and the admin panel.

`scripts/icon-manifest.json` is the exhaustive 59-role mapping. There are 56
distinct upstream drawings, with intentional reuse for equivalent concepts.

| Concepts / locations                                             | Semantic roles and selected imagery                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Resources, costs, hands, selectors, flights and specialist ports | wood/log, brick, wheat/grain sheaf, wool/yarn, stone/rock                                                                       |
| Build workspace and structures                                   | build/hammer, road/footprints marking a path, settlement/house, city/classical columns                                          |
| Trade and general ports                                          | trade/balance scales, exchange/two arrows, anchor                                                                               |
| Development hand, purchase and reveal                            | cards/floral card, knight/shield, victory-point/star, road-building/crossed tools, monopoly/resource bag, year-of-plenty/basket |
| Mode selection                                                   | ranked/trophy, friends/group, offline/die, practice/open book; these no longer reuse unrelated development effects              |
| Identity and progression                                         | profile/person silhouette, robot, coins/coin, achievement/medal, treasure/gem, score/star, resources/package                    |
| Controls and state                                               | settings, confirm, close, add, subtract, end-turn, back, next, undo, pin, help, time, target                                    |
| Preferences and service actions                                  | sound, motion, fast, download, refresh, lock, key, copy, save, online, chart, info, privacy, logout                             |
| General heading ornament                                         | sun                                                                                                                             |

The cereal sheaf is the collection's `sheaf-of-rice` artwork, used as the game's
existing wheat/grain symbol; it does not change terrain/resource rules. Yarn
represents wool. Footprints indicate a route without adding motorway signs or
railway imagery to the historical game. City and settlement use clearly different
library silhouettes and retain explicit Persian labels; their board models remain
the existing distinct compounds. The human/robot glyphs distinguish role, while
runtime names and ownership rims distinguish individual players; no manufacturer
art or copied player-color files are added.

## Boundaries

Functional icons all come from this collection. The app's existing sun-rosette
logo is brand artwork, not a general-purpose icon. Preserve it in the hub and OS
installation exports. Anahita, backgrounds, terrain, actual road/building pieces,
the Ahriman board figure, and decorative wings/material framing remain game art.
The playable dice are numbered game objects: their pips must show the actual
committed 1–6 values, including during animation. Do not substitute a generic
emoji die, whose perspective depicts a fixed value, for these objects. The
collection's die is used only as the offline mode pictogram.

Former procedural resources, scales, action emblems and avatar drawings are no
longer invoked by runtime consumers. Historical source drawings and painted
masters remain preserved. Existing icon issues motivating replacement were the
inconsistent sources, font-dependent cross/check/arrow symbols, obscure effect
silhouettes, and unrelated mode-card metaphors. The old victory painting remains
available for brand export, while results use the collection's trophy.

## One source, two renderers

- `art/reference/icons/fluent-emoji-flat.json`: reviewed upstream SVG subset,
  obtained from the Iconify distribution of Microsoft's collection; records source
  URLs, retrieval date and license. These are retained vector masters, not runtime
  downloads.
- `scripts/build-icons.py`: offline, standard-library-only regeneration from that
  subset and the semantic manifest. Prefixes local SVG IDs to avoid collisions.
  `python3 scripts/build-icons.py --check` detects stale generated outputs.
- `public/assets/ui/icons/fluent.svg`: one 51,717-byte, 8×8 atlas, 128-pixel cells,
  rasterized by Phaser to a shared 1024×1024 texture (about 4 MiB decoded).
- `src/ui/iconManifest.ts` and `src/ui/icons.ts`: typed names, frame coordinates,
  resource/effect/legacy slot mappings and decorative native markup. The source
  subset hash is recorded. There is no icon CDN, API, font, runtime npm icon
  dependency or per-color asset copy.
- `rendering/iconAtlas.ts`: preload once per Phaser game and idempotently install
  named frames. Board ports, HUD/sheets and feedback Images share those frames.
- Native account/admin forms use the shared generated `src/ui/icons.css` stylesheet for background positions into the same atlas; no inline styles or admin content-security-policy relaxation is needed;
  the Phaser interface paints the corresponding named frame over its transparent
  semantic placeholder. Room rendering uses the same texture and owns Image cleanup.

All functional pictograms should use `icon(name, size)` or the existing measured
resource/avatar/action slots. Do not introduce new Unicode pictograms, ad-hoc
paths or external icon packages. Keep ordinary mathematics, Persian text,
punctuation and actual dice pips as text/data/geometry, not decorative icons.

## Layout, accessibility and states

Icons supplement Persian labels; they do not replace accessible names. Decorative
spans are `aria-hidden`. Icon-only close/add/subtract controls retain named buttons
and their existing 48-pixel touch targets. Symbols normally occupy 20–32 pixels,
cost checks 16, avatar interiors 80% of their owner-rim slot, and result art 112.
Never shrink the touch target to the artwork's dimensions.

Owner color stays in the runtime rim. Dark person/group/route silhouettes have a light
parchment field for contrast against lapis; their vector artwork is unchanged.
Canvas icons inherit the disabled button's reduced alpha; selection, keyboard
focus and pressed surfaces remain independently visible. Back/next/end-turn use
explicit RTL-aware direction roles; the atlas is never globally mirrored, and
board geography does not change.

The SVG is included in PWA precaching; the PWA artifact check now explicitly
requires runtime SVG files offline. `public/assets/ui/icons/license.txt` preserves
Microsoft's MIT notice, and the app information sheet credits the collection.

## Verification

Node tests cover complete manifest/source/frame coverage, the source hash and
license, bounded unique frame locations, SVG safety, loader/cache reuse, resource
and legacy-slot mapping, decorative native markup and accessible icon-button
names. Existing gameplay/session/layout tests remain the regression baseline.

The static contact sheet in `docs/design/iconography/` is generated directly from
the selected SVG drawings and is not a browser screenshot or evidence of actual
device layout. The user performs the final visual check at 390×844 and desktop,
including trading, construction, cards, disabled controls, online lobbies and
opening the installed app without connectivity.

## Supplied rival portraits

Mithra, Ashi and Spenta Armaiti use their supplied character illustrations for local rival identity slots. These are character artwork, as with Anahita, and are the explicit exception to generic robot identity icons. Functional pictograms, human profile and server bot slots retain this collection. See [Offline characters](OFFLINE_CHARACTERS.md).
