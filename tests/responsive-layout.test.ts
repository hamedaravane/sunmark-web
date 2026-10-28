import { expect, test } from 'vitest';
import { responsiveLayout } from '../src/game/ui/responsiveLayout';
import { matchGeometry } from '../src/game/ui/matchGeometry';
import { boardToClient, boardToScreen, clientToBoard } from '../src/game/ui/layout';
import { createBoard } from '../src/game/core/board';
import { getPortLayout } from '../src/game/rendering/ports';

test.each([
    [320, 568, false],
    [390, 844, false],
    [768, 1024, false],
    [1024, 1366, false],
    [559, 320, false],
    [560, 320, true],
    [844, 390, true],
    [1024, 768, true],
    [1366, 1024, true],
    [1920, 1080, true],
])('viewport %i × %i chooses a usable control layout', (width, height, wide) => {
    const layout = responsiveLayout(width, height);
    expect(layout.wide).toBe(wide);
    if (wide) {
        expect(layout.controlsWidth).toBeGreaterThanOrEqual(280);
        expect(layout.controlsWidth).toBeLessThanOrEqual(360);
        expect(width - layout.controlsWidth).toBeGreaterThanOrEqual(280);
    }
});

test.each([
    [560, 320, 0, 0],
    [844, 390, 88, 21], // Landscape phone safe areas.
    [1024, 768, 0, 20],
    [1366, 1024, 0, 24],
    [1920, 1080, 0, 0],
])(
    'landscape %i × %i keeps every port, the full island and input coordinates inside the board',
    (width, height, horizontalInsets, bottomInset) => {
        const availableWidth = width - horizontalInsets;
        const availableHeight = height - bottomInset;
        const layout = responsiveLayout(availableWidth, availableHeight);
        expect(layout.wide).toBe(true);
        const boardWidth = availableWidth - layout.controlsWidth;
        const geometry = matchGeometry(boardWidth, availableHeight, layout.wide);
        // The rail owns dice even on short landscape phones, so no land height is lost.
        expect(geometry.seaBand).toBe(0);
        expect(geometry.diceOnLedge).toBe(false);
        expect(geometry.board.hexRadius).toBeGreaterThanOrEqual(23);
        const board = createBoard(() => 0.5);
        for (const port of board.ports) {
            const point = getPortLayout(board, port, geometry.board);
            expect(point.x).toBeGreaterThanOrEqual(19);
            expect(point.x).toBeLessThanOrEqual(boardWidth - 19);
            expect(point.y).toBeGreaterThanOrEqual(19);
            expect(point.y).toBeLessThanOrEqual(availableHeight - 19);
        }
        const viewport = { width: boardWidth, height: availableHeight };
        const bounds = { left: horizontalInsets / 2, top: 0, ...viewport };
        for (const vertex of Object.values(board.vertices)) {
            const screen = boardToScreen(vertex, geometry.board);
            const client = boardToClient(vertex, geometry.board, viewport, bounds);
            expect(client).not.toBeNull();
            const target = clientToBoard(client!, viewport, bounds);
            expect(target.x).toBeCloseTo(screen.x);
            expect(target.y).toBeCloseTo(screen.y);
        }
    },
);

test('portrait tablets use their additional width for a larger board', () => {
    const phone = matchGeometry(390, 516);
    const tablet = matchGeometry(768, 702);
    expect(tablet.board.hexRadius).toBeGreaterThan(phone.board.hexRadius * 1.5);
    expect(tablet.seaBand).toBe(104);
    expect(tablet.diceOnLedge).toBe(false);
});
