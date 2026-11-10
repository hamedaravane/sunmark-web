import type { Scene } from 'phaser';
import { ART } from '../assets';

const keys = new Map<string, string>();
const files = new Map<string, string>();
for (const [name, art] of Object.entries(ART)) {
    const key = files.get(art.file) ?? `ui-${name}`;
    files.set(art.file, key);
    keys.set(name, key);
}
export const artTextureKey = (name: string): string => keys.get(name) ?? `ui-${name}`;
export const artFrameKey = (name: string): string => `crop:${name}`;

/** Multiple named art frames share one GPU source, including narrator aliases. */
export function installArtFrames(scene: Scene): void {
    for (const [name, art] of Object.entries(ART)) {
        const key = artTextureKey(name);
        if (!scene.textures.exists(key)) continue;
        const texture = scene.textures.get(key);
        const [x, y, w, h] = art.frame;
        if (!texture.has(artFrameKey(name))) texture.add(artFrameKey(name), 0, x, y, w, h);
        // Existing effects use the canonical source's crop.
        if (!texture.has('crop')) texture.add('crop', 0, x, y, w, h);
    }
}
