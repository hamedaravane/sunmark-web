import type { GameObjects } from 'phaser';
import { drawSurface, UI_INK, type Material, type UiBox } from './graphicsTheme';

export const RESOURCE_MATERIAL: Record<string, Material> = {
    wood: 'emerald',
    brick: 'coral',
    wheat: 'honey',
    wool: 'turquoise',
    stone: 'lapis',
};
export const CARD_MATERIAL: Record<string, Material> = {
    knight: 'coral',
    'victory-point': 'amethyst',
    'road-building': 'turquoise',
    monopoly: 'lapis',
    'year-of-plenty': 'emerald',
};

/** Wing-like stepped inlays borrow palace geometry, never religious/Islamic ornament. */
export function drawWing(
    g: GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    direction: number,
    color = UI_INK.gold,
): void {
    for (let i = 0; i < 3; i++) {
        g.lineStyle(1.4, color, 0.7 - i * 0.13)
            .beginPath()
            .moveTo(x, y + i * 4)
            .lineTo(x + direction * (size - i * 5), y + i * 4)
            .lineTo(x + direction * (size - i * 5 + 5), y + i * 4 - 5)
            .strokePath();
    }
}

export function drawResourceCell(g: GameObjects.Graphics, b: UiBox, resource: string): void {
    drawSurface(g, b, 'inset', { radius: 8, quiet: true, flat: true });
    const colors: Record<string, number> = {
        wood: 0x74a87f,
        brick: 0xcd8e77,
        wheat: 0xd9b66f,
        wool: 0x76b5b3,
        stone: 0xa6b7c5,
    };
    g.fillStyle(colors[resource] ?? 0xd9b66f, 0.75).fillRoundedRect(
        b.x + 8,
        b.y + b.height - 3,
        b.width - 16,
        2,
        1,
    );
}

export function drawCardFrame(
    g: GameObjects.Graphics,
    b: UiBox,
    kind: string,
    selected: boolean,
    pressed: boolean,
): void {
    drawSurface(g, b, selected ? (CARD_MATERIAL[kind] ?? 'turquoise') : 'inset', {
        radius: 10,
        pressed,
        quiet: true,
        flat: true,
        accent: selected ? UI_INK.gold : undefined,
    });
}

export function drawMenuCrown(g: GameObjects.Graphics, b: UiBox): void {
    const cx = b.x + b.width / 2,
        cy = b.y + b.height / 2;
    const r = Math.min(48, b.height / 2 - 2);
    g.fillStyle(0x132346, 0.5).fillCircle(cx, cy + 4, r);
    g.fillStyle(0x247e87).fillCircle(cx, cy, r);
    g.lineStyle(3, 0xffcf75).strokeCircle(cx, cy, r - 2);
    g.lineStyle(1, 0x9cf1db, 0.7).strokeCircle(cx, cy, r - 8);
    drawWing(g, cx - r - 7, cy, Math.max(10, (b.width - r * 2) / 2 - 15), -1);
    drawWing(g, cx + r + 7, cy, Math.max(10, (b.width - r * 2) / 2 - 15), 1);
}

export function drawGear(g: GameObjects.Graphics, b: UiBox): void {
    const x = b.x + b.width / 2,
        y = b.y + b.height / 2;
    for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.lineStyle(4, 0xfff0ce).lineBetween(
            x + Math.cos(a) * 6,
            y + Math.sin(a) * 6,
            x + Math.cos(a) * 9,
            y + Math.sin(a) * 9,
        );
    }
    g.lineStyle(4, 0xfff0ce).strokeCircle(x, y, 6);
    g.fillStyle(0x35588f).fillCircle(x, y, 3);
}
