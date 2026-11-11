# Anahita's guided journey

## Implemented experience

The menu’s **آموزش** button opens a short, disposable practice board. Its opening explains the connected model: reach **10 points** through settlements (1) and cities (2); buildings receive resources from adjacent matching dice tiles; resources pay for construction; roads expand access to new settlement sites; trading fills a specific construction shortage. The exercise visibly identifies its prepared dice/resources, single preplaced settlement/road, and idle opponents. It never replaces a saved match or asks for a replacement confirmation.

The player performs four steps through existing controls and core commands: roll and receive wood from adjacent terrain; pay one wood/brick to extend a sample road; exchange four wood for the missing wool while retaining construction wood; pay for a legal settlement and see their score increase from 1 to 2. A fixed route is a teaching example, explicitly not an optimal-move recommendation. Road copy also explains occupying routes to limit opponents and the building-interruption rule. A city lesson connects its two points and doubled production to the same loop. The primary button opens each next workspace; the persistent strip identifies the step. Previews never pay or score. Other constructions/trades and end-turn are blocked within practice, while alternative bank selections show their construction impact. There is no time limit.

`tutorial/practice.ts` owns the deterministic fixture and step descriptions; `GameSession` isolates its lifecycle, performs core actions, and advances only on successful commands. Normal tutorial observation is suspended for the exercise. Bots are disabled, `save()` leaves the existing match unchanged, and completion/exit returns to the menu. Practice is deliberately not resumed after reload; Play resumes the untouched saved match or requests a name for a real new match. Real matches retain normal setup, random dice, bots and costs. The gear-labeled game menu → **آموزش و آناهیتا** contains the contextual companion controls, rulebook, and chapter journal. Anahita is enabled by default for every new ordinary match; a saved explicit opt-out is preserved on resume. The pause entry displays her current on/off state, and the hub uses the explicit **روشن‌کردن آناهیتا** / **خاموش‌کردن آناهیتا** labels.

Anahita invites the human into an island story built from their actual decisions. Her voice uses contemporary colloquial Persian: intimate, confident, observant, and lightly teasing. She consistently addresses the human as «تو». After the human ends a turn, she explains that rivals play automatically while the phone and resource hand remain the human’s. Bot actions never count as the human’s practice. The ending stays valid if a bot wins. The player remains the decision-maker.

There are contextual Persian conversations plus five practice conversations across five chapters. Each has an expression, a title, one explanatory paragraph, and an actionable next step. Runtime text lives in `src/game/tutorial/lessons.fa.ts`. Examples:

- Greeting: «سلام! به سان‌مارک خوش اومدی، من آناهیتام.»
- Trading: «یه منبع زیادی داری، یه منبع کم؟»
- Building feedback: «آبادی تازه، یه امتیاز تازه!»

These are fictional character lines, not historical claims about the supplied design.

## Voice and narrative continuity

The contextual conversations form a loose dramatic arc that remains valid in a random local match: arrival and two starting lights, discovering how the island answers, leaving a mark through roads and settlements, opening trade opportunities, confronting Ahriman, and looking back at the decisions that shaped the final board. The ending recalls the two starting settlements. These recurring images supply continuity without inventing quests, enemies, hidden rewards, historical events, or a guaranteed sequence of actions.

- Use spoken forms such as «رو»، «یه»، «اگه»، «می‌تونی» and «توئه», with readable Persian spelling and half-spaces. Keep familiar mechanic names, precise quantities, and actual button labels clear.
- Give each conversation one brief emotional beat, followed by its concrete mechanic and a direct next step. Use concise paragraphs; the practice introduction also connects the overall objective and mechanics. Tasks, journal copy, menu invitation, and Continue/Pause wording use the same contemporary register.
- Convey understated allure through invitation, curiosity, close attention, and gentle teasing: «بیا نزدیک‌تر»، «یه راز کوچیک بهت بگم» and «از این بلندپروازیت خوشم میاد». Vary these touches; avoid inserting a flirt or compliment into every lesson.
- Let dramatic language follow the moment: quiet reassurance for no income, caution before confirmation, tension around seven, delight after construction. Never replace a cost, restriction, or consequence with a metaphor.
- Keep copy compatible with replay and single-player play. A success line requires a confirmed result, and the ending refers to the winner without assuming the reader personally won. Do not turn probabilistic production into a promise or imply that moving Ahriman makes the desert productive.
- Avoid archaic court speech, modern internet memes, lengthy lore exposition, development-version asides, and claims of an exclusive romantic relationship. Anahita's personality comes from how she notices and responds to play.

