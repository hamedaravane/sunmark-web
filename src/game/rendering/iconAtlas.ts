import type { Scene, GameObjects } from 'phaser';
import { assetUrl } from '../assets';
import { ICON_FILE, ICON_TEXTURE, ICON_NAMES, iconFrame, type IconName } from '../../ui/icons';

export function loadIconAtlas(scene: Scene): void {
    if (!scene.textures.exists(ICON_TEXTURE)) scene.load.svg(ICON_TEXTURE, assetUrl(ICON_FILE));
}

export function installIconFrames(scene: Scene): void {
    const texture = scene.textures.get(ICON_TEXTURE);
    for (const name of ICON_NAMES) {
        if (!texture.has(name)) texture.add(name, 0, ...iconFrame(name));
    }
}

/** Transient effects own these Images through their existing container lifecycle. */
export function iconImage(
    scene: Scene,
    name: IconName,
    x: number,
    y: number,
    size: number,
): GameObjects.Image {
    return scene.add.image(x, y, ICON_TEXTURE, name).setDisplaySize(size, size);
}
