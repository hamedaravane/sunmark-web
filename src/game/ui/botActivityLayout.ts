/** Reserved control-space dimensions, in CSS pixels; never an overlay on the island. */
export function botActivityLayout(width: number, height: number, wide: boolean, desktop: boolean) {
    if (desktop) return { height: 440, portraitWidth: 200 };
    if (wide) return { height: 210, portraitWidth: 100 };
    if (width >= 600) return { height: 204, portraitWidth: 136 };
    if (height < 720) return { height: 84, portraitWidth: 56 };
    return { height: 152, portraitWidth: 100 };
}
