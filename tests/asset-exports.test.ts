import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { ART, DICE_FACES, TEXTURE_FILES } from '../src/game/assets';

interface ExportedAsset {
    file: string;
    source_file?: string;
    preserve_encoded?: boolean;
    size: [number, number];
    source_sha256: string;
    frames: Record<string, [number, number, number, number]>;
}
const manifest = JSON.parse(
    readFileSync(new URL('../scripts/image-exports.json', import.meta.url), 'utf8'),
) as { assets: ExportedAsset[]; references: ExportedAsset[] };

test('runtime images retain verified masters and preserve supplied WebP bytes', () => {
    const runtime = new URL('../public/assets/', import.meta.url);
    const files = readdirSync(runtime, { recursive: true, encoding: 'utf8' })
        .filter((file) => /\.(png|jpe?g|webp|avif)$/i.test(file))
        .sort();
    expect(files).toEqual(manifest.assets.map(({ file }) => file).sort());
    for (const asset of manifest.assets) {
        const output = readFileSync(new URL(asset.file, runtime));
        const master = readFileSync(
            new URL(
                `../art/reference/${asset.source_file ?? asset.file.replace(/\.webp$/, '.png')}`,
                import.meta.url,
            ),
        );
        expect(output.subarray(0, 4).toString()).toBe('RIFF');
        expect(output.subarray(8, 12).toString()).toBe('WEBP');
        if (asset.preserve_encoded) expect(output.equals(master)).toBe(true);
        else expect(output.length).toBeLessThan(master.length);
        expect(createHash('sha256').update(master).digest('hex')).toBe(asset.source_sha256);
        if (!asset.preserve_encoded)
            expect([master.readUInt32BE(16), master.readUInt32BE(20)]).toEqual(asset.size);
    }
});

test('loader textures and atlas crops agree with the verified full-resolution exports', () => {
    const byFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));
    for (const file of Object.values(TEXTURE_FILES)) expect(byFile.has(file)).toBe(true);
    for (const art of [...Object.values(ART), ...DICE_FACES]) {
        const asset = byFile.get(art.file);
        expect(asset).toBeDefined();
        expect(asset!.size).toEqual(art.source);
        const frames = [[0, 0, ...asset!.size], ...Object.values(asset!.frames)];
        expect(frames).toContainEqual(art.frame);
    }
});

test('retired terrain, robber, bank, token, resource and Anahita paintings retain verified masters outside runtime packaging', () => {
    expect(manifest.references).toHaveLength(17);
    for (const asset of manifest.references) {
        const master = readFileSync(
            new URL(
                `../art/reference/${asset.source_file ?? asset.file.replace(/\.webp$/, '.png')}`,
                import.meta.url,
            ),
        );
        expect(createHash('sha256').update(master).digest('hex')).toBe(asset.source_sha256);
        if (!asset.preserve_encoded)
            expect([master.readUInt32BE(16), master.readUInt32BE(20)]).toEqual(asset.size);
        expect(manifest.assets.some((runtime) => runtime.file === asset.file)).toBe(false);
    }
});
