import type { ResourceType } from '../core/types';
import { FA } from './messages.fa';
import { ART, DICE_FACES, type ArtFrame, type ArtName } from '../assets';
import type { AvatarId } from './playerIdentity';
import { icon } from '../../ui/icons';
import { characterById } from './characters';

export function playerAvatar(avatar: AvatarId): string {
    return `<span class="player-avatar" data-avatar="${avatar}"${characterById(avatar) ? ` data-art="${avatar}-avatar"` : ''} aria-hidden="true"></span>`;
}

export const number = (value: number): string => value.toLocaleString('fa-IR');
export const escape = (text: string): string =>
    text.replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
export const color = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

/** Semantic size placeholder; InterfaceScene draws the actual shared art crop. */
export function frameSprite(art: ArtFrame, width: number, className = ''): string {
    const [, , w, h] = art.frame;
    const scale = width / w;
    const px = (value: number) => `${Number(value.toFixed(3))}px`;
    return `<span aria-hidden="true" class="art-sprite ${escape(className)}" style="width:${px(width)};height:${px(h * scale)}"></span>`;
}

export const artSprite = (name: ArtName, width: number, className = ''): string =>
    frameSprite(ART[name], width, className).replace('<span ', `<span data-art="${name}" `);

export function diceFace(value: number): string {
    const frame = DICE_FACES[value - 1];
    return frame ? `<span class="dice-face" data-dice="${value}" aria-hidden="true"></span>` : '';
}

export function button(
    label: string,
    action: string,
    options: {
        className?: string;
        disabled?: boolean;
        label?: string;
        pressed?: boolean;
        ownerColor?: number;
    } = {},
): string {
    const glyph =
        label === '×' ? 'close' : label === '+' ? 'add' : label === '−' ? 'subtract' : null;
    if (glyph && options.className?.split(' ').includes('icon-button')) label = icon(glyph);
    return `<button type="button" data-action="${escape(action)}" class="${options.className ?? 'button'}"${options.ownerColor !== undefined ? ` style="--owner:${color(options.ownerColor)}"` : ''}${options.disabled ? ' disabled' : ''}${options.label ? ` aria-label="${escape(options.label)}"` : ''}${options.pressed !== undefined ? ` aria-pressed="${options.pressed}"` : ''}>${label}</button>`;
}

/** Reserves the existing responsive resource slot for the shared icon atlas. */
export function resourceIcon(resource: ResourceType): string {
    return `<span class="resource-icon resource-icon--${resource}" aria-hidden="true"></span>`;
}

export function resourceValue(resource: ResourceType, count: number, shortage = 0): string {
    return `<span class="resource-value${shortage ? ' is-short' : ''}" aria-label="${number(count)} ${FA.resources[resource]}${shortage ? `، کمبود ${number(shortage)}` : ''}">${resourceIcon(resource)}<span>${number(count)}</span><span class="sr-only">${FA.resources[resource]}${shortage ? `؛ کمبود ${number(shortage)}` : ''}</span></span>`;
}

/** Measured semantic placeholder; Phaser draws the shared collection artwork. */
export function tradeIcon(width: number): string {
    return `<span class="trade-icon art-sprite" aria-hidden="true" style="width:${width}px;height:${width}px"></span>`;
}
