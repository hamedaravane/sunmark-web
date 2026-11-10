export interface DisplaySize {
    width: number;
    height: number;
}

export interface DisplayMetrics extends DisplaySize {
    pixelWidth: number;
    pixelHeight: number;
}

/** Bound fill rate while retaining native density on typical 2×/3× phones. */
export function canvasPixelSize(
    width: number,
    height: number,
    deviceRatio: number,
    pixelBudget = 4_000_000,
): DisplaySize {
    width = Math.max(1, width);
    height = Math.max(1, height);
    const ratio = Math.min(
        Math.max(1, Number.isFinite(deviceRatio) ? deviceRatio : 1),
        3,
        Math.sqrt(
            (Number.isFinite(pixelBudget) && pixelBudget > 0 ? pixelBudget : 4_000_000) /
                (width * height),
        ),
    );
    return {
        width: Math.max(1, Math.floor(width * ratio)),
        height: Math.max(1, Math.floor(height * ratio)),
    };
}

/** Phaser viewports are backing pixels; game/layout coordinates remain CSS pixels. */
export function cameraProjection(
    display: DisplayMetrics,
    viewport = { x: 0, y: 0, width: display.width, height: display.height },
) {
    const ratioX = display.pixelWidth / display.width;
    const ratioY = display.pixelHeight / display.height;
    const x = Math.round(viewport.x * ratioX);
    const y = Math.round(viewport.y * ratioY);
    const width = Math.max(1, Math.round((viewport.x + viewport.width) * ratioX) - x);
    const height = Math.max(1, Math.round((viewport.y + viewport.height) * ratioY) - y);
    return {
        x,
        y,
        width,
        height,
        zoomX: width / viewport.width,
        zoomY: height / viewport.height,
        // Keep the default center origin, including Phaser's world-view culling math.
        scrollX: (viewport.width - width) / 2,
        scrollY: (viewport.height - height) / 2,
    };
}
