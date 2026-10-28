import {
    CARD_MATERIAL,
    drawCardFrame,
    drawGear,
    drawMenuCrown,
    drawResourceCell,
    drawWing,
} from './royalArt';
import { drawTradeIcon } from '../rendering/tradeArt';
import { drawActionEmblem, drawDevelopmentBack } from '../rendering/actionArt';
import { SETTLEMENT, CITY } from '../rendering/pieceShapes';
import type { GameObjects } from 'phaser';
import { canvasDisplay } from '../rendering/display';
import { headerBackdrop } from './headerModel';
import { drawPlayerAvatar } from './playerAvatarArt';
import type { AvatarId } from './playerIdentity';
import { dockControl, matchFace, MATCH_INK } from './matchChrome';
import {
    drawDie,
    drawRosette,
    drawSurface,
    UI_INK,
    type Material,
    type UiBox,
} from './graphicsTheme';

export function drawComponent(
    graphics: GameObjects.Graphics,
    el: HTMLElement,
    box: UiBox,
    pressed: Element | null,
): void {
    const g = graphics;
    const has = (name: string) => el.classList.contains(name);
    const ownerValue = parseInt(
        getComputedStyle(el).getPropertyValue('--owner').trim().replace('#', ''),
        16,
    );
    const owner = Number.isFinite(ownerValue) ? ownerValue : UI_INK.gold;
    const disabled = el instanceof HTMLButtonElement && el.disabled;
    const selected = el.getAttribute('aria-pressed') === 'true';
    if (has('action-emblem')) {
        drawActionEmblem(g, box, el.dataset.emblem ?? 'victory-point');
    } else if (has('development-back')) {
        drawDevelopmentBack(g, box, true);
    } else if (has('roll-object')) {
        const cx = box.x + box.width / 2;
        g.fillStyle(0x0a2041, 0.3).fillEllipse(cx, box.y + box.height - 23, box.width - 8, 16);
        // A pair of wing inlays anchors the dice without a modal or solid panel.
        drawWing(g, box.x + 4, box.y + box.height - 24, 13, -1);
        drawWing(g, box.x + box.width - 4, box.y + box.height - 24, 13, 1);
    } else if (
        has('dock-primary') ||
        has('dock-button') ||
        has('dock-cancel') ||
        has('dock-targets') ||
        has('pre-roll-card')
    ) {
        dockControl(
            g,
            box,
            has('dock-primary'),
            pressed === el,
            selected,
            disabled,
            has('dock-build')
                ? 'honey'
                : has('dock-trade')
                  ? 'turquoise'
                  : has('dock-cards') || has('pre-roll-card')
                    ? 'amethyst'
                    : has('dock-cancel')
                      ? 'coral'
                      : 'lapis',
        );
    } else if (has('development-card')) {
        drawCardFrame(
            g,
            box,
            el.querySelector<HTMLElement>('[data-emblem]')?.dataset.emblem ?? '',
            selected,
            pressed === el,
        );
    } else if (has('development-feature') || has('build-goal') || has('development-purchase')) {
        drawSurface(
            g,
            box,
            has('development-feature')
                ? (CARD_MATERIAL[
                      el.querySelector<HTMLElement>('[data-emblem]')?.dataset.emblem ?? ''
                  ] ?? 'amethyst')
                : has('build-goal')
                  ? 'turquoise'
                  : 'inset',
            { quiet: true, radius: 17, accent: has('development-purchase') ? 0xbb94e5 : undefined },
        );
    } else if (has('cost-token')) {
        drawSurface(g, box, has('is-short') ? 'coral' : 'card', {
            flat: true,
            quiet: true,
            radius: 9,
        });
    } else if (has('trade-icon')) {
        drawTradeIcon(g, box, !!el.closest('button:disabled'));
    } else if (has('match-controls') && el.closest('.is-desktop')) {
        drawSurface(g, box, 'inset', { quiet: true, flat: true, radius: 24, accent: 0x527b8b });
    } else if (has('match-controls') && el.closest('.is-wide')) {
        const display = canvasDisplay(g.scene);
        matchFace(
            g,
            { x: box.x, y: box.y, width: display.width - box.x, height: display.height - box.y },
            MATCH_INK.base,
            undefined,
            0,
        );
    } else if (has('match-bar')) {
        const display = canvasDisplay(g.scene);
        if (el.closest('.is-desktop'))
            drawSurface(g, box, 'inset', { quiet: true, flat: true, radius: 20 });
        else
            matchFace(
                g,
                el.closest('.is-wide') ? box : headerBackdrop(box, display.width),
                MATCH_INK.base,
                undefined,
                0,
            );
        g.lineStyle(1, UI_INK.gold, 0.4).lineBetween(
            box.x + 14,
            box.y + box.height - 1,
            box.x + box.width - 14,
            box.y + box.height - 1,
        );
    } else if (has('player-avatar')) {
        drawPlayerAvatar(g, box, el.dataset.avatar as AvatarId, owner);
    } else if (has('header-active')) {
        drawSurface(g, box, 'inset', {
            radius: 16,
            quiet: true,
            flat: true,
            pressed: pressed === el,
            accent: has('is-active') ? owner : undefined,
        });
    } else if (has('captain-score')) {
        drawSurface(g, box, 'honey', { radius: 16, quiet: true, flat: true });
    } else if (has('seat-chip')) {
        drawSurface(g, box, has('is-active') ? 'lapis' : 'inset', {
            quiet: true,
            radius: 13,
            flat: true,
            pressed: pressed === el,
            accent: selected ? UI_INK.gold : owner,
        });
        const target = Number(el.dataset.target) || 10,
            score = Number(el.dataset.score) || 0;
        const spacing = (box.width - 18) / target;
        for (let i = 0; i < target; i++)
            g.fillStyle(i < score ? 0xffcf75 : 0x8594b6, i < score ? 1 : 0.4).fillRoundedRect(
                box.x + box.width - 9 - (i + 1) * spacing,
                box.y + box.height - 6,
                Math.max(1, spacing - 2),
                2,
                1,
            );
    } else if (has('menu-gear')) {
        drawGear(g, box);
    } else if (has('name-entry')) {
        drawSurface(g, box, 'inset', { radius: 8, flat: true });
        if (el.matches(':focus-within')) {
            g.lineStyle(2, UI_INK.gold).strokeRoundedRect(box.x, box.y, box.width, box.height, 8);
            drawNameSelection(g, el, box);
        }
    } else if (has('resource-hand')) {
        if (!el.closest('.is-desktop'))
            drawSurface(g, { ...box, height: box.height + 14 }, 'inset', {
                radius: 24,
                quiet: true,
                accent: 0x7e9dc6,
                flat: true,
            });
    } else if (has('bottom-space')) {
        const display = canvasDisplay(g.scene);
        g.fillStyle(MATCH_INK.base).fillRect(
            el.closest('.is-wide') ? box.x : 0,
            box.y,
            el.closest('.is-wide') ? display.width - box.x : display.width,
            Math.max(0, display.height - box.y),
        );
    } else if (has('action-dock')) {
        if (!el.closest('.is-desktop'))
            g.fillStyle(MATCH_INK.base).fillRect(box.x, box.y, box.width, box.height);
    } else if (has('menu-panel')) {
        drawSurface(g, box, 'inset', { radius: 32, accent: 0xe4b86c });
        for (const direction of [-1, 1])
            drawWing(
                g,
                direction < 0 ? box.x + 15 : box.x + box.width - 15,
                box.y + box.height - 14,
                30,
                -direction,
            );
    } else if (has('menu-crown')) {
        drawMenuCrown(g, box);
    } else if (el.matches('.menu-adventure > span')) {
        drawSurface(g, box, 'lapis', { radius: 20, quiet: true, flat: true });
    } else if (has('menu-play-mark')) {
        g.fillStyle(0xfff0cf)
            .beginPath()
            .moveTo(box.x + 4, box.y + 2)
            .lineTo(box.x + box.width - 2, box.y + box.height / 2)
            .lineTo(box.x + 4, box.y + box.height - 2)
            .closePath()
            .fillPath();
    } else if (has('intro-participant')) {
        drawSurface(g, box, 'inset', { accent: owner, radius: 12, flat: true });
        g.fillStyle(owner).fillRect(box.x + box.width - 3, box.y + 10, 3, box.height - 20);
    } else if (has('player-chip')) {
        drawSurface(g, box, has('is-active') ? 'limestone' : 'card', {
            accent: has('is-active') ? owner : undefined,
            radius: 13,
            flat: true,
            pressed: pressed === el,
        });
        const target = Number(el.dataset.target) || 10;
        const score = Number(el.dataset.score) || 0;
        const spacing = Math.min(10, (box.width - 18) / target);
        for (let i = 0; i < target; i++) {
            g.fillStyle(i < score ? owner : 0x5a5c51).fillRoundedRect(
                box.x + box.width / 2 + (target / 2 - i - 1) * spacing,
                box.y + box.height - 6,
                spacing - 3,
                3,
                1,
            );
        }
        if (has('is-active')) drawRosette(g, box.x + box.width / 2, box.y + 1, 3.5, owner);
    } else if (has('hand-resource')) {
        drawResourceCell(g, box, el.dataset.resource ?? '');
    } else if (has('header-menu')) {
        dockControl(g, box, false, pressed === el, selected, false, 'lapis');
    } else if (has('owner-dot') || has('owner-badge')) {
        drawSurface(g, box, 'inset', {
            radius: has('owner-dot') ? 6 : 14,
            accent: owner,
            flat: true,
        });
        g.fillStyle(owner).fillRoundedRect(
            box.x + 2,
            box.y + 2,
            box.width - 4,
            box.height - 4,
            has('owner-dot') ? 4 : 12,
        );
    } else if (has('dice-total')) {
        // Total sits between the dice and opponents without another nested frame.
    } else if (el.dataset.dice) {
        drawDie(g, box, Number(el.dataset.dice));
    } else if (has('score-symbol')) {
        drawRosette(g, box.x + box.width / 2, box.y + box.height / 2, box.width / 2, 0x8b5229);
    } else if (has('total-symbol')) {
        g.fillStyle(0x51564c, 0.6).fillRoundedRect(
            box.x + 3,
            box.y,
            box.width - 3,
            box.height - 3,
            2,
        );
        g.lineStyle(1, 0x51564c).strokeRoundedRect(
            box.x,
            box.y + 3,
            box.width - 3,
            box.height - 3,
            2,
        );
    } else if (has('deal-summary') || has('deal-offer') || has('deal-hand-item')) {
        drawSurface(g, box, 'inset', {
            radius: 8,
            flat: true,
            accent: has('deal-receipt') ? 0x85948b : undefined,
        });
    } else if (has('build-card') || has('trade-review') || el.matches('.results-list article')) {
        drawSurface(g, box, has('trade-review') ? 'turquoise' : 'card', { radius: 18 });
    } else if (
        has('narrator-heading') ||
        has('narrator-footer') ||
        has('sheet-footer') ||
        has('sheet-context')
    ) {
        const y = has('narrator-heading') ? box.y + box.height : box.y;
        g.lineStyle(1, UI_INK.gold, 0.22).lineBetween(box.x + 22, y, box.x + box.width - 22, y);
    } else if (has('narrator-task')) {
        g.fillStyle(UI_INK.gold, 0.8).fillRoundedRect(
            box.x + box.width - 3,
            box.y + 5,
            2,
            Math.max(2, box.height - 10),
            1,
        );
    } else if (has('turn-receipt') && !el.closest('.placement-guidance, .is-desktop')) {
        drawSurface(g, box, 'card', { radius: 18, quiet: true, flat: true });
    } else if (has('placement-guidance')) {
        if (!el.closest('.is-desktop'))
            drawSurface(g, box, 'card', { radius: 18, quiet: true, flat: true });
    } else if (has('trade-side')) {
        drawSurface(g, box, el.classList.contains('trade-side--give') ? 'coral' : 'turquoise', {
            radius: 18,
            quiet: true,
        });
    } else if (has('score-award')) {
        drawSurface(g, box, 'amethyst', { radius: 15, quiet: true, flat: true });
    } else if (has('victory-art')) {
        const cx = box.x + box.width / 2,
            cy = box.y + box.height / 2;
        g.fillStyle(0x142342, 0.4).fillCircle(cx, cy + 3, 69);
        g.fillStyle(0x247c78).fillCircle(cx, cy, 67);
        g.lineStyle(2, UI_INK.gold).strokeCircle(cx, cy, 65);
        for (const direction of [-1, 1]) drawWing(g, cx + direction * 76, cy, 35, direction);
    } else if (has('sheet-header')) {
        drawSurface(
            g,
            box,
            (el.closest('dialog')?.getAttribute('data-tone') ?? 'lapis') as Material,
            { radius: 24, accent: UI_INK.gold, quiet: true },
        );
        g.fillStyle(UI_INK.gold, 0.7).fillRoundedRect(
            box.x + box.width / 2 - 18,
            box.y + 5,
            36,
            3,
            2,
        );
    } else if (el instanceof HTMLButtonElement || el.tagName === 'SUMMARY') {
        let material: Material = has('button--end-turn')
            ? 'lapis'
            : has('button--primary')
              ? 'honey'
              : 'lapis';
        if (has('button--tutorial') || has('dock-cards') || has('pre-roll-card'))
            material = 'amethyst';
        if (has('button--quiet') || el.tagName === 'SUMMARY') material = 'inset';
        if (has('context-button')) material = 'card';
        if (has('menu-play')) material = 'emerald';
        if (has('resource-choice') || has('port-chip') || has('port-list-item'))
            material = selected ? 'honey' : 'card';
        // Icon artwork stays small inside the full-size semantic touch target.
        const surface = has('icon-button')
            ? {
                  x: box.x + (box.width - 38) / 2,
                  y: box.y + (box.height - 38) / 2,
                  width: 38,
                  height: 38,
              }
            : box;
        drawSurface(g, surface, material, {
            pressed: pressed === el,
            disabled,
            accent: selected
                ? material !== 'inset'
                    ? 0x6d4e2d
                    : UI_INK.gold
                : has('is-owned')
                  ? owner
                  : undefined,
            radius: has('icon-button') ? 13 : 17,
            flat: has('context-button'),
        });
        if (selected)
            drawRosette(g, box.x + 9, box.y + 9, 4, material !== 'inset' ? 0x65543d : UI_INK.gold);
        if (el.tagName === 'SUMMARY') {
            const cx = box.x + 12,
                cy = box.y + box.height / 2;
            const open = (el.parentElement as HTMLDetailsElement).open;
            g.lineStyle(2, UI_INK.gold).beginPath();
            if (open)
                g.moveTo(cx - 3, cy - 2)
                    .lineTo(cx, cy + 2)
                    .lineTo(cx + 3, cy - 2);
            else
                g.moveTo(cx - 3, cy - 3)
                    .lineTo(cx + 3, cy)
                    .lineTo(cx - 3, cy + 3);
            g.strokePath();
        }
    } else if (has('piece-symbol')) {
        drawPieceSymbol(
            g,
            box,
            has('piece-symbol--city') ? 'city' : has('piece-symbol--road') ? 'road' : 'settlement',
        );
    } else if (el.matches('.detail-list > div, .history-list > li')) {
        g.lineStyle(1, 0x656b61, 0.6).lineBetween(
            box.x,
            box.y + box.height - 1,
            box.x + box.width,
            box.y + box.height - 1,
        );
    } else if (el.matches('.help-list > li, .plain-list > li')) {
        drawRosette(g, box.x + box.width + 12, box.y + 13, 4, UI_INK.gold);
    }
    if (el.matches('button:focus-visible, summary:focus-visible'))
        g.lineStyle(
            3,
            !has('button--quiet') &&
                !has('context-button') &&
                el.tagName !== 'SUMMARY' &&
                !has('button--end-turn') &&
                !has('button--tutorial') &&
                !has('roll-object') &&
                !has('development-card') &&
                !has('dock-cards') &&
                !has('pre-roll-card') &&
                !has('dock-button') &&
                !has('dock-cancel') &&
                !has('dock-targets') &&
                !has('header-menu') &&
                !has('header-active') &&
                !has('seat-chip')
                ? 0x314956
                : 0xffedb8,
        ).strokeRoundedRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4, 16);
}

