import type { Scene } from 'phaser';
import { NUMBER_TOKEN_ART } from './boardEmblems';
import { harborArt } from './harborArt';
import { drawVectorArt } from './vectorArt';

export const NUMBER_PLATE_KEY = 'cached-number-plate';
export const NUMBER_PLATE_RADIUS = 78;
export const NEUTRAL_PORT_KEY = 'cached-neutral-port';
export const NEUTRAL_PORT_RADIUS = 48;

/** Two small immutable surfaces replace repeated path triangulation every frame.
 * Persian digits stay runtime Text. Owned port trim stays runtime Graphics;
 * no player-color texture variants or additional downloaded artwork are created.
 */
export function ensureBoardMarkerTextures(scene: Scene): void {
    if (scene.textures.exists(NUMBER_PLATE_KEY) && scene.textures.exists(NEUTRAL_PORT_KEY)) return;
    const graphics = scene.make.graphics({}, false);
    try {
        if (!scene.textures.exists(NUMBER_PLATE_KEY)) {
            drawVectorArt(graphics, NUMBER_TOKEN_ART, 96, 96, NUMBER_PLATE_RADIUS);
            graphics.generateTexture(NUMBER_PLATE_KEY, 192, 192);
        }
        if (!scene.textures.exists(NEUTRAL_PORT_KEY)) {
            graphics.clear();
            drawVectorArt(graphics, harborArt(), 64, 64, NEUTRAL_PORT_RADIUS);
            graphics.generateTexture(NEUTRAL_PORT_KEY, 128, 128);
        }
    } finally {
        graphics.destroy();
    }
}
