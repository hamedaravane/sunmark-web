# Offline rivals and readable turns

The player problem is that fast, anonymous bot commands are hard to follow and
provide little attachment to an offline match. The hypothesis is that recognizable
rivals, distinct strategies and readable receipts help players understand and
finish matches, then choose to return. Review offline match completion and repeat
play by released build, alongside device feedback about comprehension and pacing.
Use the existing optional analytics only; no new collection or consent is added.
Longer sessions alone are not success. No player observations or engagement lift
are claimed for this implementation.

## Rivals

| Character                     | Local strategy                                                                                                        | Supplied artwork                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Mithra / میترا                | Emphasizes wood/brick production, expansion settlements before cities, and pressure on public leaders                 | Sun crown, crimson armor                  |
| Ashi / اَشی                   | Emphasizes coastal ports and resource diversity; chooses the cheapest available bank/port payment before a dearer one | Red ponytail, turquoise jewelry and coins |
| Spenta Armaiti / سپنتا آرمیتی | Emphasizes wheat/stone production and city upgrades                                                                   | White braid and floating tablets          |

`core/botPersonality.ts` contains deterministic strategy weights. `core/bot.ts`
accepts an optional personality, retaining the existing balanced default for other
callers. The local session derives a rival from seat order relative to the human,
including legacy three-seat saves and a human in another seat. Only recognized
legacy robot names are renamed on resume; board, resources, identity IDs, turn and
history stay intact. Server bots keep their server identities and strategy.

Personalities do not change commands, legal sites, costs, dice, development stock,
production or victory rules. They use public board/scores/resource totals and their
own inventory. No opponent hand composition, hidden development card or future
random result informs strategy.

## Presentation and conversation

The hub shows the three supplied avatars and opens a scrollable character gallery.
Introductions and player details explain the rivals' styles. The gallery uses complete full portraits; reaction reviews reuse the large narrator
stage and label the rival explicitly. All Persian text remains runtime text. Short,
event-driven exchanges accompany construction, trade and results. They include
Anahita only while her guidance is enabled and never interrupt mandatory choices
with an extra modal. Dialogue uses confirmed events, not game randomness.

The context ribbon opens **بازبینی حرکت**, including confirmed dice, production
per recipient, public building costs, second-settlement grants, trade terms and
public score changes. Its relevant character speaks in the ribbon; the full
exchange is readable in the review. The same receipt and dialogue text is stored
with its action in the existing last-100-event history and survives resume.
Private card draws, exact remaining opponent hands and stolen resource types are
never exposed. Online projections do not enter the offline report generator.

Bots wait 1.8 seconds after a handover, 2.8 seconds after an opening roll,
3 seconds after construction, 3.4 seconds after trades, and 3.2–4.2 seconds after
ordinary rolls (the longer interval covers production). Other events use
2.8 seconds; a resumed bot turn starts after 1.6 seconds. The existing Quick
preference reduces these intervals to 55%. Motion reduction leaves reading time
intact. Animation completion never advances rules.

**مکث رقبا** pauses automatic bot work. **یک حرکت** advances one command or
negotiation step and retains pause. **ادامهٔ خودکار** resumes. A pending bot
discard on the human turn also exposes these controls; required human decisions
always retain their normal dock. Pause is temporary to the current visit, resets
on menu return/resume/new match, and does not change a save's rule state. Sheets,
hidden pages, stale state references, updates and teardown retain their guards.
The explicit test delay remains available for deterministic timer checks.

Confirmed bot dice animate from the reserved lower ocean when it is available;
compact/landscape views emphasize the header dice. Public production flies to
each owner's header seal or the human's own resource hand. The human inventory
never switches to the active opponent. Effects remain optional, finite and respect
visibility/reduced motion.

## Assets

The seven uploaded WebP sources are preserved byte-for-byte under
`art/reference/characters/{mithra,ashi,spenta-armaiti}/`. Six runtime copies use
`public/assets/characters/<id>/{avatar,portrait}.webp`. The alternate brown-haired
Ashi avatar remains `art/reference/characters/ashi/avatar-alternate.webp` and is
not shipped. The chosen red-ponytail avatar matches her full illustration.

| Uploaded filename                                     | Organized source/runtime role               |
| ----------------------------------------------------- | ------------------------------------------- |
| Mithra’s Crimson Sun Armor.webp                       | mithra/portrait.webp                        |
| Sun-King Warrior Portrait.webp                        | mithra/avatar.webp                          |
| Mystical Coin-Swirling Jewel Enchantress.webp         | ashi/portrait.webp                          |
| Glamorous Redhead with Coins and Golden Sparkles.webp | ashi/avatar.webp                            |
| Platinum Oracle with Runic Tablets.webp               | spenta-armaiti/portrait.webp                |
| Spenta Armaiti Portrait with Golden Halo.webp         | spenta-armaiti/avatar.webp                  |
| Goddess Portrait with Golden Leaf Jewelry.webp        | ashi/avatar-alternate.webp (reference only) |

