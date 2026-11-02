import { completeSessionSetup } from './helpers/setup';
import { afterEach, expect, test, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { LESSONS } from '../src/game/tutorial/lessons.fa';
import { ART } from '../src/game/assets';
import { getBuildOption } from '../src/game/core/queries';
import { getPortOwnerId } from '../src/game/core/ports';

afterEach(() => vi.restoreAllMocks());

function start(guided = true) {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(3, guided);
    completeSessionSetup(session);
    return session;
}
function readDialogue(session: GameSession): string[] {
    const ids: string[] = [];
    while (session.sheet?.kind === 'tutorial') {
        expect(ids.length).toBeLessThan(20);
        ids.push(session.tutorial.current!);
        session.continueTutorial();
    }
    return ids;
}
function actionPhase(session: GameSession) {
    readDialogue(session);
    session.primary();
    readDialogue(session);
    expect(session.state!.phase).toBe('actions');
}

test('the ordinary-roll lesson follows completed guided setup without changing state; explicit opt-out stays quiet', () => {
    const session = start();
    const before = structuredClone(session.state);
    expect(readDialogue(session)).toEqual(['roll']);
    expect(session.state).toEqual(before);
    expect(session.tutorial.practiced.has('setup')).toBe(true);
    expect(session.tutorial.practiced.has('roll')).toBe(false);
    session.start(4, false);
    expect(session.sheet).toBeNull();
    expect(session.tutorial.enabled).toBe(false);
    expect(session.tutorial.seen.size).toBe(0);
});

test('a roll produces lessons once; reopening help never replays the last command', () => {
    const session = start();
    readDialogue(session);
    session.primary();
    expect(readDialogue(session)).toContain('production');
    expect(session.tutorial.practiced.has('roll')).toBe(true);
    session.openSheet({ kind: 'help' });
    session.closeSheet();
    expect(session.sheet).toBeNull();
    expect(session.tutorial.current).toBeNull();
});

test('seven has priority and explanation cannot bypass or pay for robber relocation', () => {
    const session = start();
    readDialogue(session);
    vi.mocked(Math.random).mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.primary();
    const before = session.state;
    expect(session.tutorial.current).toBe('seven');
    session.primary();
    session.chooseBuild('road');
    expect(session.state).toBe(before);
    expect(readDialogue(session)).toEqual(['seven']);
    expect(session.placement?.kind).toBe('robber');
    const target = session.targets.find((id) =>
        session
            .state!.board.tiles.find((tile) => tile.id === id)!
            .vertexIds.every((vertexId) => {
                const building = session.state!.board.vertices[vertexId].building;
                return !building || building.ownerId === session.humanPlayer!.id;
            }),
    )!;
    session.preview(target);
    session.primary();
    expect(session.state!.phase).toBe('actions');
    expect(readDialogue(session)).toContain('robber-moved');
    expect(session.tutorial.practiced.has('seven')).toBe(true);
    expect(session.state!.players).toEqual(before!.players);
});

test('construction narration restores its sheet; only a confirmed build counts as practice', () => {
    const session = start();
    actionPhase(session);
    session.state!.players[0].resources.wood = 5;
    session.state!.players[0].resources.brick = 5;
    const before = session.state;
    session.openSheet({ kind: 'build' });
    expect(readDialogue(session)).toContain('road');
    expect(session.sheet?.kind).toBe('build');
    expect(session.state).toBe(before);
    expect(session.tutorial.practiced.has('road')).toBe(false);
    session.chooseBuild('road');
    const target = session.targets[0];
    session.preview(target);
    expect(session.tutorial.current).toBe('preview');
    expect(session.state).toBe(before);
    readDialogue(session);
    expect(session.placement?.targetId).toBe(target);
    session.primary();
    expect(readDialogue(session)).toContain('built-road');
    expect(session.tutorial.practiced.has('road')).toBe(true);
    expect(session.state!.players[0].resources.wood).toBe(4);
    expect(session.state!.board.edges[target].road?.ownerId).toBe(before!.players[0].id);
});

test('unaffordable construction explains shortages without asking for an illegal build', () => {
    const session = start();
    actionPhase(session);
    session.state!.players[0].resources = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    session.openSheet({ kind: 'build' });
    expect(readDialogue(session)).toEqual(['shortage']);
    expect(session.sheet?.kind).toBe('build');
    expect(session.tutorial.objective({ state: session.state!, placement: null })).not.toContain(
        'فرصت تمرین',
    );
});

test('trade narration keeps both resource choices and exact balances until confirmation', () => {
    const session = start();
    actionPhase(session);
    session.state!.players[0].resources.wood = 8;
    session.state!.players[0].resources.stone = 0;
    const before = session.state;
    session.openSheet({ kind: 'trade' });
    readDialogue(session);
    expect(session.sheet?.kind).toBe('trade');
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'stone');
    expect(session.tutorial.current).toBe('trade-review');
    expect(session.state).toBe(before);
    const ratio = session.tradeRatio;
    readDialogue(session);
    expect(session.give).toBe('wood');
    expect(session.receive).toBe('stone');
    session.confirmTrade();
    expect(readDialogue(session)).toEqual(['traded']);
    expect(session.state!.players[0].resources).toMatchObject({ wood: 8 - ratio, stone: 1 });
    expect(session.tutorial.practiced.has('bank')).toBe(true);
});

