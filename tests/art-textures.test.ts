import { expect, test } from 'vitest';
import { artTextureKey, artFrameKey } from '../src/game/rendering/artTextures';
import { ART } from '../src/game/assets';

test('all art aliases share their file source without merging their crop frames', () => {
    const names = Object.keys(ART);
    for (const a of names)
        for (const b of names) {
            const file = (name: string) =>
                Object.entries(ART).find(([key]) => key === name)?.[1].file;
            expect(artTextureKey(a) === artTextureKey(b)).toBe(file(a) === file(b));
            expect(artFrameKey(a) === artFrameKey(b)).toBe(a === b);
        }
});