/** Browser ranges retain Persian shaping; Phaser paints the invisible native input's selection. */
function drawNameSelection(g: GameObjects.Graphics, el: HTMLElement, box: UiBox): void {
    const input = el.querySelector('input');
    const text = el.querySelector('.name-entry-value')?.firstChild;
    if (!input || document.activeElement !== input || !text) return;
    const length = text.textContent?.length ?? 0;
    const start = Math.min(input.selectionStart ?? 0, length);
    const end = Math.min(input.selectionEnd ?? start, length);
    const range = document.createRange();
    range.setStart(text, start);
    range.setEnd(text, end);
    const parent = el.getBoundingClientRect();
    const rect = range.getBoundingClientRect();
    const left = Math.max(box.x + 14, box.x + rect.left - parent.left);
    const right = Math.min(box.x + box.width - 14, box.x + rect.right - parent.left);
    const top = rect.height ? box.y + rect.top - parent.top : box.y + 12;
    const height = rect.height || 28;
    if (end > start) {
        if (right > left) g.fillStyle(UI_INK.gold, 0.25).fillRect(left, top, right - left, height);
    } else {
        const x = rect.height ? Math.min(box.x + box.width - 14, left) : box.x + box.width - 14;
        g.lineStyle(1.5, UI_INK.gold).lineBetween(x, top, x, top + height);
    }
}

