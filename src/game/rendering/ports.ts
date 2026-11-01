import { ICON_TEXTURE } from '../../ui/icons';
import type { GameObjects, Scene } from 'phaser';
import type { Board, Port, TradeRatio } from '../core/types';
import { boardToScreen, type BoardLayout } from '../ui/layout';
import { UI_FONT_FAMILY } from '../ui/typography';
import { createSharpText } from './sharpText';
import { harborArt } from './harborArt';
import { drawVectorArt } from './vectorArt';

// CSS-sized markers stay readable as the island fits short/narrow viewports.
export const PORT_OFFSET = 20;
export const PORT_RADIUS = 16;
export const PORT_TOUCH_RADIUS = 22;

export interface PortLayout {
    x: number;
    y: number;
    access: readonly [{ x: number; y: number }, { x: number; y: number }];
}

/** The coastal edge's sole land tile supplies its exact outward-facing normal. */
export function getPortLayout(board: Board, port: Port, layout: BoardLayout): PortLayout {
    const edge = board.edges[port.edgeId];
    const [a, b] = edge.vertexIds.map((id) => boardToScreen(board.vertices[id], layout));
    const tile = boardToScreen(
        board.tiles.find(({ id }) => id === edge.tileIds[0])!,
        layout,
    );
    const x = (a.x + b.x) / 2,
        y = (a.y + b.y) / 2;
    const dx = x - tile.x,
        dy = y - tile.y,
        length = Math.hypot(dx, dy);
    return {
        x: x + (dx / length) * PORT_OFFSET,
        y: y + (dy / length) * PORT_OFFSET,
        access: [a, b],
    };
}

/** Original stone trading islet. Colors and type labels are entirely runtime data. */
export function createPortMarker(
    scene: Scene,
    port: Port,
    position: PortLayout,
    ratio: TradeRatio,
    ownerColor?: number,
): GameObjects.Container {
    const root = scene.add.container(position.x, position.y);
    const docks = scene.add.graphics();
    for (const point of position.access) {
        const dx = point.x - position.x,
            dy = point.y - position.y,
            length = Math.hypot(dx, dy);
        // Stop short of the coastal intersection so a building stays unobstructed.
        const endX = (dx * Math.max(0, length - 10)) / length;
        const endY = (dy * Math.max(0, length - 10)) / length;
        docks.lineStyle(5, 0x1d3441, 0.8).lineBetween(0, 0, endX, endY);
        docks.lineStyle(3, 0xb79b6d, 0.95).lineBetween(0, 0, endX, endY);
        const dockLength = Math.hypot(endX, endY);
        if (dockLength > 0) {
            const nx = (-endY / dockLength) * 1.5,
                ny = (endX / dockLength) * 1.5;
            for (let step = 5; step < dockLength; step += 3) {
                const px = (endX * step) / dockLength,
                    py = (endY * step) / dockLength;
                docks
                    .lineStyle(0.65, 0x635c43, 0.85)
                    .lineBetween(px - nx, py - ny, px + nx, py + ny);
            }
            docks.fillStyle(0xe6cf9f).fillCircle(endX, endY, 1.7);
        }
    }
    const water = scene.add.ellipse(0, 1, 38, 38, 0x83c6c2, 0.15);
    const shadow = scene.add.ellipse(1, 3, 33, 32, 0x0d2733, 0.4);
    const stone = scene.add.graphics();
    drawVectorArt(stone, harborArt(ownerColor), 0, 0, PORT_RADIUS);
    root.add([water, docks, shadow, stone]);
    root.add(
        scene.add.image(0, -6, ICON_TEXTURE, port.resource ?? 'exchange').setDisplaySize(16, 16),
    );
    root.add(
        createSharpText(scene, 0, 7, `${ratio.toLocaleString('fa-IR')}:۱`, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: 10,
            color: '#fff0cc',
            rtl: false,
        }).setOrigin(0.5),
    );
    return root;
}
