import { expect, test } from 'vitest';
import { RenderQuality, renderingProfile } from '../src/game/rendering/renderQuality';
import { canvasPixelSize } from '../src/game/rendering/displayGeometry';

test('three and four GB phones receive a bounded starting budget before the first frame', () => {
    const profile = renderingProfile({ handheld: true, memoryGB: 4, logicalCores: 8 });
    expect(profile.decorativeMotion).toBe(false);
    expect(renderingProfile({ handheld: true, memoryGB: 3, logicalCores: 8 })).toEqual(profile);
    const pixels = canvasPixelSize(
        412,
        915,
        Math.min(2.625, profile.densityCap),
        profile.pixelBudget,
    );
    expect(pixels.width * pixels.height).toBeLessThanOrEqual(1_000_000);
    expect(pixels.width).toBeGreaterThan(412);
});

test('missing Safari memory hints are handled conservatively without excluding the browser', () => {
    const profile = renderingProfile({ handheld: true, logicalCores: 6 });
    expect(profile.densityCap).toBe(2);
    expect(profile.pixelBudget).toBe(2_000_000);
});

test('low core count is sufficient when memory is unavailable; invalid hints are ignored', () => {
    expect(renderingProfile({ handheld: true, logicalCores: 4 }).decorativeMotion).toBe(false);
    expect(renderingProfile({ handheld: true, memoryGB: NaN, logicalCores: 0 }).densityCap).toBe(2);
    expect(
        renderingProfile({ handheld: true, memoryGB: Infinity, logicalCores: Infinity }).densityCap,
    ).toBe(2);
});

test('strong hints retain high detail and desktop retains its existing pixel budget', () => {
    expect(renderingProfile({ handheld: true, memoryGB: 8, logicalCores: 8 }).densityCap).toBe(3);
    expect(renderingProfile({ handheld: false }).pixelBudget).toBe(4_000_000);
});

test('smooth 30 Hz frames and resume gaps retain density', () => {
    const q = new RenderQuality();
    for (let i = 0; i < 300; i++) q.sample(1000 / 30);
    for (let i = 0; i < 89; i++) q.sample(40);
    q.sample(2000);
    expect(q.sample(40)).toBe(false);
    expect(q.cap).toBe(3);
});

test('sustained slow frames progressively lower density through a one-times floor', () => {
    const q = new RenderQuality();
    for (const expected of [2, 1.5, 1.25, 1]) {
        for (let i = 0; i < 89; i++) expect(q.sample(40)).toBe(false);
        expect(q.sample(40)).toBe(true);
        expect(q.cap).toBe(expected);
    }
    for (let i = 0; i < 180; i++) expect(q.sample(40)).toBe(false);
    expect(q.decorativeMotion).toBe(false);
});

test('occasional interaction spikes do not lower density', () => {
    const q = new RenderQuality();
    for (let i = 0; i < 180; i++) q.sample(i % 10 === 0 ? 150 : 16.7);
    expect(q.cap).toBe(3);
});
