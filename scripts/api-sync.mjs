import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const revision = process.argv[2];
if (!revision || !/^[a-f0-9]{40}$/.test(revision))
    throw new Error('Usage: npm run api:sync -- <full backend commit SHA>');
const root = new URL('../', import.meta.url);
const directory = await mkdtemp(join(tmpdir(), 'sunmark-contract-'));
const paths = {
    'contracts/openapi.json': 'contracts/openapi.json',
    'src/game/protocol.ts': 'src/online/shared/src/game/protocol.ts',
    'src/online/schemas.ts': 'src/online/shared/src/online/schemas.ts',
    'src/online/wire.ts': 'src/online/shared/src/online/wire.ts',
};
try {
    execFileSync('git', ['init', '-q', directory]);
    execFileSync(
        'git',
        [
            '-C',
            directory,
            'fetch',
            '--depth=1',
            'https://github.com/hamedaravane/sunmark-server.git',
            revision,
        ],
        { stdio: 'pipe' },
    );
    const actual = execFileSync('git', ['-C', directory, 'rev-parse', 'FETCH_HEAD'], {
        encoding: 'utf8',
    }).trim();
    if (actual !== revision) throw new Error('Backend commit mismatch');
    const sha256 = {};
    for (const [source, destination] of Object.entries(paths)) {
        const content = execFileSync('git', ['-C', directory, 'show', `${revision}:${source}`]);
        const target = new URL(destination, root);
        await mkdir(new URL('./', target), { recursive: true });
        await writeFile(target, content);
        sha256[destination] = createHash('sha256').update(content).digest('hex');
    }
    await writeFile(
        new URL('contracts/backend.json', root),
        JSON.stringify(
            { repository: 'hamedaravane/sunmark-server', commit: revision, sha256 },
            null,
            2,
        ) + '\n',
    );
    execFileSync(
        process.execPath,
        [
            new URL('../node_modules/openapi-typescript/bin/cli.js', import.meta.url).pathname,
            new URL('contracts/openapi.json', root).pathname,
            '-o',
            new URL('src/online/shared/http.d.ts', root).pathname,
        ],
        { stdio: 'inherit' },
    );
    const { readFile } = await import('node:fs/promises');
    const compose = new URL('compose.yml', root);
    const current = await readFile(compose, 'utf8');
    await writeFile(
        compose,
        current.replace(
            /ghcr\.io\/hamedaravane\/sunmark-server:[a-f0-9]+/g,
            `ghcr.io/hamedaravane/sunmark-server:${revision}`,
        ),
    );
    console.log(`Pinned HTTP and realtime schema source to backend ${revision}`);
} finally {
    await rm(directory, { recursive: true, force: true });
}
