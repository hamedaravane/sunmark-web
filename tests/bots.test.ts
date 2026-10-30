import { createReadyGame } from './helpers/setup';
import { completeSessionSetup } from './helpers/setup';
import { afterEach, expect, test, vi } from 'vitest';
import { chooseBotCommand } from '../src/game/core/bot';
import { executeCommand } from '../src/game/core/commands';
import { getVictoryPoints } from '../src/game/core/game';
import { getBankTradeRatio } from '../src/game/core/ports';
import { RESOURCE_TYPES } from '../src/game/core/types';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner } from '../src/game/ui/botTurns';
import { humanHeader, humanHand } from '../src/game/ui/humanHud';
import { menuContent } from '../src/game/ui/menu';
import { MatchStore, decodeSave } from '../src/game/persistence/matchStore';
import { AppPlatform } from '../src/pwa/app';

function randomSource(seed: number) {
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };
}
function opponentTurn(guided = false) {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(4, guided);
    completeSessionSetup(session);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    session.state!.phase = 'actions';
    session.state!.lastRoll = [3, 3];
    session.primary();
    return session;
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

test('menu keeps offline Play and Tutorial alongside Online; practice pauses bots and does not create a save', () => {
    for (const guided of [false, true]) {
        const session = new GameSession();
        session.requestPlay(guided);
        if (!guided) {
            expect(session.sheet?.kind).toBe('player-name');
            session.confirmPlayerName();
        } else {
            expect(session.practice?.stage).toBe('roll');
            expect(session.botReady).toBe(false);
            expect(session.savedMatch).toBeNull();
        }
        expect(session.state!.players).toHaveLength(4);
        expect(session.humanPlayer?.id).toBe(session.state!.players[0].id);
        expect(session.tutorial.enabled).toBe(true);
        session.returnToMenu();
        const app = new AppPlatform();
        app.updateReady = true;
        const menu = menuContent(app, session);
        expect(menu.match(/<button\b/g)).toHaveLength(4);
        expect(menu).toContain('data-action="account"');
        expect(menu).toContain('data-action="online"');
        expect(menu).toContain('data-action="play"');
        expect(menu).toContain('data-action="tutorial"');
        expect(menu).not.toContain('data-action="open-app"');
        session.requestPlay();
        if (guided) expect(session.sheet?.kind).toBe('player-name');
        else expect(session.state!.players).toHaveLength(4);
    }
});

test('human input cannot roll, build, trade, select, or end a bot turn; personal status remains human-owned', () => {
    const session = opponentTurn();
    const before = session.state!;
    session.primary();
    session.chooseBuild('road');
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'brick');
    session.confirmTrade();
    session.confirmEndTurn();
    session.preview('missing');
    session.openSheet({ kind: 'trade' });
    expect(session.state).toBe(before);
    expect(session.placement).toBeNull();
    expect(session.give).toBeNull();
    expect(session.sheet).toBeNull();
    session.advanceBot();
    expect(session.transition?.action.kind).toBe('roll');
    expect(session.humanPlayer!.id).toBe(before.players[0].id);
    const header = humanHeader(session);
    expect(header).toContain(before.players[0].name);
    expect(header).toContain(before.players[1].name);
    expect(header).toContain('class="header-seats"');
    expect(header).toContain('آخرین تاس:');
    expect(session.history.at(-1)?.player).toBe(before.players[1].name);
    const hand = humanHand(session);
    session.state!.players[1].resources.wood += 900;
    expect(humanHand(session)).toBe(hand);
    session.state!.players[0].resources.wood += 1;
    expect(humanHand(session)).not.toBe(hand);
});