## Research and design rationale

### Responsive character narration

In [Greg Kasavin's account of Hades' origins](https://blog.playstation.com/2021/08/05/the-origins-of-hades-out-next-week-on-ps5-ps4/), the creative director describes a continuous character story responsive to accomplishments, preserving forward movement through failure, and letting players choose their degree of narrative involvement. The transferable idea is recognition of actual play, rather than a particular dialogue-box appearance. Here, successful core transitions trigger Anahita's acknowledgements; rejected actions never earn success lines. Pause and replay let the group control involvement. We do not claim to reproduce Hades' internal dialogue scheduler.

The [GDC session description for Breathing Life into Greek Myth](https://www.gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth) describes Kasavin and Darren Korb's collaboration on character voices and implementation, including narrative iteration during Early Access. This supports defining a consistent voice and reviewing delivery as part of the system. This research used the public session description, not the full recording. Anahita's expressions reinforce her words; narration currently has no voice-over or sound dependency.

### Teach through decisions

[Asher Vollmer's Prime, Teach, Observe session overview](https://www.gdcvault.com/play/1020512/Prime-Teach-Observe-Tutorializing-Innovative) frames teaching as preparing players, helping them internalize mechanics, and iterating without patronizing them. Our application is a loop: explain an opportunity, return control for the real action, recognize the confirmed result. Reading and performing are separate records. A menu visit is not evidence that the player can build a road. This is our interpretation of the public overview; no claim is made to have watched the complete talk.

[George Fan's original GDC slides](https://media.gdcvault.com/gdc2012/slides/Design%20Track/Fan_George_How%20I%20Got.pdf) advocate integration into play, performing actions, spreading out mechanics, concise dialogue, unobtrusive and adaptive messaging, and visual communication (particularly slides 21, 34–35, 47–56, 105–117, and 127–141). That leads to contextual triggers, existing legal-target highlights, persistent phase-aware objectives, and one-time automatic conversations. The group can explore without satisfying a rigid checklist. Short character dialogue is the chosen deliberate interruption; the task strip carries guidance between conversations.

[Filament Games' tutorial design article](https://www.filamentgames.com/blog/10-tips-designing-game-tutorial/) discusses its own educational design practice alongside Fan's principles. Its warning about mixing low-value chatter with urgent teaching is relevant to a narrator. Anahita has no timed quips, random banter, idle reminders, or joke queue. Playful lines stay attached to a concept, such as unequal dice probabilities or exchanging surplus resources. We retain a recognizable character without turning every tap into a conversation.

### Reader control and accessibility

[Game Accessibility Guidelines on interactive tutorials](https://gameaccessibilityguidelines.com/include-interactive-tutorials/) explains why practicing instructions in context reduces memory demands. Its [player-paced text guideline](https://gameaccessibilityguidelines.com/allow-players-to-progress-through-text-prompts-at-their-own-pace/) recommends advancing on input or making information replayable. Our application combines real actions with untimed dialogue, a replayable journal, semantic Persian text, keyboard-accessible buttons, and native modal focus. Expressions supplement words rather than carrying unique information. There is no typewriter delay, automatic dismissal, reading-speed requirement, or motion required to understand a lesson.

## Learning flow and triggers

| Chapter / situation                | Before or during the action                                                                                        | Result / follow-up                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Arrival                            | Welcome → starter contest/order → chosen settlement → adjoining road → second settlement/resources → ordinary roll | Setup earns its own practice; ordinary roll/building practice stays separate                            |
| Production                         | Explain matching numbers and ownership after the first non-seven roll                                              | Explain a roll with no active-player income when encountered                                            |
| Land inspection                    | First unblocked-tile inspection introduces terrain resources and unequal probabilities                             | Return to the same full tile ID                                                                         |
| Action phase                       | Introduce building, trade, and manual end-turn                                                                     | Task strip offers an affordable, legal, unpracticed construction opportunity                            |
| Construction workspace             | Explain an affordable construction type, or shortages when none is available                                       | Restore the workspace without payment                                                                   |
| Road / settlement / city placement | Explain that type's cost and restrictions when chosen                                                              | Preview lesson preserves selection and teaches confirmation/cancellation                                |
| Confirmed building                 | Recognize the actual building and its consequences                                                                 | Mark construction and confirmation as practiced                                                         |
| Bank                               | Explain ordinary 4:1 at first bank visit                                                                           | Review appears after two different resources are selected; confirmation records practice                |
| Port inspection                    | General or specialist lesson matches the inspected port                                                            | Return to the same port                                                                                 |
| New port access                    | Detect ownership newly granted by a confirmed coastal building                                                     | Explain immediate same-turn use                                                                         |
| Seven                              | Prioritize required relocation over optional narration                                                             | Confirmed relocation explains blocking at the destination and restored eligibility at the previous tile |
| Blocked-tile inspection            | Explain production blocking and independence from ports                                                            | Return to the same tile                                                                                 |
| Turn handoff                       | The human’s confirmed end-turn explains automatic rival turns                                                      | The resource hand stays human-owned; bots pause until dialogue is dismissed                             |
| Five points                        | Warn when the human is one point from the target                                                                   | No requirement to choose a particular winning action                                                    |
| Victory                            | Replace ordinary celebrations with the ending                                                                      | Return to results; final-board and journal inspection remain available                                  |

The opening teaches starter selection and forward/reverse order, then each manual free placement at its actual step. The ordinary roll lesson waits until the human reaches an ordinary roll phase. Ports, probability, and city economics wait for relevant situations. The journal groups the entire curriculum for optional review; normal guidance does not expose the rulebook all at once.

## Scheduling and state ownership

- `tutorial/director.ts` is a Phaser-free presentation module. It reads core build queries, summaries, port ownership, and confirmed transitions. It never calculates legal placement, mutates resources, rolls dice, or chooses player moves.
- `GameSession` observes context before notifying subscribers. It remembers the interrupted sheet before showing narration. The last page restores that sheet, including trade choices, requested rate, placement, and target.
- Each transition ID is consumed once. Automatic lessons stop repeating after acknowledgement. Replay is explicit and returns to the journal. Pausing drops pending narration without consuming it; resuming examines current context and ignores historical commands.
- Seen means a conversation was acknowledged, including optional journal review. Practiced means a relevant confirmed core action was observed while guidance was enabled. Neither is a mastery assessment. Some concepts have no direct action and remain review-only.
- Close, backdrop, Escape, or Pause stop automatic guidance and restore the interrupted screen. Pause → **آموزش و آناهیتا** → **روشن‌کردن آناهیتا** resumes it; the narrator footer explains that exact recovery route. Memory is saved with the match and survives pausing, menu return/resume, and page reload; a new match resets it.
- No time-based narrative queue exists. The independent bot runner pauses during every dialog. Situational lessons and practice require the human’s action/turn; victory remains observable for either human or bot winners. Required Ahriman movement and finished matches take priority over optional celebrations. Unavailable actions never become mandatory objectives.

## Presentation and art

The native modal now composes a character scene above a carved-stone dialogue panel. Anahita occupies a separate portrait stage, up to 420 pixels high (42dvh), with restrained amber light behind her original transparent silhouette. Her lower 32 pixels tuck behind the panel's raised honey-stone edge. A turquoise rosette and small stepped corner engravings connect her gold and turquoise costume to the interface. The panel gives Persian dialogue its full width, capped at 50dvh; its text scrolls independently while Continue and Pause stay in a fixed footer. Short landscape screens reduce portrait height and increase the panel allowance. Buttons retain ordinary 48-pixel targets. No artwork is replaced or regenerated.

Expressions map to intent: calm for greeting and continuity, explaining for mechanics, warning for confirmation and seven, worried for shortages and blocked production, joyful for confirmed progress, playful for trade/probability. Portraits now use the complete original figure, showing more of the legs and drapery while retaining the face and hand gestures. The viewport-based portrait height is increased to keep the figure prominent, with aspect ratio and alpha preserved. A finite 280 ms fade and 12-pixel rise introduce each expression; reduced motion presents it immediately. The portrait sits outside the text mask and remains anchored when dialogue scrolls. The supplied character's Mediterranean drapery is a user-provided stylistic exception, not a new reference for buildings or future characters.

The six original PNG masters total 12,199,151 bytes and are preserved byte-for-byte under `art/reference/characters/anahita/`. Runtime portraits are full-resolution WebP exports at quality 95, totaling 2,194,870 bytes (82.0% smaller), with exact original alpha and high-quality lossy RGB compression. They retain the complete figures for longer framing. The visible portrait loads first; the renderer then prefetches only the next queued expression while the player reads. A rosette occupies its area while loading or after a failed request. The export workflow and quality checks are documented in [ASSET_GUIDE.md](ASSET_GUIDE.md).

## Verification and device review

`tests/tutorial.test.ts` covers default-guided entry and explicit opt-out, transition consumption, Ahriman priority, building/payment/preview behavior, shortages, preserved trade drafts, pause/resume, replay, tile/port inspection, immediate port access, victory priority, and expression coverage. `tests/bots.test.ts` also checks that bot actions cannot earn human practice or create a human Ahriman-placement draft. Agent verification stays with focused Node/TypeScript/lint checks; full game/device testing and CI belong to the user.

The user performs interactive testing. At 390 × 844 and a compact size, review reading and body scrolling, portrait loading and expression changes, keyboard focus and Escape, returning to a previewed target, preserved bank choices, handoff clarity, and journal navigation. Node tests do not validate appearance or native-modal behavior.

Contextual guidance follows real random matches and cannot guarantee a city, trade, port acquisition, or seven in a fixed number of turns. The separate practice exercise guarantees the foundational production/road/trade/settlement/score loop without changing ordinary matches. Journal replay reviews content without claiming an action was practiced. Production practice is earned only when the human actually receives a production grant.

Opening-specific scheduling, official references, save validation, and tests are documented in [OPENING_SETUP.md](OPENING_SETUP.md).

## Domestic negotiation

The `domestic` conversation introduces player-to-player trading when its workspace opens, including invitations during bot turns. `domestic-done` follows a confirmed exchange involving the human; bot-to-bot deals do not earn practice. Narration restores the interrupted trade/receipt and uses existing supplied expressions. See [DOMESTIC_TRADING.md](DOMESTIC_TRADING.md).

## Beginner regression checks

`tests/practice.test.ts` executes the complete command sequence, immutable previews, actual production/payment/score changes, bot/extra-action guards, exit, and save preservation. `tests/build-feedback.test.ts` checks exact shortages, topology/phase reasons, human-only inventories during opponent turns, and trades that either fix a wool shortage or introduce a wood shortage. `tests/board-generation.test.ts` checks the independent spiral fixture, token order, terrain counts, deterministic generation, and red-token separation for all 19 desert positions. Device rendering, reading length, and completion by first-time players remain user review tasks.

`tests/pause-menu.test.ts` verifies the five-action pause menu, tutorial recovery path, separate rules/review screens, default-enabled new matches, preserved saved opt-outs, restart confirmation, practice isolation and available-update labeling. Gameplay-only fixtures pass an explicit `false` guidance flag so their commands are not interrupted by the now-default companion.

## Spoken Persian copy (2026-11-08)

Anahita's lessons and adjacent prompts use the same short, modern colloquial Persian
as the cast. The welcome introduces the goal without front-loading the rulebook;
contextual lessons explain the next decision with accurate costs and restrictions.
Longer development/title lessons retain the rule exceptions players need. Lessons,
IDs, expressions, triggers, replay and practice actions are unchanged. Player-trade
guidance explains the broadcast audience on-turn and active-player-only off-turn.

## Direct practice handoff (2026-11-11)

After viewing the completed exercise, the dock offers a direct transition to the
first guided normal match, or resume when an unfinished save exists. The existing
primary/menu exit remains available. The exercise is discarded before entering
the ordinary flow; saved rules, progression ID, human identity and tutorial state
are preserved on resume. New ordinary matches retain their real opening setup.
