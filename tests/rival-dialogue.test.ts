import { afterEach, expect, test, vi } from 'vitest';
import type { Scene } from 'phaser';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner } from '../src/game/ui/botTurns';
import { sheetContent } from '../src/game/ui/sheets';
import { RivalDirector, validRivalMemory } from '../src/game/narrative/rivalDirector';
import { DIALOGUES } from '../src/game/narrative/dialogues.fa';
import { MatchStore, decodeSave } from '../src/game/persistence/matchStore';
import { createReadyGame } from './helpers/setup';
import { executeCommand } from '../src/game/core/commands';
import { circularAvatarTexture } from '../src/game/ui/avatarTextures';
import { RESOURCE_TYPES } from '../src/game/core/types';

const characters = ['mithra', 'ashi', 'spenta-armaiti'] as const;
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
function fresh() {
    const session = new GameSession();
    session.start(4, false, 'مهسا', true);
    session.closeSheet();
    return session;
}
function drain(session: GameSession) {
    for (let n = 0; n < 30; n++) {
        if (session.sheet?.kind === 'rival-dialogue') session.continueRival();
        else if (session.sheet?.kind === 'tutorial') session.continueTutorial();
        else if (session.rivalReady) session.presentRival();
        else return;
    }
    throw new Error('Dialogue did not finish');
}
function match() {
    let raw: string | null = null;
    const opening = createReadyGame(['مهسا', 'میترا', 'اَشی', 'سپنتا آرمیتی'], () => 0.5);
    const rolled = executeCommand(opening, { kind: 'roll' }, () => 0.5);
    if (!rolled.ok) throw new Error(rolled.reason);
    const state = rolled.state;
    raw = JSON.stringify({
        version: 2,
        state,
        humanPlayerId: state.players[0].id,
        tutorial: { enabled: false, seen: [], practiced: [], queue: [], replaying: false },
        history: [],
    });
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.resumeSaved();
    return { session, storage, read: () => raw! };
}

test('a real new-match entry automatically introduces every rival without opening move review', () => {
    vi.useFakeTimers();
    const session = fresh();
    const state = session.state;
    const runner = new BotTurnRunner(session);
    vi.advanceTimersByTime(0);
    const seen: string[] = [];
    while (session.sheet?.kind === 'rival-dialogue') {
        const content = sheetContent(session);
        seen.push(content.title);
        expect(content.narrator?.portrait).toMatch(/-portrait$/);
        expect(content.footer).toContain('rival-next');
        session.primary();
        session.advanceBot();
        expect(session.state).toBe(state);
        session.continueRival();
    }
    expect(seen).toEqual(['میترا', 'اَشی', 'سپنتا آرمیتی']);
    expect(session.tutorial.enabled).toBe(false);
    expect(session.rivals.enabled).toBe(true);
    expect(session.sheet).toBeNull();
    runner.destroy();
});

test('Anahita finishes her queued guidance before rivals speak, and is a cameo when enabled', () => {
    const session = new GameSession();
    session.start(4, true, 'مهسا', true);
    expect(session.sheet?.kind).toBe('introduction');
    session.closeSheet();
    expect(session.sheet?.kind).toBe('tutorial');
    expect(session.rivalReady).toBe(false);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    session.presentRival();
    expect(sheetContent(session).title).toBe('آناهیتا');
    session.continueRival();
    expect(sheetContent(session).title).toBe('میترا');
    drain(session);
    expect(session.tutorial.enabled).toBe(true);
});

test('player replies show a personality-specific response and preserve all game state and randomness', () => {
    const session = fresh();
    session.presentRival();
    session.continueRival();
    session.continueRival();
    const state = structuredClone(session.state);
    const random = vi.spyOn(Math, 'random');
    random.mockClear();
    expect(sheetContent(session).body).toContain('rival-reply:curious');
    session.replyRival('curious');
    expect(sheetContent(session).body).toContain('تولید گندم و سنگ');
    expect(sheetContent(session).body).not.toContain('rival-reply:curious');
    expect(session.state).toEqual(state);
    expect(random).not.toHaveBeenCalled();
    session.continueRival();
    expect(session.sheet).toBeNull();
});

