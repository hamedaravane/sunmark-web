import { afterEach, expect, test, vi } from 'vitest';
import { chooseBotCommand, expansionRoad } from '../src/game/core/bot';
import { executeCommand } from '../src/game/core/commands';
import { rollForStart } from '../src/game/core/setup';
import { createGame } from '../src/game/core/game';
import { getBuildOption } from '../src/game/core/queries';
import { resourceCount, resolutionActor } from '../src/game/core/robber';
import { RESOURCE_TYPES } from '../src/game/core/types';
import { BOT_POLICIES, type BotPersonality } from '../src/game/core/botPersonality';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner, botTurnDelay } from '../src/game/ui/botTurns';
import { turnReport } from '../src/game/ui/turnReport';
import { sheetContent } from '../src/game/ui/sheets';
import { actionDock, turnStatus } from '../src/game/ui/turnMarkup';
import { CHARACTERS } from '../src/game/ui/characters';
import { matchAvatar } from '../src/game/ui/headerModel';
import { MatchStore, decodeSave } from '../src/game/persistence/matchStore';
import { completeSessionSetup, createReadyGame } from './helpers/setup';

const styles = Object.keys(BOT_POLICIES) as BotPersonality[];
const randomSource = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
};
afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
function opponentSession() {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(4, false);
    completeSessionSetup(session);
    session.state!.phase = 'actions';
    session.state!.lastRoll = [3, 3];
    session.primary();
    return session;
}

test('personalities make distinct opening choices without changing targets or using randomness', () => {
    const choices = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
        let state = createGame(['self', 'one', 'two', 'three'], randomSource(seed));
        while (state.phase === 'setup-roll') {
            const result = rollForStart(state, () => (state.activePlayerIndex === 0 ? 0.99 : 0.01));
            if (!result.ok) throw new Error(result.reason);
            state = result.state;
        }
        const original = structuredClone(state);
        const commands = CHARACTERS.map(({ id }) => chooseBotCommand(state, id)!);
        if (new Set(commands.map((command) => JSON.stringify(command))).size > 1)
            choices.add(String(seed));
        for (const command of commands) expect(executeCommand(state, command).ok).toBe(true);
        expect(state).toEqual(original);
    }
    expect(choices.size).toBeGreaterThan(1);
});

test('Mithra and Spenta choose expansion and cities respectively when both builds are available', () => {
    let state = createReadyGame(['self', 'Mithra', 'Ashi', 'Spenta'], randomSource(17));
    state.activePlayerIndex = 1;
    state.phase = 'actions';
    for (let i = 0; !getBuildOption(state, 'settlement').legalTargetIds.length && i < 12; i++) {
        const targetId = expansionRoad(state)!;
        state.players[1].resources = { wood: 50, brick: 50, wheat: 50, wool: 50, stone: 50 };
        const result = executeCommand(state, { kind: 'build', type: 'road', targetId });
        expect(result.ok).toBe(true);
        state = result.state;
    }
    expect(getBuildOption(state, 'settlement').legalTargetIds.length).toBeGreaterThan(0);
    state.players[1].resources = { wood: 1, brick: 1, wheat: 3, wool: 1, stone: 3 };
    expect(chooseBotCommand(state, 'mithra')).toMatchObject({ kind: 'build', type: 'settlement' });
    expect(chooseBotCommand(state, 'spenta-armaiti')).toMatchObject({
        kind: 'build',
        type: 'city',
    });
});

test.each(styles)(
    '%s completes legal bounded turns and cannot see the composition of other hands',
    (style) => {
        for (let seed = 1; seed <= 8; seed++) {
            let state = createReadyGame(['self', 'one', 'two', 'three'], randomSource(seed));
            state.activePlayerIndex = 1;
            state.phase = 'actions';
            state.players[1].resources = { wood: 8, brick: 7, wheat: 5, wool: 4, stone: 5 };
            let steps = 0;
            while (state.activePlayerIndex === 1 && state.phase !== 'finished') {
                expect(++steps).toBeLessThan(80);
                const original = structuredClone(state);
                const command = chooseBotCommand(state, style)!;
                const altered = structuredClone(state);
                const actor = resolutionActor(state);
                for (const p of altered.players)
                    if (p.id !== actor) {
                        const count = resourceCount(p.resources);
                        p.resources = { wood: 0, brick: count, wheat: 0, wool: 0, stone: 0 };
                    }
                expect(chooseBotCommand(altered, style)).toEqual(command);
                const result = executeCommand(state, command, randomSource(seed + steps));
                expect(result.ok).toBe(true);
                expect(state).toEqual(original);
                for (const p of result.state.players)
                    for (const r of RESOURCE_TYPES)
                        expect(p.resources[r]).toBeGreaterThanOrEqual(0);
                state = result.state;
            }
        }
    },
);