test('automatic opponents run in sequence and pause for sheets/visibility, then return control', () => {
    vi.useFakeTimers();
    const session = opponentTurn();
    for (const p of session.state!.players) for (const r of RESOURCE_TYPES) p.resources[r] = 0;
    let visible = true;
    const runner = new BotTurnRunner(session, () => visible, 10);
    const before = session.state;
    session.openSheet({ kind: 'help' });
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(before);
    session.closeSheet();
    visible = false;
    runner.refresh();
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(before);
    visible = true;
    runner.refresh();
    const rolls: number[] = [];
    let lastRoll = 0;
    const stop = session.subscribe(() => {
        if (session.transition?.action.kind === 'roll' && session.transition.id !== lastRoll) {
            lastRoll = session.transition.id;
            rolls.push(session.state!.activePlayerIndex);
        }
    });
    for (let i = 0; i < 80 && !session.isHumanTurn; i++) {
        if (session.sheet?.kind === 'domestic') session.closeSheet();
        vi.advanceTimersByTime(10);
    }
    expect(rolls).toEqual([1, 2, 3]);
    expect(session.isHumanTurn).toBe(true);
    expect(session.state!.phase).toBe('roll');
    expect(session.state!.turn).toBe(2);
    const humanTurn = session.state;
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(humanTurn);
    stop();
    runner.destroy();
});

test('stale scheduled steps and a destroyed runner cannot alter a new match', () => {
    vi.useFakeTimers();
    const session = opponentTurn();
    const stale = session.state!;
    const runner = new BotTurnRunner(session, () => true, 10);
    session.returnToMenu();
    vi.advanceTimersByTime(100);
    expect(session.state).toBeNull();
    session.start(4, false);
    const next = session.state;
    session.advanceBot(stale);
    expect(session.state).toBe(next);
    runner.destroy();
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(next);
});

test('bot seven creates no human placement or practice; bot construction is not human tutorial practice', () => {
    const session = opponentTurn(true);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    expect(session.tutorial.seen.has('handover')).toBe(true);
    vi.mocked(Math.random).mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.advanceBot();
    expect(session.state!.phase).toBe('robber');
    expect(session.placement).toBeNull();
    expect(session.sheet).toBeNull();
    const original = session.state!.board.tiles.find((t) => t.robber)!.id;
    session.advanceBot();
    if (session.state!.phase === 'steal') session.advanceBot();
    expect(session.state!.phase).toBe('actions');
    expect(session.state!.board.tiles.find((t) => t.robber)!.id).not.toBe(original);
    session.state!.players[1].resources.wheat = 2;
    session.state!.players[1].resources.stone = 3;
    session.advanceBot();
    expect(session.transition?.action).toMatchObject({ kind: 'build', type: 'city' });
    expect(session.tutorial.practiced.has('city')).toBe(false);
    expect(session.tutorial.practiced.has('seven')).toBe(false);
    expect(session.sheet).toBeNull();
});

test('bot planning is deterministic, legal, bounded by its resources, and ignores other inventories', () => {
    for (let seed = 1; seed <= 12; seed++) {
        let state = createReadyGame(['human', 'one', 'two', 'three'], randomSource(seed));
        state.activePlayerIndex = 1;
        state.phase = 'actions';
        state.lastRoll = [4, 4];
        state.players[1].resources = { wood: 8, brick: 7, wheat: 5, wool: 4, stone: 5 };
        let steps = 0;
        while (state.activePlayerIndex === 1 && state.phase !== 'finished') {
            expect(++steps).toBeLessThan(80);
            const copy = structuredClone(state);
            const command = chooseBotCommand(state)!;
            expect(state).toEqual(copy);
            const otherHand = structuredClone(state);
            for (const r of RESOURCE_TYPES) otherHand.players[0].resources[r] += 100;
            expect(chooseBotCommand(otherHand)).toEqual(command);
            const result = executeCommand(state, command);
            expect(result.ok).toBe(true);
            expect(state).toEqual(copy);
            if (!result.ok) throw new Error(result.reason);
            if (command.kind === 'trade')
                expect(command.ratio).toBe(
                    getBankTradeRatio(state.board, state.players[1].id, command.give),
                );
            for (const player of result.state.players)
                for (const r of RESOURCE_TYPES)
                    expect(player.resources[r]).toBeGreaterThanOrEqual(0);
            state = result.state;
        }
        expect(getVictoryPoints(state, state.players[1].id)).toBeGreaterThan(2);
    }
});

test('bot banks use an owned specialist rate and pay the same validated cost', () => {
    const state = createReadyGame(['human', 'one', 'two', 'three'], randomSource(42));
    state.activePlayerIndex = 1;
    state.phase = 'actions';
    const bot = state.players[1];
    const port = state.board.ports.find((p) => p.resource === 'wood')!;
    state.board.vertices[state.board.edges[port.edgeId].vertexIds[0]].building = {
        type: 'settlement',
        ownerId: bot.id,
    };
    bot.resources = { wood: 20, brick: 0, wheat: 0, wool: 0, stone: 0 };
    const command = chooseBotCommand(state)!;
    expect(command).toMatchObject({ kind: 'trade', give: 'wood', ratio: 2 });
    const result = executeCommand(state, command);
    expect(result.ok).toBe(true);
    expect(result.state.players[1].resources.wood).toBe(18);
});