test('pause resumes the underlying sheet and replay does not mark a concept as practiced', () => {
    const session = start();
    actionPhase(session);
    session.openSheet({ kind: 'trade' });
    expect(session.sheet?.kind).toBe('tutorial');
    session.closeSheet();
    expect(session.tutorial.enabled).toBe(false);
    expect(session.sheet?.kind).toBe('trade');
    session.openSheet({ kind: 'journal' });
    session.replayLesson('city');
    const before = session.state;
    readDialogue(session);
    expect(session.sheet?.kind).toBe('journal');
    expect(session.state).toBe(before);
    expect(session.tutorial.seen.has('city')).toBe(true);
    expect(session.tutorial.practiced.has('city')).toBe(false);
    session.setTutorialEnabled(true);
    session.closeSheet();
    expect(session.tutorial.enabled).toBe(true);
    session.returnToMenu();
    expect(session.tutorial.seen.size).toBe(0);
    expect(session.state).toBeNull();
});

test('tile and port lessons return to the inspected object, including full tile identifiers', () => {
    const session = start();
    readDialogue(session);
    const tile = session.state!.board.tiles.find((t) => !t.robber)!;
    session.openSheet({ kind: 'tile', id: tile.id });
    expect(readDialogue(session)).toEqual(['terrain', 'probability']);
    expect(session.sheet).toEqual({ kind: 'tile', id: tile.id });
    const general = session.state!.board.ports.find((p) => p.resource === null)!;
    session.openSheet({ kind: 'port', id: general.id });
    expect(readDialogue(session)).toEqual(['port-general']);
    expect(session.sheet).toEqual({ kind: 'port', id: general.id });
    const specialist = session.state!.board.ports.find((p) => p.resource !== null)!;
    session.openSheet({ kind: 'port', id: specialist.id });
    expect(readDialogue(session)).toEqual(['port-specialist']);
});

test('a new coastal settlement teaches immediate port access through a legal core action', () => {
    const session = start();
    actionPhase(session);
    const state = session.state!;
    state.players[0].resources = { wood: 50, brick: 50, wheat: 50, wool: 50, stone: 50 };
    const port = state.board.ports.find(
        (p) =>
            getPortOwnerId(state.board, p) === null &&
            state.board.edges[p.edgeId].vertexIds.some((id) =>
                state.board.vertices[id].neighborIds.every(
                    (neighbor) => !state.board.vertices[neighbor].building,
                ),
            ),
    )!;
    const vertexId = state.board.edges[port.edgeId].vertexIds.find((id) =>
        state.board.vertices[id].neighborIds.every(
            (neighbor) => !state.board.vertices[neighbor].building,
        ),
    )!;
    // Fixture supplies a connected network at the coast, while placement/payment remain core-validated.
    state.board.edges[port.edgeId].road = { ownerId: state.players[0].id };
    expect(getBuildOption(state, 'settlement').legalTargetIds).toContain(vertexId);
    session.chooseBuild('settlement');
    readDialogue(session);
    session.preview(vertexId);
    readDialogue(session);
    session.primary();
    expect(readDialogue(session)).toContain('port-access');
    expect(getPortOwnerId(session.state!.board, port)).toBe(state.players[0].id);
    expect(session.tutorial.practiced.has('port-access')).toBe(true);
});

test('winning immediately suppresses ordinary build commentary and returns to results', () => {
    const session = start();
    actionPhase(session);
    const state = session.state!;
    // Place existing cities/settlements worth nine points for the finishing action.
    const owned = Object.values(state.board.vertices).filter(
        (v) => v.building?.ownerId === state.players[0].id,
    );
    owned[0].building!.type = 'city';
    const extra = Object.values(state.board.vertices).find(
        (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
    )!;
    extra.building = { type: 'city', ownerId: state.players[0].id };
    for (let n = 0; n < 2; n++) {
        const site = Object.values(state.board.vertices).find(
            (v) => !v.building && v.neighborIds.every((id) => !state.board.vertices[id].building),
        )!;
        site.building = { type: 'city', ownerId: state.players[0].id };
    }
    state.players[0].resources.wheat = 2;
    state.players[0].resources.stone = 3;
    session.chooseBuild('city');
    readDialogue(session);
    session.preview(owned[1].id);
    readDialogue(session);
    session.primary();
    expect(session.state!.phase).toBe('finished');
    expect(readDialogue(session)).toEqual(['victory']);
    expect(session.sheet?.kind).toBe('results');
    const finished = session.state;
    session.closeSheet();
    session.primary();
    expect(session.state).toBe(finished);
});

test('every expression resolves to supplied art and every lesson has a journal replay control', () => {
    const session = start(false);
    session.openSheet({ kind: 'journal' });
    const { body } = sheetContent(session);
    for (const [id, lesson] of Object.entries(LESSONS)) {
        expect(ART[`anahita-${lesson.expression}`].file).toMatch(/^characters\/anahita\//);
        const art = ART[`anahita-${lesson.expression}`];
        expect(art.file).toMatch(/\.webp$/);
        const exported = readFileSync(new URL(`../public/assets/${art.file}`, import.meta.url));
        expect(exported.subarray(0, 4).toString()).toBe('RIFF');
        expect(exported.subarray(8, 12).toString()).toBe('WEBP');
        expect(body).toContain(`data-action="lesson:${id}"`);
    }
    expect(new Set(Object.values(LESSONS).map((lesson) => lesson.expression)).size).toBe(6);
});
