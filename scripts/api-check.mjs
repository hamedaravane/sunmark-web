import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
const root = new URL('../', import.meta.url);
const metadata = z
    .strictObject({
        repository: z.literal('hamedaravane/sunmark-server'),
        commit: z.string().regex(/^[a-f0-9]{40}$/),
        sha256: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
    })
    .parse(JSON.parse(await readFile(new URL('contracts/backend.json', root), 'utf8')));
const expected = [
    'src/online/shared/src/online/account.schemas.ts',
    'contracts/openapi.json',
    'src/online/shared/src/game/protocol.ts',
    'src/online/shared/src/online/schemas.ts',
    'src/online/shared/src/online/wire.ts',
];
if (JSON.stringify(Object.keys(metadata.sha256).sort()) !== JSON.stringify(expected.sort()))
    throw new Error('Contract provenance file list mismatch');
for (const path of expected) {
    const content = await readFile(new URL(path, root));
    if (createHash('sha256').update(content).digest('hex') !== metadata.sha256[path])
        throw new Error(`Pinned backend contract drift: ${path}`);
}
const compose = await readFile(new URL('compose.yml', root), 'utf8');
if (!compose.includes(`ghcr.io/hamedaravane/sunmark-server:${metadata.commit}`))
    throw new Error('Default backend image does not match the pinned contract revision');
const directory = await mkdtemp(join(tmpdir(), 'sunmark-types-'));
try {
    const output = join(directory, 'http.d.ts');
    execFileSync(
        process.execPath,
        [
            new URL('../node_modules/openapi-typescript/bin/cli.js', import.meta.url).pathname,
            new URL('contracts/openapi.json', root).pathname,
            '-o',
            output,
        ],
        { stdio: 'pipe' },
    );
    if (
        (await readFile(output, 'utf8')) !==
        (await readFile(new URL('src/online/shared/http.d.ts', root), 'utf8'))
    )
        throw new Error('Generated HTTP types are stale; run npm run api:generate');
    console.log(
        `Pinned backend ${metadata.commit}, shared runtime schemas, and generated HTTP types verified`,
    );
} finally {
    await rm(directory, { recursive: true, force: true });
}
