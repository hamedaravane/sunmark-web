/** Sunmark's shared colors, consumed by both Phaser materials and native UI. */
export const SUNMARK = {
    'deep-teal': 0x123638,
    surface: 0x204d50,
    gold: 0xddb874,
    'gold-dark': 0xa87a36,
    ivory: 0xf3e8cf,
    ink: 0x11282e,
    turquoise: 0x46c4c5,
    focus: 0x86eded,
    muted: 0xbfceca,
    edge: 0x62817a,
    lapis: 0x284d7b,
} as const;

export function applySunmarkPalette(): void {
    for (const [name, value] of Object.entries(SUNMARK))
        document.documentElement.style.setProperty(
            `--sm-${name}`,
            `#${value.toString(16).padStart(6, '0')}`,
        );
}
