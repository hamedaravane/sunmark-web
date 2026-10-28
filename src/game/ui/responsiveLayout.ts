/** CSS-pixel layout shared by the local and online semantic surfaces. */
export function responsiveLayout(width: number, height: number) {
    // Even a small landscape phone has more room beside the board than below it.
    const wide = width >= 560 && width > height;
    const controlsWidth = Math.min(360, Math.max(280, Math.round(width * 0.3)));
    return { wide, controlsWidth };
}
