// Synthetic rendering comparison, not a physical phone or Safari benchmark.
// Start npm run browser:dev first. Optional PERFORMANCE_BASELINE_URL compares a prior checkout.
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const profiles = [
    { name: 'budget-720', width: 360, height: 800, dpr: 2, memory: 3, cores: 8, cpu: 6 },
    { name: 'budget-hd', width: 412, height: 915, dpr: 2.625, memory: 4, cores: 8, cpu: 4 },
    { name: 'small-layout', width: 375, height: 667, dpr: 2, cores: 6, cpu: 4 },
    { name: 'unknown-memory-hd', width: 390, height: 844, dpr: 3, cores: 6, cpu: 1 },
    { name: 'ample-hd', width: 412, height: 915, dpr: 2.625, memory: 8, cores: 8, cpu: 1 },
    { name: 'desktop', width: 1440, height: 900, dpr: 1, memory: 8, cores: 8, cpu: 1 },
].filter((profile) => !process.argv[2] || profile.name === process.argv[2]);
if (!profiles.length) throw new Error('Unknown performance profile');
const targets = [['current', process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173']];
if (process.env.PERFORMANCE_BASELINE_URL)
    targets.unshift(['previous', process.env.PERFORMANCE_BASELINE_URL]);
for (const [, url] of targets) {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname))
        throw new Error('Use a local development server with the review fixture enabled');
}
const out = 'output/playwright/performance';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
try {
    for (const profile of profiles) {
        for (const [label, url] of targets) {
            const context = await browser.newContext({
                viewport: { width: profile.width, height: profile.height },
                deviceScaleFactor: profile.dpr,
                hasTouch: profile.name !== 'desktop',
                serviceWorkers: 'block',
            });
            try {
                const page = await context.newPage();
                const errors = [];
                page.on('pageerror', (error) => errors.push(error.message));
                await page.addInitScript(({ memory, cores }) => {
                    Object.defineProperty(navigator, 'deviceMemory', { get: () => memory });
                    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => cores });
                    let seed = 12345;
                    Math.random = () => {
                        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                        return seed / 2 ** 32;
                    };
                }, profile);
                // Test-only access: no debug global is added to the shipped application.
                await page.route('**/src/game/matchRuntime.ts*', async (route) => {
                    const response = await route.fetch();
                    const source = await response.text();
                    if (!source.includes('return game;')) throw new Error('Runtime hook changed');
                    await route.fulfill({
                        response,
                        body: source.replace(
                            'return game;',
                            'globalThis.__benchGame=game;return game;',
                        ),
                    });
                });
                const cdp = await context.newCDPSession(page);
                await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
                await page.goto(`${url}/?review&screen=board`);
                await page.waitForFunction(
                    () => globalThis.sunmarkReview?.ready() && globalThis.__benchGame,
                );
                await page.waitForTimeout(1200);
                const metadata = await page.evaluate(() => {
                    const game = globalThis.__benchGame;
                    const gl = game.renderer.gl;
                    const ext = gl.getExtension('WEBGL_debug_renderer_info');
                    const counts = { frames: [], calls: 0, indices: 0 };
                    globalThis.__benchCounts = counts;
                    for (const method of ['drawElements', 'drawArrays']) {
                        const original = gl[method];
                        gl[method] = function (...args) {
                            counts.calls++;
                            counts.indices += method === 'drawArrays' ? args[2] : args[1];
                            return original.apply(this, args);
                        };
                    }
                    game.events.on('postrender', () => counts.frames.push(performance.now()));
                    return {
                        canvas: [game.canvas.width, game.canvas.height],
                        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
                        textureSourceRGBABytes: Object.values(game.textures.list)
                            .flatMap((texture) => texture.source ?? [])
                            .reduce((sum, source) => sum + source.width * source.height * 4, 0),
                    };
                });
                await page.waitForTimeout(4000);
                const timings = await page.evaluate(() => {
                    const counts = globalThis.__benchCounts;
                    const frames = counts.frames;
                    const intervals = frames
                        .slice(1)
                        .map((time, i) => time - frames[i])
                        .sort((a, b) => a - b);
                    const percentile = (p) =>
                        intervals[Math.ceil(intervals.length * p) - 1] ?? null;
                    return {
                        frames: frames.length,
                        frameP50Ms: percentile(0.5),
                        frameP95Ms: percentile(0.95),
                        callsPerFrame: frames.length ? counts.calls / frames.length : null,
                        submittedIndicesPerFrame: frames.length
                            ? counts.indices / frames.length
                            : null,
                    };
                });
                results.push({ profile, label, ...metadata, ...timings, errors });
                await writeFile(
                    `${out}/results.json`,
                    JSON.stringify(
                        {
                            measuredAt: new Date().toISOString(),
                            browserVersion: browser.version(),
                            limitation:
                                'Synthetic Chromium hints/CPU throttling; not physical RAM, mobile GPU, Safari, or input latency. Texture bytes exclude driver/framebuffers/CPU images.',
                            results,
                        },
                        null,
                        2,
                    ),
                );
                console.log(JSON.stringify(results.at(-1)));
                if (errors.length) throw new Error('Browser errors in performance fixture');
            } finally {
                await context.close();
            }
        }
    }
} finally {
    await browser.close();
}
