/** Reserved control-space dimensions, in CSS pixels; never an overlay on the island. */
export function botActivityLayout(width: number, height: number, wide: boolean, desktop: boolean) {
    if (desktop) return { height: 320, portraitWidth: 144 };
    if (wide) return { height: 180, portraitWidth: 100 };
    if (width >= 600) return { height: 156, portraitWidth: 92 };
    if (height < 720) return { height: 92, portraitWidth: 56 };
    return { height: 128, portraitWidth: 72 };
}