The uploaded images are already WebP. They are not recompressed, resized,
repainted or background-removed. `source_file` and `preserve_encoded` entries in
`scripts/image-exports.json` record their supplied encoding; the export/check tool
verifies bytes, dimensions and alpha. Existing PNG-to-WebP quality checks remain.
Active images total 1,991,728 bytes. Visible artwork loads lazily; no character
portrait download is required to enter play. Placeholder rosettes handle loading
or failure. Texture memory retains full source dimensions; device review remains
necessary. Decorative portraits are a specific user-supplied character exception
to the otherwise unified functional icon collection.

## Verification and guardrails

Node tests cover distinct legal strategy choices, bounded turns, hidden-hand
independence, pacing, pause/single-step/sheet/visibility guards, mandatory discard
recovery, legacy save migration, production/cost receipts and asset checksums.
TypeScript/lint/build and asset verification cover packaging. Interactive browser
and device review belongs to the user, per repository instructions. Review on
390 × 844 and short landscape screens before drawing conclusions about visual
readability or engagement.

## Automatic conversations during play

Player feedback clarified that optional move-review dialogue did not meet the
intended experience: the rivals must appear and speak during the match, like
Anahita. The new hypothesis is that recognizable voices and direct interaction
make milestones and rivalries feel personal. Evaluate comprehension, completed
offline matches and voluntary return together with device feedback; longer modal
reading alone is not evidence of improvement. No new analytics are introduced.

`narrative/dialogues.fa.ts` now provides 26 multi-speaker conversations (79 scripted
beats), plus distinct responses to optional player replies. Mithra is direct,
competitive and loyal to his word; Ashi is playful, calculating and interested in
opportunity; Spenta Armaiti is patient, warm and committed to growth. They address
the player, react to one another and occasionally converse with enabled Anahita.

A real new-match entry includes their arrival conversation after the participant
screen and Anahita's queued opening guidance. Later conversations react to the
completed opening, player and rival construction, ports, trades, production and
dry rolls, theft, public leads, scoring titles, the closing race and each possible
winner. Quiet stretches can trigger one of three reflective exchanges on return
to the human turn. Events are one-time checkpoints, with at most one ordinary
conversation per numbered round, a single pending conversation, and explicit
opening/ending exceptions. There is no repeating per-action popup.

`RivalDirector` reads confirmed transitions without submitting commands, consuming
randomness or inspecting private opponent holdings. The existing turn runner
opens a ready conversation after 1.1 seconds of board feedback (immediately when
there is no new transition to present). This is independent of animation callbacks.
Bots wait during pending ready conversations and while the native modal is open.
Visibility, updates, manual bot pause, mandatory discards/Ahriman/free roads,
placement/bank drafts, other sheets and Anahita's active lessons take priority.
The large existing narrator stage switches to each speaker's complete supplied
portrait and name as the player continues. The ending returns to the results and can speak after a manually stepped victory even if bot play remains paused.

The last speaker can answer **چالش را می‌پذیرم** or **از روشت بگو**. These optional
fictional responses change only the conversation, never strategy, costs, resources,
random results or rewards. Continue advances dialogue; closing skips just the
current conversation. **خاموش‌کردن گفت‌وگوی رقبا** is a separate per-match opt-out
from Anahita. The character gallery exposes the setting and replay of past story
checkpoints, including while automatic dialogue is muted. No countdown forces the
player to read or respond.

An optional validated `rivals` save field preserves the setting, checkpoints,
current line/reply and pacing round. Existing saves without it enable future
conversations without replaying old actions or restarting the arrival. Normal
programmatic `start` calls that explicitly skip participant introduction also skip
this new-match story entry; the production name/entry flow enables it. Disposable
practice and server-controlled online games keep their existing narration path.
Story history uses the existing bounded match log. Reload restores dialogue at the
next safe presentation point without replaying rule commands or duplicating its
last recorded line.

## Circular avatars

`ui/avatarTextures.ts` creates a cached 256 × 256 circular cutout from a loaded
portrait/icon frame. Both Canvas and WebGL draw that alpha-clipped texture inside
the ownership rim, including within separately masked scrolling sheets. Canvas
clipping happens before drawing any source pixels, so square corners and hair or
ornaments cannot overflow the circle. A contained fallback is used if allocation
is unavailable. DOM placeholders also have circular overflow clipping, but the
visible fix is in Phaser. Source masters and runtime WebP files stay unchanged;
there are no per-player-color image copies or per-instance WebGL mask filters.

Focused tests cover automatic entry with every rival, Anahita priority/cameos,
player replies without game mutation/randomness, timed/hidden-page presentation,
save/reload/mute/replay, mandatory-choice/draft priority, event diversity and
frequency, private-information independence, corrupt story metadata, and circular
texture clipping/cache reuse. Device review remains with the user.
