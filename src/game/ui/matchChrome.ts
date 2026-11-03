import type { GameObjects } from 'phaser';
import { drawSurface, type Material, type UiBox } from './graphicsTheme';

export const MATCH_INK = { base: 0x102a30, raised: 0x24464a, edge: 0x58726e, gold: 0xd9b66f };

export function matchFace(
    g: GameObjects.Graphics,
    b: UiBox,
    fill = MATCH_INK.base,
    rim?: number,
    radius = 12,
): void {
    g.fillStyle(fill).fillRoundedRect(b.x, b.y, b.width, b.height, radius);
    if (rim !== undefined)
        g.lineStyle(1.5, rim, 0.8).strokeRoundedRect(
            b.x + 1,
            b.y + 1,
            b.width - 2,
            b.height - 2,
            radius,
        );
}

/** Tool seals and the larger turn seal share craftsmanship, with distinct enamel colors. */
export function dockControl(
    g: GameObjects.Graphics,
    b: UiBox,
    primary: boolean,
    pressed: boolean,
    selected: boolean,
    disabled: boolean,
    tone: Material = 'lapis',
): void {
    const face = primary ? { ...b, x: b.x + 3, width: b.width - 6 } : b;
    drawSurface(
        g,
        face,
        primary ? 'honey' : selected ? 'turquoise' : tone === 'coral' ? 'coral' : 'inset',
        {
            pressed,
            disabled,
            radius: 10,
            accent: selected ? 0xffe6a1 : undefined,
            quiet: !primary,
        },
    );
    if (selected) g.fillStyle(0xffe6a1).fillCircle(b.x + b.width / 2, b.y + b.height - 7, 2);
}
