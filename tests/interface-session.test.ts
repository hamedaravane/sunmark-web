import { completeSessionSetup } from './helpers/setup';
import { expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { boardToClient, boardToScreen, clientToBoard, fitBoard } from '../src/game/ui/layout';

function fixture() {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(3, false);
    completeSessionSetup(session);
    return session;
}

test('the Graphics target panel previews without paying and confirms through core', () => {
    const session = fixture();
    session.primary();
    session.state!.players[0].resources.wood = 10;
    session.state!.players[0].resources.brick = 10;
    session.chooseBuild('road');
    const target = session.targets[0];
    expect(target).toBeTruthy();
    const before = session.state!;
    const transition = session.transition;
    const historyCount = session.history.length;
    session.openSheet({ kind: 'targets' });
    expect(sheetContent(session).body).toContain(`data-action="preview-target:${target}"`);
    session.chooseTargetFromSheet(target);
    expect(session.sheet).toBeNull();
    expect(session.placement?.targetId).toBe(target);
    expect(session.state).toBe(before);
    expect(session.transition).toBe(transition);
    expect(session.history).toHaveLength(historyCount);
    session.primary();
    expect(session.state!.board.edges[target].road?.ownerId).toBe(before.players[0].id);
    expect(session.state!.players[0].resources).toMatchObject({ wood: 9, brick: 9 });
    expect(before.board.edges[target].road).toBeNull();
});

test('stale or illegal target selections preserve the modal and the required robber move', () => {
    const session = fixture();
    vi.mocked(Math.random).mockReturnValueOnce(0.4).mockReturnValueOnce(0.55);
    session.primary();
    expect(session.state!.phase).toBe('robber');
    const before = session.state!;
    const original = before.board.tiles.find(({ robber }) => robber)!.id;
    session.openSheet({ kind: 'targets' });
    session.chooseTargetFromSheet(original);
    expect(session.sheet).toEqual({ kind: 'targets' });
    expect(session.placement?.targetId).toBeNull();
    const destination = session.targets.find((id) =>
        session
            .state!.board.tiles.find((tile) => tile.id === id)!
            .vertexIds.every((vertexId) => {
                const building = session.state!.board.vertices[vertexId].building;
                return !building || building.ownerId === session.humanPlayer!.id;
            }),
    )!;
    session.chooseTargetFromSheet(destination);
    expect(session.state).toBe(before);
    expect(session.state!.board.tiles.find(({ robber }) => robber)!.id).toBe(original);
    session.primary();
    expect(session.state!.board.tiles.find(({ robber }) => robber)!.id).toBe(destination);
    expect(session.state!.phase).toBe('actions');
    session.openSheet({ kind: 'help' });
    session.chooseTargetFromSheet(destination);
    expect(session.sheet).toEqual({ kind: 'help' });
});

test('the in-game inspection list exposes every full tile id without changing state', () => {
    const session = fixture();
    const before = session.state!;
    const transition = session.transition;
    session.openSheet({ kind: 'inspect' });
    const { body } = sheetContent(session);
    for (const tile of before.board.tiles)
        expect(body).toContain(`data-action="inspect:${tile.id}"`);
    expect(session.state).toBe(before);
    expect(session.transition).toBe(transition);
});

test.each([
    { width: 390, height: 428, left: 0, top: 128, scale: 1 },
    { width: 480, height: 540, left: 300, top: 150, scale: 1 },
    { width: 320, height: 260, left: 20, top: 112, scale: 1.25 },
])('board input and resource flights agree inside an inset camera: %o', (view) => {
    const layout = fitBoard(view.width, view.height);
    const bounds = {
        left: view.left,
        top: view.top,
        width: view.width * view.scale,
        height: view.height * view.scale,
    };
    const tile = { x: Math.sqrt(3), y: 1.5 };
    const client = boardToClient(tile, layout, view, bounds)!;
    const local = clientToBoard(client, view, bounds);
    const expected = boardToScreen(tile, layout);
    expect(local.x).toBeCloseTo(expected.x);
    expect(local.y).toBeCloseTo(expected.y);
    expect(client.x).toBeGreaterThan(bounds.left);
    expect(client.y).toBeGreaterThan(bounds.top);
});
