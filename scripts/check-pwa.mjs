import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const directory = path.resolve(process.argv[2] ?? 'dist');
const manifest = JSON.parse(readFileSync(path.join(directory, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(path.join(directory, 'index.html'), 'utf8');
const worker = readFileSync(path.join(directory, 'sw.js'), 'utf8');
const precached = new Set(
    [...worker.matchAll(/url:\s*["']([^"']+)["']/g)].map((match) => match[1]),
);
const productionUrl = 'https://sunmarkgame.top/';
const base = new URL(process.env.PWA_CHECK_BASE ?? productionUrl);
const manifestUrl = new URL('manifest.webmanifest', base);
assert.equal(manifest.name, 'Sunmark');
assert.equal(manifest.short_name, manifest.name);
assert(html.includes(`<title>${manifest.name}</title>`), 'Browser and install titles must match');
assert(html.includes(`name="apple-mobile-web-app-title" content="${manifest.name}"`));
assert(html.includes(`property="og:title" content="${manifest.name}"`));
assert(html.includes(`property="og:description" content="${manifest.description}"`));
assert(html.includes(`property="og:url" content="${productionUrl}"`));
assert(html.includes(`rel="canonical" href="${productionUrl}"`));
assert(
    !/%GAME_(?:NAME|PERSIAN_NAME|DESCRIPTION|URL)%/.test(html),
    'Brand placeholders must be resolved',
);
assert.equal(
    new URL(manifest.scope, manifestUrl).href,
    base.href,
    'Manifest scope must stay within the deployed game',
);
assert.equal(new URL(manifest.start_url, manifestUrl).href, base.href);
assert.equal(
    new URL(manifest.id, base.origin).href,
    new URL('/ancient-persia-game/', base.origin).href,
);
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.lang, 'fa');
assert.equal(manifest.dir, 'rtl');
assert.match(html, /rel="manifest"/);
assert.match(html, /rel="apple-touch-icon"/);
for (const [, location] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (location === productionUrl) continue; // Canonical metadata, not a launch asset.
    const url = new URL(location, base);
    assert.equal(url.origin, base.origin);
    assert(
        url.pathname.startsWith(base.pathname),
        `Launch asset escaped the deployment path: ${location}`,
    );
}
assert.match(worker, /SKIP_WAITING/);
assert.equal(
    [...worker.matchAll(/\bself\.skipWaiting\(\)/g)].length,
    1,
    'Only the requested update may skip waiting',
);
assert.match(
    worker,
    /addEventListener\("message",[^;]{0,150}SKIP_WAITING[^;]{0,150}self\.skipWaiting\(\)/,
);
for (const size of [192, 512])
    assert(
        manifest.icons.some((icon) => icon.sizes === `${size}x${size}` && icon.purpose === 'any'),
    );
assert(manifest.icons.some((icon) => icon.purpose === 'maskable'));
const expected = [
    'index.html',
    'manifest.webmanifest',
    ...readdirSync(path.join(directory, 'assets'), { recursive: true, encoding: 'utf8' })
        .filter((file) => /\.(js|css|webp|woff2)$/.test(file))
        .map((file) => `assets/${file}`),
    ...readdirSync(path.join(directory, 'icons')).map((file) => `icons/${file}`),
];
for (const file of expected) {
    assert(statSync(path.join(directory, file)).isFile());
    assert(precached.has(file), `Missing offline asset: ${file}`);
}
assert.equal(expected.filter((file) => file.startsWith('assets/characters/anahita/')).length, 6);
for (const icon of manifest.icons) {
    const bytes = readFileSync(path.join(directory, icon.src));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
}
console.log(
    `PWA build verified: manifest, icon sizes, scoped URLs, waiting updates, and ${expected.length} offline files.`,
);