test.each(['ahriman-hit', 'army-title', 'near-victory'] as const)(
    '%s presents Ahriman with his own art and history name without making him a player',
    (id) => {
        const session = fresh();
        session.state!.phase = 'actions';
        session.rivals.restore({
            enabled: true,
            seen: [id],
            queue: [{ id, step: 0, reply: null }],
            lastRound: -1,
        });
        const state = structuredClone(session.state);
        const random = vi.spyOn(Math, 'random');
        random.mockClear();
        session.presentRival();
        let appeared = false;
        while (session.sheet?.kind === 'rival-dialogue') {
            const view = session.rivals.view(false, characters)!;
            const content = sheetContent(session);
            if (view.beat.speaker === 'ahriman') {
                appeared = true;
                expect(content.title).toBe('اهریمن');
                expect(content.narrator?.portrait).toBe('ahriman-portrait');
                expect(session.history.at(-1)?.text).toBe(`اهریمن: «${view.beat.text}»`);
                expect(validRivalMemory(session.rivals.snapshot())).toBe(true);
                const restored = new RivalDirector();
                restored.restore(session.rivals.snapshot());
                expect(restored.view(false, characters)?.beat.speaker).toBe('ahriman');
            }
            if (view.canReply) {
                session.replyRival('curious');
                expect(session.rivals.view(false, characters)?.beat.speaker).not.toBe('ahriman');
                expect(sheetContent(session).body).not.toContain('rival-reply:');
            }
            session.continueRival();
        }
        expect(appeared).toBe(true);
        expect(session.rivalCharacters).toEqual(characters);
        expect(session.state).toEqual(state);
        expect(random).not.toHaveBeenCalled();
    },
);

test('confirmed human building queues a full conversation; bot play waits for it, including hidden-page guards', () => {
    vi.useFakeTimers();
    const { session } = match();
    session.state!.phase = 'actions';
    session.state!.players[0].resources.wood = 5;
    session.state!.players[0].resources.brick = 5;
    session.chooseBuild('road');
    session.preview(session.targets[0]);
    session.primary();
    const built = session.state;
    expect(session.rivalReady).toBe(true);
    let visible = false;
    const runner = new BotTurnRunner(session, () => visible);
    vi.advanceTimersByTime(10000);
    expect(session.sheet).toBeNull();
    visible = true;
    runner.refresh();
    vi.advanceTimersByTime(1099);
    expect(session.sheet).toBeNull();
    vi.advanceTimersByTime(1);
    expect(session.sheet?.kind).toBe('rival-dialogue');
    expect(sheetContent(session).narrator?.portrait).toBe('mithra-portrait');
    vi.advanceTimersByTime(10000);
    expect(session.state).toBe(built);
    session.closeSheet();
    expect(session.rivals.enabled).toBe(true);
    expect(session.state).toBe(built);
    runner.destroy();
});

test('partial dialogue and a chosen reply survive reload once, with a separate saved mute and safe legacy migration', () => {
    const { session, storage, read } = match();
    session.state!.phase = 'actions';
    session.state!.players[0].resources.wood = 5;
    session.state!.players[0].resources.brick = 5;
    session.chooseBuild('road');
    session.preview(session.targets[0]);
    session.primary();
    session.presentRival();
    session.continueRival();
    const title = sheetContent(session).title;
    const history = structuredClone(session.history);
    expect(decodeSave(read())).not.toBeNull();
    const restored = new GameSession(new MatchStore(storage));
    restored.resumeSaved();
    restored.presentRival();
    expect(sheetContent(restored).title).toBe(title);
    expect(restored.history).toEqual(history);
    expect(restored.state!.board).toEqual(session.state!.board);
    restored.replyRival('bold');
    expect(sheetContent(restored).body).toContain('رقابت منصفانه');
    expect(decodeSave(read())).not.toBeNull();
    restored.setRivalDialogue(false);
    const muted = new GameSession(new MatchStore(storage));
    muted.resumeSaved();
    expect(muted.rivals.enabled).toBe(false);
    expect(muted.rivalReady).toBe(false);
    expect(muted.tutorial.enabled).toBe(false);
    muted.openSheet({ kind: 'characters' });
    expect(sheetContent(muted).body).toContain('rival-replay:human-road');
    const before = muted.state;
    muted.replayRival('human-road');
    expect(muted.sheet?.kind).toBe('rival-dialogue');
    drain(muted);
    expect(muted.rivals.enabled).toBe(false);
    expect(muted.state).toBe(before);
});

