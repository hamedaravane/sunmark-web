import { ICON_CELL, ICON_COLUMNS, ICON_NAMES, type IconName } from './iconManifest';
export { ICON_CELL, ICON_COLUMNS, ICON_ROWS, ICON_NAMES, type IconName } from './iconManifest';

export const ICON_TEXTURE = 'sunmark-icons';
export const ICON_FILE = 'ui/icons/fluent.svg';
export const RESOURCE_ICONS = ['wood', 'brick', 'wheat', 'wool', 'stone'] as const;

/** Dark silhouette icons keep a light field on lapis as well as parchment. */
export const iconNeedsPlate = (name: IconName): boolean =>
    name === 'profile' || name === 'friends' || name === 'road';

export function isIconName(value: string | undefined): value is IconName {
    return ICON_NAMES.some((name) => name === value);
}

export function iconFrame(name: IconName): readonly [number, number, number, number] {
    const index = ICON_NAMES.indexOf(name);
    return [
        (index % ICON_COLUMNS) * ICON_CELL,
        Math.floor(index / ICON_COLUMNS) * ICON_CELL,
        ICON_CELL,
        ICON_CELL,
    ];
}

/** The same bundled SVG supplies native forms and Phaser; never platform emoji fonts. */
export function icon(name: IconName, size = 24): string {
    const width = Math.round(Math.max(12, Math.min(128, Number.isFinite(size) ? size : 24)));
    return `<span class="game-icon game-icon--${width}" data-icon="${name}" aria-hidden="true"></span>`;
}

const EMBLEMS: Record<string, IconName> = {
    hammer: 'build',
    knight: 'knight',
    'road-building': 'road-building',
    road: 'road',
    monopoly: 'monopoly',
    'year-of-plenty': 'year-of-plenty',
    'victory-point': 'victory-point',
};
export const emblemIcon = (kind: string): IconName => EMBLEMS[kind] ?? 'cards';

/** Compatibility selectors keep existing measured layouts and accessible labels intact. */
export function elementIcon(el: Pick<HTMLElement, 'dataset' | 'classList'>): IconName | null {
    if (isIconName(el.dataset.icon)) return el.dataset.icon;
    const has = (name: string) => el.classList.contains(name);
    if (has('resource-icon')) return RESOURCE_ICONS.find((r) => has(`resource-icon--${r}`)) ?? null;
    if (has('action-emblem')) return emblemIcon(el.dataset.emblem ?? '');
    if (has('development-back')) return 'cards';
    if (has('trade-icon')) return 'trade';
    if (has('menu-gear')) return 'settings';
    if (has('hub-coin')) return 'coins';
    if (has('player-avatar')) return el.dataset.avatar === 'human' ? 'profile' : 'robot';
    if (has('score-symbol')) return 'score';
    if (has('total-symbol')) return 'resources';
    if (has('piece-symbol'))
        return has('piece-symbol--city')
            ? 'city'
            : has('piece-symbol--road')
              ? 'road'
              : 'settlement';
    if (has('port-exchange')) return 'exchange';
    if (has('menu-play-mark')) return 'offline';
    return null;
}
