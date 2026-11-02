import type { Scene } from 'phaser';

/** Small cached render-only cutouts work in Canvas/WebGL and inside the sheet's separate mask. */
export function circularAvatarTexture(scene: Scene, texture: string, frame: string): string | null {
    const key = `avatar-circle:${texture}:${frame}`;
    if (scene.textures.exists(key)) return key;
    if (!scene.textures.exists(texture)) return null;
    const source = scene.textures.get(texture);
    if (!source.has(frame)) return null;
    const crop = source.get(frame);
    const canvas = scene.textures.createCanvas(key, 256, 256);
    if (!canvas) return null;
    const context = canvas.context;
    context.save();
    context.clearRect(0, 0, 256, 256);
    context.beginPath();
    context.arc(128, 128, 128, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    context.drawImage(
        source.getSourceImage() as CanvasImageSource,
        crop.cutX,
        crop.cutY,
        crop.cutWidth,
        crop.cutHeight,
        0,
        0,
        256,
        256,
    );
    context.restore();
    canvas.refresh();
    return key;
}