test('mandatory seven choices, drafts and open sheets outrank pending conversations', () => {
    const { session } = match();
    session.state!.phase = 'actions';
    session.state!.players[0].resources.wood = 5;
    session.state!.players[0].resources.brick = 5;
    session.chooseBuild('road');
    session.preview(session.targets[0]);
    session.primary();
    session.openSheet({ kind: 'help' });
    session.presentRival();
    expect(session.sheet?.kind).toBe('help');
    session.closeSheet();
    session.chooseBuild('road');
    session.presentRival();
    expect(session.sheet?.kind).not.toBe('rival-dialogue');
    session.cancelPlacement();
    session.state!.phase = 'roll';
    for (const p of session.state!.players) for (const r of RESOURCE_TYPES) p.resources[r] = 0;
    session.state!.players[0].resources.wood = 8;
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.roll();
    expect(session.sheet?.kind).toBe('discard');
    session.presentRival();
    expect(session.sheet?.kind).toBe('discard');
    for (let n = 0; n < 4; n++) session.adjustDiscard('wood', 1);
    session.confirmDiscard();
    expect(session.state!.phase).toBe('robber');
    expect(session.rivalReady).toBe(false);
});

test('director reacts across the match, bounds frequency and queue, and cannot read private opponents', () => {
    const director = new RivalDirector();
    director.reset(true);
    let state = createReadyGame(['you', 'Mithra', 'Ashi', 'Spenta'], () => 0.5);
    state.phase = 'actions';
    state.activePlayerIndex = 2;
    state.players[2].resources = { wood: 8, brick: 0, wheat: 0, wool: 0, stone: 0 };
    const action = { kind: 'trade', give: 'wood', receive: 'wheat', ratio: 4 } as const;
    const result = executeCommand(state, action);
    expect(result.ok).toBe(true);
    const transition = { id: 1, before: state, after: result.state, action, production: [] };
    director.observe(transition, 'player-1');
    expect(director.view(false, characters)?.id).toBe('ashi-trade');
    director.begin(state.turn);
    while (director.pending) director.advance(false, characters);
    director.observe({ ...transition, id: 2 }, 'player-1');
    expect(director.pending).toBe(false);
    state = structuredClone(result.state);
    state.turn += 3;
    state.activePlayerIndex = 3;
    const site = Object.values(state.board.vertices).find(
        (v) => v.building?.ownerId === 'player-4',
    )!;
    state.players[3].resources = { wood: 0, brick: 0, wheat: 2, wool: 0, stone: 3 };
    const build = { kind: 'build', type: 'city', targetId: site.id } as const;
    const city = executeCommand(state, build);
    expect(city.ok).toBe(true);
    director.observe(
        { id: 3, before: state, after: city.state, action: build, production: [] },
        'player-1',
    );
    expect(director.view(false, characters)?.id).toBe('spenta-city');
    expect(director.snapshot().queue).toHaveLength(1);
    const hidden = structuredClone(state);
    hidden.players[2].resources.wood = 9999;
    const other = new RivalDirector();
    other.reset(true);
    other.begin(state.turn - 1);
    other.observe(
        { id: 3, before: hidden, after: city.state, action: build, production: [] },
        'player-1',
    );
    expect(other.view(false, characters)?.id).toBe('spenta-city');
});

