/** Shared composition limits, in CSS pixels. Large monitors add ocean, not larger hexes. */
export const DESKTOP_LAYOUT = {
    minWidth: 1100,
    minHeight: 700,
    maxWidth: 1520,
    maxHeight: 1040,
    gutter: 24,
    gap: 24,
    headerHeight: 80,
    controlsWidth: 340,
    maxHexRadius: 66,
} as const;

/** CSS-pixel layout shared by the local and online semantic surfaces. */
export function responsiveLayout(width: number, height: number) {
    // Even a small landscape phone has more room beside the board than below it.
    const wide = width >= 560 && width > height;
    const desktop = wide && width >= DESKTOP_LAYOUT.minWidth && height >= DESKTOP_LAYOUT.minHeight;
    const controlsWidth = desktop
        ? DESKTOP_LAYOUT.controlsWidth
        : Math.min(360, Math.max(280, Math.round(width * 0.3)));
    const contentWidth = desktop
        ? Math.min(DESKTOP_LAYOUT.maxWidth, width - DESKTOP_LAYOUT.gutter * 2)
        : width;
    const contentHeight = desktop
        ? Math.min(DESKTOP_LAYOUT.maxHeight, height - DESKTOP_LAYOUT.gutter * 2)
        : height;
    return { wide, desktop, controlsWidth, contentWidth, contentHeight };
}

/** Keep CSS tracks and tested composition dimensions sourced from the same limits. */
export function responsiveProperties(layout: ReturnType<typeof responsiveLayout>) {
    return {
        '--controls-width': `${layout.controlsWidth}px`,
        '--play-width': `${layout.contentWidth}px`,
        '--play-height': `${layout.contentHeight}px`,
        '--play-gap': `${DESKTOP_LAYOUT.gap}px`,
        '--play-header': `${DESKTOP_LAYOUT.headerHeight}px`,
    };
}
