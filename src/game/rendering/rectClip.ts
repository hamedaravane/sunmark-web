import type { GameObjects } from 'phaser';
import type { UiBox } from '../ui/graphicsTheme';

/** Axis-aligned UI clipping through Phaser 4's batched DrawingContext state.
 * Shares the destination framebuffer instead of allocating filter surfaces.
 * Intended for untransformed containers in the full-shell UI camera only.
 */
export function rectangularClip(container: GameObjects.Container): (box: UiBox | null) => void {
    let clip: UiBox | null = null;
    const render = container.renderWebGLStep;
    container.renderWebGLStep = function (renderer, object, context, ...rest): void {
        if (!clip) {
            render.call(this, renderer, object, context, ...rest);
            return;
        }
        const camera = context.camera;
        if (!camera) {
            render.call(this, renderer, object, context, ...rest);
            return;
        }
        const x =
            camera.x +
            camera.width / 2 +
            (clip.x - camera.scrollX - camera.width / 2) * camera.zoomX;
        const y =
            camera.y +
            camera.height / 2 +
            (clip.y - camera.scrollY - camera.height / 2) * camera.zoomY;
        const previous = context.state.scissor;
        const box =
            previous && 'box' in previous && Array.isArray(previous.box) ? previous.box : [];
        const numbers = box.filter((v: unknown): v is number => typeof v === 'number');
        const enabled =
            previous &&
            'enable' in previous &&
            previous.enable === true &&
            box.length === 4 &&
            numbers.length === 4;
        const [sx = 0, sy = 0, sw = context.width, sh = context.height] = numbers;
        const left = Math.max(Math.floor(x), enabled ? sx : 0);
        const top = Math.max(Math.floor(y), enabled ? context.height - sy - sh : 0);
        const right = Math.min(
            Math.ceil(x + clip.width * camera.zoomX),
            enabled ? sx + sw : context.width,
        );
        const bottom = Math.min(
            Math.ceil(y + clip.height * camera.zoomY),
            enabled ? context.height - sy : context.height,
        );
        if (right <= left || bottom <= top) return;
        const clipped = context.getClone();
        clipped.setScissorEnable(true);
        clipped.setScissorBox(left, top, right - left, bottom - top);
        clipped.use(); // Flush before changing scissor state.
        try {
            render.call(this, renderer, object, clipped, ...rest);
        } finally {
            clipped.release(); // Flush clipped geometry before restoring the parent.
            context.use();
        }
    };
    return (box) => {
        clip = box;
    };
}
