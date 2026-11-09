import { expect, test, vi } from 'vitest';
import { ProgressionStore, PROGRESSION_KEY, experience } from '../src/game/progression/progression';
import { MatchStore, decodeSave, type SaveStorage } from '../src/game/persistence/matchStore';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { menuContent } from '../src/game/ui/menu';
import { playerName } from '../src/game/ui/playerIdentity';
import { AppPlatform } from '../src/pwa/app';
import { completeSessionSetup } from './helpers/setup';
import { giveCard } from './helpers/development';

function memory(): SaveStorage {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
    };
}
function fixture(storage = memory()) {
    const progression = new ProgressionStore(storage);
    const session = new GameSession(new MatchStore(storage), progression);
    return { storage, progression, session };
}
function read(session: GameSession) {
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
}
function practice(session: GameSession) {
    session.requestPlay(true);
    read(session);
    session.primary();
    read(session);
    for (const kind of ['road', 'settlement'] as const) {
        if (kind === 'settlement') {
            session.primary();
            session.chooseTrade('give', 'wood');
            session.chooseTrade('receive', 'wool');
            session.confirmTrade();
            read(session);
        }
        session.primary();
        session.chooseBuild(kind);
        session.preview(session.targets[0]);
        session.primary();
        read(session);
    }
    expect(session.practice?.stage).toBe('complete');
    session.primary();
}
function prepareVictory(session: GameSession, human: boolean) {
    session.start(4, false, 'مهسا');
    completeSessionSetup(session);
    const state = session.state!;
    state.activePlayerIndex = human ? 0 : 1;
    state.phase = 'actions';
    state.lastRoll = [3, 3];
    const owner = state.players[state.activePlayerIndex].id;
    for (const site of Object.values(state.board.vertices)) {
        if (site.building?.ownerId === owner) site.building.type = 'city';
    }
    for (let i = 0; i < 2; i++) {
        const site = Object.values(state.board.vertices).find(
            (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
        );
        if (!site) throw new Error('Victory fixture needs a free city site');
        site.building = { ownerId: owner, type: 'city' };
    }
    giveCard(state, 'victory-point', owner, state.turn);
    giveCard(state, 'victory-point', owner, state.turn);
}

test('only a completed practice grants its one-time reward; repeats preserve the main save', () => {
    const { session, storage, progression } = fixture();
    session.start(4, false, 'مهسا');
    session.returnToMenu();
    const original = storage.getItem('ancient-persia.match.v1');
    session.requestPlay(true);
    session.returnToMenu();
    expect(progression.snapshot).toMatchObject({ xp: 0, coins: 0, practice: false });
    practice(session);
    expect(progression.snapshot).toMatchObject({
        xp: 100,
        coins: 40,
        practice: true,
        matches: 0,
        wins: 0,
        badges: ['practice'],
    });
    expect(storage.getItem('ancient-persia.match.v1')).toBe(original);
    practice(session);
    expect(progression.snapshot.xp).toBe(100);
    expect(new ProgressionStore(storage).snapshot).toEqual(progression.snapshot);
});

test('a confirmed human victory grants completion, win and milestone rewards once across reloads', () => {
    const { session, storage, progression } = fixture();
    prepareVictory(session, true);
    session.declareVictory();
    expect(session.state!.phase).toBe('finished');
    expect(progression.snapshot).toMatchObject({
        matches: 1,
        wins: 1,
        xp: 300,
        coins: 65,
        badges: ['first-match', 'first-win'],
    });
    expect(experience(progression.snapshot.xp)).toMatchObject({
        level: 2,
        current: 0,
        required: 400,
    });
    expect(sheetContent(session).body).toContain('پاداش پیروزی');
    expect(sheetContent(session).body).toContain('به سطح ۲ رسیدی');
    session.closeSheet();
    session.primary();
    session.returnToMenu();
    const restored = fixture(storage);
    expect(restored.session.savedMatch?.progressionId).toBe(session.savedMatch?.progressionId);
    restored.session.resumeSaved();
    expect(restored.session.state!.phase).toBe('finished');
    expect(sheetContent(restored.session).body).toContain('پاداش پیروزی');
    restored.session.declareVictory();
    restored.session.returnToMenu();
    expect(restored.progression.snapshot).toEqual(progression.snapshot);
});

test('a bot victory gives the human participation rewards and records a loss', () => {
    const { session, progression } = fixture();
    prepareVictory(session, false);
    session.advanceBot();
    expect(session.state!.phase).toBe('finished');
    expect(progression.snapshot).toMatchObject({
        matches: 1,
        wins: 0,
        xp: 150,
        coins: 30,
        badges: ['first-match'],
    });
    expect(sheetContent(session).body).toContain('پاداش پایان بازی');
    expect(sheetContent(session).body).not.toContain('پاداش پیروزی');
    session.returnToMenu();
    expect(menuContent(new AppPlatform(), session)).toContain('ورود / ساخت حساب');
});

test('unfinished matches and rejected victory declarations earn no rewards; legacy saves get a stable reward ID', () => {
    const { session, storage, progression } = fixture();
    session.start(4, false);
    session.declareVictory();
    session.returnToMenu();
    expect(progression.snapshot.matches).toBe(0);
    const saved = session.savedMatch!;
    delete saved.progressionId;
    storage.setItem('ancient-persia.match.v1', JSON.stringify(saved));
    const restored = fixture(storage);
    restored.session.resumeSaved();
    expect(restored.session.savedMatch?.progressionId).toMatch(/^[0-9a-f-]{36}$/);
    const id = restored.session.savedMatch?.progressionId;
    restored.session.returnToMenu();
    const next = fixture(storage);
    next.session.resumeSaved();
    expect(next.session.savedMatch?.progressionId).toBe(id);
    expect(next.progression.snapshot.matches).toBe(0);
    expect(decodeSave(storage.getItem('ancient-persia.match.v1')!)).not.toBeNull();
    expect(
        decodeSave(JSON.stringify({ ...next.session.savedMatch, progressionId: 'invalid' })),
    ).toBeNull();
});

test('coins buy cosmetics without changing match state, reject insufficient funds, and never charge twice', () => {
    const { progression, storage, session } = fixture();
    expect(progression.equip('amethyst')).toBe(false);
    expect(progression.equip('unknown')).toBe(false);
    const first = globalThis.crypto.randomUUID();
    progression.completeMatch(first, true);
    progression.completePractice();
    expect(progression.snapshot.coins).toBe(105);
    session.start(4, false);
    const state = JSON.stringify(session.state);
    expect(progression.equip('turquoise')).toBe(true);
    expect(progression.snapshot.coins).toBe(5);
    expect(progression.equip('sun')).toBe(true);
    expect(progression.equip('turquoise')).toBe(true);
    expect(progression.snapshot.coins).toBe(5);
    expect(progression.equip('amethyst')).toBe(false);
    expect(progression.completeMatch(first, true)).toBeNull();
    expect(JSON.stringify(session.state)).toBe(state);
    const restored = new ProgressionStore(storage);
    expect(restored.snapshot).toMatchObject({
        coins: 5,
        equipped: 'turquoise',
        owned: ['sun', 'turquoise'],
    });
    const copy = restored.snapshot;
    copy.coins = 999;
    copy.owned.push('amethyst');
    expect(restored.snapshot.coins).toBe(5);
    expect(restored.snapshot.owned).not.toContain('amethyst');
});

test('corrupt or unsupported profiles and storage failures never block play', () => {
    const storage = memory();
    storage.setItem(PROGRESSION_KEY, JSON.stringify({ version: 99, coins: -10 }));
    const store = new ProgressionStore(storage);
    expect(store.status).toBe('invalid');
    expect(store.snapshot.coins).toBe(0);
    const broken = new ProgressionStore({
        getItem: () => null,
        setItem: () => {
            throw new Error('quota');
        },
    });
    broken.completePractice();
    expect(broken.status).toBe('unavailable');
    expect(broken.snapshot.xp).toBe(100);
    const session = new GameSession(undefined, broken);
    session.requestPlay(true);
    expect(session.practice?.stage).toBe('roll');
    session.returnToMenu();
    expect(menuContent(new AppPlatform(), session)).toContain('ذخیرهٔ پیشرفت در دسترس نیست');
});

test('the hub exposes all modes and profile panels, escapes names, and keeps skill distinct from XP', () => {
    const { session, progression } = fixture();
    progression.rename(playerName('<img src=x>'));
    const markup = menuContent(new AppPlatform(), session);
    for (const action of [
        'online',
        'play',
        'tutorial',
        'account',
        'hub:profile',
        'hub:achievements',
        'hub:cosmetics',
    ])
        expect(markup).toContain(`data-action="${action}"`);
    expect(markup).not.toContain('<img src=x>');
    expect(markup).toContain('ورود / ساخت حساب');
    expect(markup).toContain('data-action="share-game"');
    for (const kind of ['profile', 'achievements', 'cosmetics', 'competitive'] as const) {
        session.openSheet({ kind });
        const sheet = sheetContent(session);
        expect(sheet.key).toBeTruthy();
        expect(sheet.body).not.toContain('<img');
    }
    expect(sheetContent(session).body).toContain('نوبت‌ها در این نسخه زمان‌سنج ندارند');
    session.closeSheet();
    progression.rename('مهسا');
    session.requestPlay();
    expect(session.playerNameDraft).toBe('مهسا');
});

test('milestones and level progress survive the fifth win without being re-awarded', () => {
    const storage = memory();
    const store = new ProgressionStore(storage);
    const ids = Array.from({ length: 5 }, () => globalThis.crypto.randomUUID());
    for (const id of ids) store.completeMatch(id, true);
    expect(store.snapshot).toMatchObject({
        matches: 5,
        wins: 5,
        xp: 1300,
        coins: 285,
        badges: ['first-match', 'first-win', 'explorer', 'champion'],
    });
    expect(experience(store.snapshot.xp)).toMatchObject({ level: 4, current: 100, required: 600 });
    const restored = new ProgressionStore(storage);
    expect(restored.snapshot).toEqual(store.snapshot);
    expect(restored.completeMatch(ids[0], true)).toBeNull();
    expect(restored.snapshot.xp).toBe(1300);
});

test('sequential tabs see each other’s earned balance and purchases instead of overwriting old state', () => {
    const storage = memory();
    const one = new ProgressionStore(storage);
    const two = new ProgressionStore(storage);
    one.completeMatch(globalThis.crypto.randomUUID(), true);
    two.completePractice();
    expect(two.snapshot.coins).toBe(105);
    expect(one.equip('turquoise')).toBe(true);
    expect(two.snapshot).toMatchObject({
        coins: 5,
        equipped: 'turquoise',
        matches: 1,
        practice: true,
    });
    expect(two.equip('amethyst')).toBe(false);
    expect(new ProgressionStore(storage).snapshot).toEqual(one.snapshot);
});

test('offline match IDs work when a local HTTP preview has no crypto.randomUUID', () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    vi.stubGlobal('crypto', { getRandomValues });
    try {
        const { session, storage } = fixture();
        session.start(4, false);
        const first = session.savedMatch?.progressionId;
        expect(first).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        );
        session.returnToMenu();
        const restored = fixture(storage);
        restored.session.resumeSaved();
        expect(restored.session.savedMatch?.progressionId).toBe(first);
        restored.session.start(4, false);
        expect(restored.session.savedMatch?.progressionId).not.toBe(first);
        expect(decodeSave(storage.getItem('ancient-persia.match.v1')!)).not.toBeNull();
    } finally {
        vi.unstubAllGlobals();
    }
});

test('past rewards stay in the profile without crowding the returning-player menu', () => {
    const { session, progression } = fixture();
    progression.completePractice();
    expect(progression.snapshot.lastReward).toBeTruthy();
    const menu = menuContent(new AppPlatform(), session);
    expect(menu).not.toContain('class="hub-reward');
    expect(menu).toContain('title-settings');
    expect(menu).toContain('title-invite');
    session.openSheet({ kind: 'profile' });
    expect(sheetContent(session).body).toContain('تمرین کامل شد');
});
