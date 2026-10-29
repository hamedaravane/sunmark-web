# Game overview

## Product

**Sunmark** (Persian pronunciation: **سان‌مارک**) is a mobile-first Persian-language strategy board game with offline play and online multiplayer inspired by hex-based resource production and settlement building. It uses a historically grounded Achaemenid visual direction.

## Current product

Offline games have four players: one human on this device and three local bots. Online rooms have four seats occupied by authenticated guests or host-selected server bots. The highest opening dice roll selects the starter. The human chooses both of their starting settlement/road pairs; bots choose theirs automatically in the same forward/reverse setup order. Ordinary turns then proceed clockwise from the starter. The live game is [sunmarkgame.top](https://sunmarkgame.top); online matches use the authoritative backend and PostgreSQL. Players take turns, roll dice, collect resources, build roads and settlements, upgrade settlements, negotiate resource trades with opponents, trade with the bank using eligible coastal port rates, buy/play development cards, resolve discards and Ahriman theft after a seven, and race to ten victory points.

The board and rule state live in Phaser-independent TypeScript under `src/game/core/`. A local session adapter publishes confirmed state to the Phaser board and Graphics interface. Transparent semantic controls provide responsive measurements, keyboard/screen-reader input, scrolling, and modal focus. Controls use responsive layouts and focused bottom sheets; placement and bank exchanges require confirmation. Local autosave and resume preserve the current match and tutorial progress on the same device. Deterministic bot planning also lives in core; an independent session runner paces bot commands and pauses ordinary turns for dialogs or hidden pages while pacing domestic-trade replies separately. The separate online session adapter consumes server-owned state. Account linking and chat are not included. See [SINGLE_PLAYER.md](SINGLE_PLAYER.md). See [PWA_RELEASE.md](PWA_RELEASE.md).

Returning-player polish is part of the live match: standalone ocean dice, concise state-aware guidance, one contextual action dock with construction/trade/development tools and the current primary action, icon-led costs and shortages, saved optional build goals, a private card hand and separate purchase area, and real score/title feedback. Optional sound, haptics and motion preferences are stored separately from the match. See [MOBILE_GAME_EXPERIENCE.md](MOBILE_GAME_EXPERIENCE.md).

## Match outline

The main menu has **بازی** (offline Play), **بازی آنلاین** (Play Online), and **آموزش** (Tutorial), in honey and green stone. Play enters or resumes a four-player match; Tutorial opens a short disposable practice board, preserving the current save. Play resumes an unfinished save, while starting a replacement requires confirmation. Anahita introduces rules through contextual Persian dialogue, six supplied expressions, phase-aware objectives, and a replayable lesson journal. Pause → **آموزش و آناهیتا** can enable, pause, or review guidance during any match. Anahita is enabled by default in new matches; saved opt-outs remain respected. Contextual narrative progress belongs to the current match and survives closing/reopening through its local save; the separate practice exercise restarts on each visit. See [TUTORIAL_DESIGN.md](TUTORIAL_DESIGN.md) for research, lesson flow, and implementation boundaries.

1. Optionally use Tutorial to perform the production → road → trade → settlement → score loop, then return to the menu. Choose Play; a new match asks for your name, then introduces all participants with their assigned colors and seals before one human faces three visibly labeled robot opponents. Entry has no countdown; the introduction also offers optional sound/vibration controls and prepares actual match presentation. The compact header shows your identity, public standings, and the acting seat; Play resumes saved identity/progress directly.
2. Roll for the starter, then choose two starting settlement/road pairs in clockwise/reverse order on the empty 19-hex board. Each second settlement grants its adjacent resources once. See [OPENING_SETUP.md](OPENING_SETUP.md).
3. At the start of each ordinary turn, the active player taps two large dice. An eligible development card may be played before the roll; an available own-turn victory declaration takes priority.
4. Matching numbered tiles produce one resource for each adjacent settlement and two for each adjacent city, unless Ahriman blocks that tile.
5. During the action phase, players may build, upgrade, negotiate player trades, trade with the bank, and then end their turn; bots perform these same rule commands automatically.
6. Reach ten points from buildings, hidden VP cards, Longest Road and Largest Army; victory is available only on your own turn. Hidden points require an explicit declaration.

## Platform

- Installable PWA with offline play after initial preparation; web, designed for mobile portrait first
- 390 × 844 reference layout, responsive to the available safe area
- Phaser 4 board and Graphics UI presentation in one canvas; transparent DOM/CSS layout and accessibility adapter
- TypeScript game state and rules
- Persian right-to-left interface text kept in runtime strings for localization

Player negotiation includes human-oriented offers/counters, per-bot responses, atomic final confirmation, bot-initiated offers, public receipts, and pending-consent recovery. See [DOMESTIC_TRADING.md](DOMESTIC_TRADING.md).

## Online play

Play Online connects to the authoritative backend through a separate session/client. A private room has four seats occupied by humans or host-selected server bots. Everyone marks ready before the host starts. The server owns all game state, randomness, consent, bot decisions and persistence. The frontend sees only its own private hand and public board/standings, with explicit command confirmation and reconnect synchronization. Existing offline Play/Tutorial and saves remain independent. See ONLINE_PLAY.md for the desktop test stack.