function drawPieceSymbol(g: GameObjects.Graphics, box: UiBox, kind: string): void {
    const { x, y, width: w, height: h } = box;
    const cx = x + w / 2,
        cy = y + h / 2;
    g.fillStyle(0xb18c56, 0.25).fillEllipse(cx, cy + h * 0.32, w * 0.9, h * 0.25);
    if (kind === 'road') {
        drawSurface(g, { x: x + 2, y: cy - 6, width: w - 4, height: 12 }, 'honey', { radius: 4 });
        g.fillStyle(0x438bff).fillRoundedRect(x + 7, cy - 3, w - 14, 4, 1);
        return;
    }
    const polygon = kind === 'city' ? CITY : SETTLEMENT;
    const scale = (Math.min(w, h) * 0.88) / (kind === 'city' ? 25 : 21);
    const path = (offset: number) => {
        g.beginPath();
        polygon.forEach(([px, py], index) => {
            const dx = cx + px * scale,
                dy = cy + py * scale + offset;
            if (index === 0) g.moveTo(dx, dy);
            else g.lineTo(dx, dy);
        });
        return g.closePath();
    };
    g.fillStyle(0x9e784d);
    path(3).fillPath();
    g.fillStyle(0xffedc8).lineStyle(1, 0xa87543);
    path(0).fillPath().strokePath();
    if (kind === 'city') {
        g.fillStyle(0x438bff)
            .beginPath()
            .moveTo(cx - 9 * scale, cy - 9 * scale)
            .lineTo(cx - 5 * scale, cy - 9 * scale)
            .lineTo(cx - 5 * scale, cy + 5 * scale)
            .lineTo(cx + 9 * scale, cy + 5 * scale)
            .lineTo(cx + 9 * scale, cy + 9 * scale)
            .lineTo(cx - 9 * scale, cy + 9 * scale)
            .closePath()
            .fillPath();
    } else {
        g.fillStyle(0x438bff).fillRoundedRect(
            cx - 6.5 * scale,
            cy - 6 * scale,
            13 * scale,
            12 * scale,
            2,
        );
        g.lineStyle(1, 0x9cc4ff).lineBetween(
            cx - 5 * scale,
            cy - 5 * scale,
            cx + 5 * scale,
            cy - 5 * scale,
        );
    }
}