test('saved story metadata rejects unknown scripts, invalid steps, replies and unbounded queues', () => {
    const director = new RivalDirector();
    director.reset(true, true);
    const memory = director.snapshot();
    expect(validRivalMemory(memory)).toBe(true);
    expect(validRivalMemory({ ...memory, queue: [{ id: 'made-up', step: 0, reply: null }] })).toBe(
        false,
    );
    expect(
        validRivalMemory({ ...memory, queue: [{ id: 'arrival', step: 999, reply: null }] }),
    ).toBe(false);
    expect(
        validRivalMemory({
            ...memory,
            queue: [{ id: 'arrival', step: 0, reply: 'grant-resources' }],
        }),
    ).toBe(false);
    expect(validRivalMemory({ ...memory, queue: [...memory.queue, ...memory.queue] })).toBe(false);
    const triple = new RivalDirector();
    triple.reset(true, true);
    expect(triple.view(false, ['mithra', 'ashi'])?.total).toBe(2);
    for (const script of Object.values(DIALOGUES))
        expect(script.beats.length).toBeGreaterThanOrEqual(3);
});

test('avatar textures clip all source pixels to a circle once and reuse the cache without modifying artwork', () => {
    const existing = new Set(['portrait']);
    const context = {
        save: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        closePath: vi.fn(),
        clip: vi.fn(),
        drawImage: vi.fn(),
        restore: vi.fn(),
    };
    const source = {};
    const refresh = vi.fn();
    const createCanvas = vi.fn((key: string) => {
        existing.add(key);
        return { context, refresh };
    });
    const scene = {
        textures: {
            exists: (key: string) => existing.has(key),
            get: () => ({
                has: () => true,
                get: () => ({ cutX: 16, cutY: 32, cutWidth: 128, cutHeight: 128 }),
                getSourceImage: () => source,
            }),
            createCanvas,
        },
    } as unknown as Scene;
    expect(circularAvatarTexture(scene, 'portrait', 'crop')).toBe('avatar-circle:portrait:crop');
    expect(context.arc).toHaveBeenCalledWith(128, 128, 128, 0, Math.PI * 2);
    expect(context.clip.mock.invocationCallOrder[0]).toBeLessThan(
        context.drawImage.mock.invocationCallOrder[0],
    );
    expect(context.drawImage).toHaveBeenCalledWith(source, 16, 32, 128, 128, 0, 0, 256, 256);
    expect(refresh).toHaveBeenCalledOnce();
    circularAvatarTexture(scene, 'portrait', 'crop');
    expect(createCanvas).toHaveBeenCalledOnce();
    expect(circularAvatarTexture(scene, 'missing', 'crop')).toBeNull();
});

test.each(['player-1', 'player-2', 'player-3', 'player-4'])(
    'the ending gives %s a relevant conversation and returns to results',
    (winnerId) => {
        const { session } = match();
        const before = structuredClone(session.state!);
        session.setBotPaused(true);
        session.state!.phase = 'finished';
        session.state!.winnerId = winnerId;
        session.openSheet({ kind: 'results' });
        session.rivals.observe(
            {
                id: 99,
                before,
                after: session.state!,
                action: { kind: 'declare-victory' },
                production: [],
            },
            session.humanPlayer!.id,
        );
        const state = session.state;
        session.presentRival();
        expect(session.sheet?.kind).toBe('rival-dialogue');
        expect(sheetContent(session).narrator?.portrait).toBe(
            winnerId === 'player-3'
                ? 'ashi-portrait'
                : winnerId === 'player-4'
                  ? 'spenta-armaiti-portrait'
                  : 'mithra-portrait',
        );
        drain(session);
        expect(session.sheet?.kind).toBe('results');
        expect(session.state).toBe(state);
    },
);

test('a replaced match cannot be covered by a stale queued conversation', () => {
    vi.useFakeTimers();
    const session = fresh();
    const stale = session.state!;
    const runner = new BotTurnRunner(session);
    session.returnToMenu();
    session.start(4, false);
    session.presentRival(stale);
    vi.advanceTimersByTime(5000);
    expect(session.sheet).toBeNull();
    expect(session.rivals.enabled).toBe(false);
    runner.destroy();
});
