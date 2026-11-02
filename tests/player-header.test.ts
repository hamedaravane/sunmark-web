import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { headerBackdrop, headerPlayers } from '../src/game/ui/headerModel';
import { humanHeader, humanHand } from '../src/game/ui/humanHud';
import { playerName, avatarForSeat, BOT_NAMES } from '../src/game/ui/playerIdentity';
import { sheetContent } from '../src/game/ui/sheets';
import { MatchStore } from '../src/game/persistence/matchStore';
import { fitBoard } from '../src/game/ui/layout';
import { completeSessionSetup } from './helpers/setup';

afterEach(() => vi.restoreAllMocks());

test.each([false, true])(
    'new full match asks for a name before creating a board (guided %s)',
    (guided) => {
        const session = new GameSession();
        const random = vi.spyOn(Math, 'random');
        session.requestStart(4, guided);
        expect(random).not.toHaveBeenCalled();
        expect(session.state).toBeNull();
        expect(session.sheet).toEqual({ kind: 'player-name', count: 4, guided });
        const content = sheetContent(session);
        expect(content.body).toContain('autocomplete="nickname"');
        expect(content.body).toContain('maxlength="24"');
        session.playerNameDraft = '  مهسا  '; // Actual input adapter supplies the draft.
        session.confirmPlayerName();
        expect(session.humanPlayer?.name).toBe('مهسا');
        expect(session.state?.players.slice(1).map((p) => p.name)).toEqual(BOT_NAMES);
        expect(session.state?.phase).toBe('setup-roll');
        expect(session.tutorial.current).toBe(guided ? 'welcome' : null);
        expect(humanHeader(session)).toContain('مهسا');
    },
);

test('canceling name entry leaves the saved match untouched and Play resumes its name', () => {
    let raw: string | null = null;
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(4, false, 'آرین');
    const expected = structuredClone(session.state);
    const saved = raw;
    session.returnToMenu();
    session.requestStart(4, true);
    session.confirmNewMatch();
    expect(session.sheet?.kind).toBe('player-name');
    expect(session.playerNameDraft).toBe('آرین');
    session.playerNameDraft = 'نام تازه';
    session.closeSheet();
    expect(raw).toBe(saved);
    session.requestPlay();
    expect(session.state).toEqual(expected);
    expect(session.humanPlayer?.name).toBe('آرین');
    expect(session.sheet).toBeNull();
});

test('names retain Persian joining, are bounded, and cannot inject markup or bidi overrides', () => {
    expect(playerName('  علی‌رضا   نوری  ')).toBe('علی‌رضا نوری');
    expect(playerName(' ')).toBe('بازیکن');
    expect(playerName('\u202eآرین\u2069')).toBe('آرین');
    expect(Array.from(playerName('😀'.repeat(30)))).toHaveLength(24);
    const session = new GameSession();
    session.start(4, false, '<img src=x>');
    expect(humanHeader(session)).toContain('&lt;img src=x&gt;');
    expect(humanHeader(session)).not.toContain('<img');
    session.returnToMenu();
    session.requestStart(4, true);
    session.confirmNewMatch();
    expect(sheetContent(session).body).not.toContain('value="<img');
});

test('public standings show ties, the acting bot, and four individually inspectable seats without exposing hands', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(4, false, 'آرین');
    completeSessionSetup(session);
    const state = session.state!;
    const humanId = session.humanPlayer!.id;
    const owned = Object.values(state.board.vertices).filter(
        (v) => v.building?.ownerId === humanId,
    );
    owned[0].building!.type = 'city';
    state.phase = 'actions';
    state.activePlayerIndex = 1;
    state.lastRoll = [4, 4];
    const rows = headerPlayers(state, humanId);
    expect(rows.map((p) => p.score)).toEqual([3, 2, 2, 2]);
    expect(rows.map((p) => p.rank)).toEqual([1, 2, 2, 2]);
    expect(rows.filter((p) => p.leading).map((p) => p.id)).toEqual([humanId]);
    expect(rows.filter((p) => p.active).map((p) => p.id)).toEqual([state.players[1].id]);
    expect(new Set(rows.map((p) => p.avatar)).size).toBe(4);
    const header = humanHeader(session);
    const hand = humanHand(session);
    expect(header).toContain('نوبت میترا');
    expect(header.match(/، ربات؛/g)).toHaveLength(3);
    expect(header.match(/class="seat-chip/g)).toHaveLength(3);
    expect(header.match(/class="header-active/g)).toHaveLength(1);
    expect(header).toContain('captain-score human-score');
    for (const p of state.players) expect(header).toContain(`data-action="player:${p.id}"`);
    expect(header).toContain('آخرین تاس:');
    state.players[1].resources.wood = 987;
    expect(humanHeader(session)).toBe(header);
    expect(humanHand(session)).toBe(hand);
    session.openSheet({ kind: 'opponents' });
    expect(sheetContent(session).body.match(/data-avatar=/g)).toHaveLength(3);
    expect(sheetContent(session).body).not.toContain('۹۸۷');
});

test('finished standings identify the winner and no longer show an active turn', () => {
    const session = new GameSession();
    session.start(4, false);
    session.state!.phase = 'finished';
    session.state!.winnerId = session.state!.players[2].id;
    expect(headerPlayers(session.state!, session.humanPlayer!.id).some((p) => p.active)).toBe(
        false,
    );
    expect(humanHeader(session)).toContain('برنده');
});

test('avatars remain distinct for legacy three-seat saves and a human in a different seat', () => {
    for (let human = 0; human < 4; human++) {
        const avatars = [0, 1, 2, 3].map((seat) => avatarForSeat(seat, human));
        expect(avatars[human]).toBe('human');
        expect(new Set(avatars).size).toBe(4);
    }
    const session = new GameSession();
    session.start(3, false);
    expect(humanHeader(session).match(/class="seat-chip/g)).toHaveLength(2);
    expect(humanHeader(session)).toContain('--seat-count:2');
});

test('header covers the full notch and side insets while the reference board retains its width', () => {
    expect(headerBackdrop({ x: 12, y: 47, width: 366, height: 104 }, 390)).toEqual({
        x: 0,
        y: 0,
        width: 390,
        height: 151,
    });
    expect(headerBackdrop({ x: 0, y: 0, width: 390, height: 104 }, 390).height).toBe(104);
    // iPhone 13 portrait: 47px notch, 34px home indicator, 104px header,
    // 216px remaining HUD, plus 52px during confirmed-target selection.
    const boardHeight = 844 - 47 - 34 - 104 - 216 - 52;
    const layout = fitBoard(390, boardHeight);
    expect(layout.hexRadius * 5 * Math.sqrt(3)).toBeCloseTo(310);
    expect(layout.hexRadius * 8 + 80).toBeLessThanOrEqual(boardHeight);
});
