import { expect, test } from 'vitest';
import {
    DESKTOP_LAYOUT,
    responsiveLayout,
    responsiveProperties,
} from '../src/game/ui/responsiveLayout';
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
        const boardWidth = layout.desktop
            ? layout.contentWidth - layout.controlsWidth - DESKTOP_LAYOUT.gap
            : availableWidth - layout.controlsWidth;
        const boardHeight = layout.desktop
            ? layout.contentHeight - DESKTOP_LAYOUT.headerHeight - DESKTOP_LAYOUT.gap
            : availableHeight;
        const geometry = matchGeometry(boardWidth, boardHeight, layout.wide, layout.desktop);
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
            expect(point.y).toBeLessThanOrEqual(boardHeight - 19);
        }
        const viewport = { width: boardWidth, height: boardHeight };
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

test.each([
    [1099, 768, false],
    [1100, 699, false],
    [1100, 700, true],
    [1366, 768, true],
    [1920, 1080, true],
    [2560, 1440, true],
    [3840, 2160, true],
    [1024, 1366, false],
])(
    'desktop composition at %i × %i requires room for both legible controls and the island',
    (width, height, desktop) => {
        const layout = responsiveLayout(width, height);
        expect(layout.desktop).toBe(desktop);
        if (!desktop) return;
        expect(layout.contentWidth + DESKTOP_LAYOUT.gutter * 2).toBeLessThanOrEqual(width);
        expect(layout.contentHeight + DESKTOP_LAYOUT.gutter * 2).toBeLessThanOrEqual(height);
        const boardWidth = layout.contentWidth - layout.controlsWidth - DESKTOP_LAYOUT.gap;
        const boardHeight = layout.contentHeight - DESKTOP_LAYOUT.headerHeight - DESKTOP_LAYOUT.gap;
        const { board } = matchGeometry(boardWidth, boardHeight, true, true);
        // A laptop gets a readable island; a 4K screen never gets a giant one.
        expect(board.hexRadius).toBeGreaterThanOrEqual(58);
        expect(board.hexRadius).toBeLessThanOrEqual(66);
        expect(5 * Math.sqrt(3) * board.hexRadius + 80).toBeLessThanOrEqual(boardWidth);
        expect(8 * board.hexRadius + 80).toBeLessThanOrEqual(boardHeight);
        expect(responsiveProperties(layout)['--play-width']).toBe(`${layout.contentWidth}px`);
        expect(layout.controlsWidth).toBe(340);
    },
);

test('maximized and ultrawide desktops keep the same island scale and focus width', () => {
    const layouts = [
        [1920, 1080],
        [3440, 1440],
        [3840, 2160],
    ].map(([w, h]) => responsiveLayout(w, h));
    const radii = layouts.map(
        (layout) =>
            matchGeometry(
                layout.contentWidth - layout.controlsWidth - DESKTOP_LAYOUT.gap,
                layout.contentHeight - DESKTOP_LAYOUT.headerHeight - DESKTOP_LAYOUT.gap,
                true,
                true,
            ).board.hexRadius,
    );
    expect(new Set(radii)).toEqual(new Set([66]));
    expect(new Set(layouts.map((layout) => layout.contentWidth))).toEqual(new Set([1520]));
});