test('default pacing preserves the roll receipt; pause, single step, sheets and visibility guard authority', () => {
    vi.useFakeTimers();
    const session = opponentSession();
    let visible = true;
    const runner = new BotTurnRunner(session, () => visible);
    const before = session.state;
    vi.advanceTimersByTime(499);
    expect(session.state).toBe(before);
    vi.advanceTimersByTime(1);
    expect(session.transition?.action.kind).toBe('roll');
    expect(botTurnDelay(session)).toBeLessThanOrEqual(1200);
    for (const player of session.state!.players)
        for (const r of RESOURCE_TYPES) player.resources[r] = 0;
    session.setBotPaused(true);
    const rolled = session.state;
    vi.advanceTimersByTime(20000);
    session.advanceBot();
    expect(session.state).toBe(rolled);
    session.stepBot();
    const stepped = session.state;
    expect(stepped).not.toBe(rolled);
    vi.advanceTimersByTime(20000);
    expect(session.state).toBe(stepped);
    session.openSheet({ kind: 'turn-review' });
    session.stepBot();
    expect(session.state).toBe(stepped);
    session.closeSheet();
    visible = false;
    session.setBotPaused(false);
    vi.advanceTimersByTime(20000);
    expect(session.state).toBe(stepped);
    runner.destroy();
});

test('receipts aggregate public production, show costs and hide exact remaining hands and new cards', () => {
    const session = opponentSession();
    session.advanceBot();
    const report = turnReport(session.transition, session.humanPlayer!.id)!;
    expect(report.headline).toContain('تاس ۴ + ۴ = ۸');
    for (const player of session.state!.players) {
        const grants = session.transition!.production.filter((g) => g.playerId === player.id);
        if (grants.length) expect(report.details.join(' ')).toContain(player.name);
    }
    expect(turnStatus(session)).toContain('open:turn-review');
    expect(actionDock(session)).toContain('bot-pause');
    session.state!.players[1].resources = { wood: 0, brick: 0, wheat: 2, wool: 0, stone: 3 };
    session.advanceBot();
    const built = turnReport(session.transition, session.humanPlayer!.id)!;
    expect(built.details).toContain('پرداخت: ۲ گندم، ۳ سنگ');
    expect(built.details).toContain('امتیاز عمومی میترا: +۱');
    session.openSheet({ kind: 'turn-review' });
    expect(sheetContent(session).narrator?.portrait).toBe('mithra-portrait');
    expect(sheetContent(session).body).not.toContain('آناهیتا');
    session.closeSheet();
    const hidden = session.state!.players[1].resources;
    hidden.wool = hidden.stone = hidden.wheat = 1;
    hidden.wood = hidden.brick = 0;
    session.advanceBot();
    expect(session.transition?.action.kind).toBe('buy-development');
    const purchased = turnReport(session.transition, session.humanPlayer!.id)!;
    expect(purchased.details.join(' ')).toContain('نوع کارت مخفی');
    expect(JSON.stringify(purchased)).not.toContain('victory-point');
});

test('saved legacy identities migrate without changing board state or replaying events', () => {
    const session = opponentSession();
    session.state!.players.slice(1).forEach((p, i) => (p.name = ['اطلس', 'آسیمو', 'سوفیا'][i]));
    session.save();
    const saved = structuredClone(session.savedMatch!);
    const board = structuredClone(saved.state.board);
    const store = new MatchStore({ getItem: () => JSON.stringify(saved), setItem: () => {} });
    const restored = new GameSession(store);
    restored.resumeSaved();
    expect(restored.state!.board).toEqual(board);
    expect(restored.state!.players.slice(1).map((p) => p.name)).toEqual(
        CHARACTERS.map((c) => c.name),
    );
    expect(restored.history).toEqual(saved.history);
    expect(restored.transition).toBeNull();
    expect(restored.botPaused).toBe(false);
    expect(decodeSave(JSON.stringify(restored.savedMatch))).not.toBeNull();
    expect(
        matchAvatar(restored.state!, restored.state!.players[1].id, restored.humanPlayer!.id),
    ).toBe('mithra');
});

test('a paused rival discard on the human turn keeps step controls reachable', () => {
    const session = opponentSession();
    const state = session.state!;
    state.activePlayerIndex = 0;
    state.phase = 'roll';
    for (const p of state.players) for (const r of RESOURCE_TYPES) p.resources[r] = 0;
    state.players[1].resources.wood = 8;
    session.setBotPaused(true);
    vi.mocked(Math.random).mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.roll();
    expect(session.state!.phase).toBe('discard');
    expect(session.isHumanTurn).toBe(true);
    expect(session.botReady).toBe(true);
    expect(actionDock(session)).toContain('data-action="bot-step"');
    session.stepBot();
    expect(session.transition?.action.kind).toBe('discard');
    expect(session.state!.phase).toBe('robber');
    expect(session.placement?.kind).toBe('robber');
});

test('a paused market exposes a resume control before waiting for bot replies', () => {
    const session = opponentSession();
    session.state!.phase = 'actions';
    session.setBotPaused(true);
    session.openSheet({ kind: 'domestic' });
    expect(sheetContent(session).body).toContain('data-action="bot-pause"');
    const state = session.state;
    session.setBotPaused(false);
    expect(session.state).toBe(state);
    expect(session.sheet?.kind).toBe('domestic');
});
