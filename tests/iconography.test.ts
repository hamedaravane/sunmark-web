import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Scene } from 'phaser';
import { expect, test, vi } from 'vitest';
import { ICON_SOURCE_SHA256 } from '../src/ui/iconManifest';
import {
    ICON_CELL,
    ICON_COLUMNS,
    ICON_ROWS,
    ICON_NAMES,
    ICON_TEXTURE,
    ICON_FILE,
    icon,
    iconFrame,
    elementIcon,
    type IconName,
} from '../src/ui/icons';
import { loadIconAtlas, installIconFrames } from '../src/game/rendering/iconAtlas';
import { button } from '../src/game/ui/components';

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('scripts/icon-manifest.json')) as Record<string, string>;
const sourceBytes = read('art/reference/icons/fluent-emoji-flat.json');
const source = JSON.parse(sourceBytes) as { icons: Record<string, { body: string }> };
const atlas = read(`public/assets/${ICON_FILE}`);

test('every semantic icon has licensed, local artwork in a unique bounded atlas frame', () => {
    expect(ICON_NAMES).toEqual(Object.keys(manifest));
    expect(createHash('sha256').update(sourceBytes).digest('hex')).toBe(ICON_SOURCE_SHA256);
    expect(read('public/assets/ui/icons/license.txt')).toContain(
        'Copyright (c) Microsoft Corporation.',
    );
    expect(read('public/assets/ui/icons/license.txt')).toContain('MIT License');
    expect(atlas).not.toMatch(/<(?:script|foreignObject|image)\b|(?:href|src)=|\bon\w+=/i);
    expect(atlas).toContain(
        `width="${ICON_COLUMNS * ICON_CELL}" height="${ICON_ROWS * ICON_CELL}"`,
    );
    const frames = new Set<string>();
    for (const name of ICON_NAMES) {
        expect(source.icons[manifest[name]].body).toContain('<');
        expect(atlas).toContain(`id="${name}"`);
        const [x, y, w, h] = iconFrame(name);
        expect(x + w).toBeLessThanOrEqual(ICON_COLUMNS * ICON_CELL);
        expect(y + h).toBeLessThanOrEqual(ICON_ROWS * ICON_CELL);
        expect(frames.has(`${x},${y}`)).toBe(false);
        frames.add(`${x},${y}`);
    }
});

test('the atlas is loaded once per game and named frames are safely reused on scene restart', () => {
    const existing = new Set<string>();
    let cached = false;
    const svg = vi.fn();
    const add = vi.fn((name: string) => existing.add(name));
    const scene = {
        load: { svg },
        textures: {
            exists: () => cached,
            get: () => ({ has: (name: string) => existing.has(name), add }),
        },
    } as unknown as Scene;
    loadIconAtlas(scene);
    expect(svg).toHaveBeenCalledWith(ICON_TEXTURE, expect.stringContaining(`assets/${ICON_FILE}`));
    cached = true;
    loadIconAtlas(scene);
    expect(svg).toHaveBeenCalledOnce();
    installIconFrames(scene);
    installIconFrames(scene);
    expect(add).toHaveBeenCalledTimes(ICON_NAMES.length);
    for (const name of ICON_NAMES) expect(add).toHaveBeenCalledWith(name, 0, ...iconFrame(name));
});

test('measured legacy slots all resolve to the same icon system without browser globals', () => {
    const resolve = (classes: string[], dataset: Record<string, string> = {}) =>
        elementIcon({
            classList: { contains: (value: string) => classes.includes(value) } as DOMTokenList,
            dataset,
        });
    for (const name of ['wood', 'brick', 'wheat', 'wool', 'stone'] as const)
        expect(resolve(['resource-icon', `resource-icon--${name}`])).toBe(name);
    expect(resolve(['action-emblem'], { emblem: 'hammer' })).toBe('build');
    expect(resolve(['development-back'])).toBe('cards');
    expect(resolve(['piece-symbol', 'piece-symbol--city'])).toBe('city');
    expect(resolve(['piece-symbol', 'piece-symbol--settlement'])).toBe('settlement');
    expect(resolve(['piece-symbol', 'piece-symbol--road'])).toBe('road');
    expect(resolve(['player-avatar'], { avatar: 'human' })).toBe('profile');
    for (const avatar of ['atlas', 'asimo', 'sophia'])
        expect(resolve(['player-avatar'], { avatar })).toBe('robot');
    expect(resolve([], { icon: 'unknown' })).toBeNull();
});

test('native icon markup is decorative, bounded, locally hosted, and does not replace accessible button names', () => {
    for (const name of ICON_NAMES) {
        const markup = icon(name);
        expect(markup).toContain(`data-icon="${name}"`);
        expect(markup).toContain('aria-hidden="true"');
        expect(markup).toContain('game-icon--24');
        expect(markup).not.toMatch(/https?:|<img|<svg|style=/);
    }
    expect(icon('close', Number.NaN)).toContain('game-icon--24');
    expect(icon('close', 1000)).toContain('game-icon--128');
    expect(button('×', 'close-sheet', { className: 'icon-button', label: 'بستن پنجره' })).toContain(
        'aria-label="بستن پنجره"',
    );
    for (const [glyph, name] of [
        ['×', 'close'],
        ['+', 'add'],
        ['−', 'subtract'],
    ] as [string, IconName][])
        expect(button(glyph, 'fixture', { className: 'icon-button', label: 'تغییر' })).toContain(
            `data-icon="${name}"`,
        );
    expect(button('constructor', 'player:fixture')).toContain('>constructor</button>');
    expect(button('+', 'player:fixture')).toContain('>+</button>');
});
