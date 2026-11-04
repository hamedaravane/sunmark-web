/** Runtime texture rectangles in image pixels. Original art masters are preserved separately. */
export interface ArtFrame {
    file: string;
    source: readonly [number, number];
    frame: readonly [number, number, number, number];
    clip?: string;
}

export const assetUrl = (file: string): string => `${import.meta.env.BASE_URL}assets/${file}`;

/** Full-image textures without a cropped ART frame. */
export const TEXTURE_FILES = {
    menuBackground: 'backgrounds/main-menu.webp',
} as const satisfies { menuBackground: string };

export const ART = {
    'mithra-avatar': {
        file: 'characters/mithra/avatar.webp',
        source: [1254, 1254],
        frame: [0, 0, 1254, 1254],
    },
    'mithra-portrait': {
        file: 'characters/mithra/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'ashi-avatar': {
        file: 'characters/ashi/avatar.webp',
        source: [1254, 1254],
        frame: [0, 0, 1254, 1254],
    },
    'ashi-portrait': {
        file: 'characters/ashi/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'spenta-armaiti-avatar': {
        file: 'characters/spenta-armaiti/avatar.webp',
        source: [1254, 1254],
        frame: [0, 0, 1254, 1254],
    },
    'spenta-armaiti-portrait': {
        file: 'characters/spenta-armaiti/portrait.webp',
        source: [1122, 1402],
        frame: [0, 0, 1122, 1402],
    },
    'anahita-calm': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'anahita-warning': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'anahita-worried': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'anahita-joyful': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'anahita-playful': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'anahita-explaining': {
        file: 'characters/anahita/portrait.webp',
        source: [1024, 1536],
        frame: [0, 0, 1024, 1536],
    },
    'ahriman-portrait': {
        file: 'characters/ahriman/portrait.webp',
        source: [1122, 1402],
        frame: [0, 0, 1122, 1402],
    },
    corner: {
        file: 'ui/ornaments/ornaments.webp',
        source: [1254, 1254],
        frame: [35, 390, 380, 400],
    },
    divider: {
        file: 'ui/ornaments/ornaments.webp',
        source: [1254, 1254],
        frame: [385, 575, 485, 110],
    },
    rosette: {
        file: 'ui/ornaments/ornaments.webp',
        source: [1254, 1254],
        frame: [930, 480, 310, 310],
    },
    victory: { file: 'ui/emblems/victory.webp', source: [1254, 1254], frame: [40, 50, 1175, 1135] },
    spark: { file: 'effects/spark.webp', source: [1283, 1226], frame: [0, 0, 1283, 1226] },
    glint: { file: 'effects/glint.webp', source: [1278, 1230], frame: [0, 0, 1278, 1230] },
    dust: { file: 'effects/dust.webp', source: [1254, 1254], frame: [125, 210, 1010, 850] },
} as const satisfies Record<string, ArtFrame>;

export type ArtName = keyof typeof ART;

// The supplied RGB sheet contains a baked checkerboard. Clip inside the painted
// silhouette instead of treating the background as alpha or altering the source.
const DICE_CLIP =
    'polygon(4% 26%, 7% 19%, 21% 8%, 29% 4%, 36% 3%, 75% 4%, 92% 7%, 96% 11%, 97% 17%, 96% 62%, 94% 70%, 90% 76%, 84% 80%, 80% 84%, 78% 90%, 74% 94%, 68% 95%, 12% 92%, 6% 88%, 4% 82%)';
export const DICE_FACES: readonly ArtFrame[] = [
    [96, 80],
    [590, 80],
    [1084, 80],
    [96, 542],
    [590, 542],
    [1084, 542],
].map(([x, y]) => ({
    file: 'dice/faces.webp',
    source: [1536, 1024],
    frame: [x, y, 344, 346],
    clip: DICE_CLIP,
}));