test('a bot victory ends immediately, opens results and cancels automatic play', () => {
    vi.useFakeTimers();
    const session = opponentTurn();
    const state = session.state!;
    state.phase = 'actions';
    state.lastRoll = [4, 4];
    const bot = state.players[1];
    for (const v of Object.values(state.board.vertices))
        if (v.building?.ownerId === bot.id) v.building.type = 'city';
    const extra = Object.values(state.board.vertices).find(
        (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
    )!;
    extra.building = { type: 'settlement', ownerId: bot.id };
    bot.resources.wheat = 2;
    bot.resources.stone = 3;
    for (let n = 0; n < 2; n++) {
        const site = Object.values(state.board.vertices).find(
            (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
        )!;
        site.building = { type: 'city', ownerId: bot.id };
    }
    expect(getVictoryPoints(state, bot.id)).toBe(9);
    const runner = new BotTurnRunner(session, () => true, 10);
    vi.advanceTimersByTime(10);
    expect(session.state!.phase).toBe('finished');
    expect(session.state!.winnerId).toBe(bot.id);
    expect(session.sheet?.kind).toBe('results');
    const finished = session.state;
    session.closeSheet();
    session.primary();
    expect(session.sheet?.kind).toBe('results');
    vi.advanceTimersByTime(100);
    expect(session.state).toBe(finished);
    runner.destroy();
});

test('resume preserves the human seat during a bot turn, and legacy saves keep their board', () => {
    const values = new Map<string, string>();
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.start(4, false);
    completeSessionSetup(session);
    session.state!.phase = 'actions';
    session.state!.lastRoll = [4, 4];
    session.primary();
    const restored = new GameSession(new MatchStore(storage));
    restored.requestPlay();
    expect(restored.state).toEqual(session.state);
    expect(restored.humanPlayer!.id).toBe(session.humanPlayer!.id);
    expect(restored.botReady).toBe(true);
    const saved = JSON.parse(values.get('ancient-persia.match.v1')!);
    delete saved.humanPlayerId;
    values.set('ancient-persia.match.v1', JSON.stringify(saved));
    const legacy = new GameSession(new MatchStore(storage));
    legacy.resumeSaved();
    expect(legacy.state).toEqual(session.state);
    expect(legacy.humanPlayer!.id).toBe(saved.state.players[0].id);
    saved.humanPlayerId = 'missing-player';
    expect(decodeSave(JSON.stringify(saved))).toBeNull();
});

test('a three-seat legacy save keeps its pieces and resumes a bot robber move without rerolling', () => {
    const session = new GameSession();
    session.start(3, false);
    completeSessionSetup(session);
    const state = session.state!;
    state.activePlayerIndex = 1;
    state.phase = 'robber';
    state.lastRoll = [3, 4];
    session.save();
    const legacy = structuredClone(session.savedMatch!);
    delete legacy.humanPlayerId;
    legacy.version = 1;
    legacy.state.victoryTarget = 6;
    delete legacy.state.development;
    delete legacy.state.awards;
    delete legacy.state.robberResolution;
    delete legacy.state.roadBuilding;
    legacy.tutorial.enabled = true;
    legacy.tutorial.queue = ['seven'];
    const raw = JSON.stringify(legacy);
    const store = new MatchStore({ getItem: () => raw, setItem: () => {} });
    const restored = new GameSession(store);
    restored.resumeSaved();
    expect(restored.state!.players).toHaveLength(3);
    expect(restored.state!.board).toEqual(state.board);
    expect(restored.placement).toBeNull();
    expect(restored.sheet).toBeNull();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Never reroll this seven');
    });
    restored.advanceBot();
    expect(['steal', 'actions']).toContain(restored.state!.phase);
    expect(restored.state!.lastRoll).toEqual([3, 4]);
    expect(restored.state!.players).toEqual(state.players);
    random.mockRestore();
});
