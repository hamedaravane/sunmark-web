import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const label = process.argv[2] || 'cinematic-final';
const baseline = label.includes('before');
const out = `output/playwright/redesign/${label}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const sizes = [
    ['desktop-hd', 1920, 1080],
    ['desktop', 1440, 900],
    ['desktop-small', 1280, 800],
    ['tablet-landscape', 1024, 768],
    ['tablet', 820, 1180],
    ['tablet-small', 768, 1024],
    ['mobile', 390, 844],
    ['mobile-short', 375, 667],
    ['mobile-tall', 430, 932],
    ['phone-landscape', 844, 390],
    ['ultrawide', 2560, 1080],
    ['mobile-tiny', 320, 568],
];
const report = [];
try {
    for (const [name, width, height] of sizes) {
        if (process.argv[3] && name !== process.argv[3]) continue;
        const page = await browser.newPage({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.route('**/api/**', (route) =>
            route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
        );
        await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173', {
            waitUntil: 'networkidle',
        });
        await page.locator('.graphics-ui').waitFor();
        await page.waitForTimeout(400);
        const geometry = await page.locator('.main-menu').evaluate((n) => ({
            height: n.clientHeight,
            content: n.scrollHeight,
            width: n.clientWidth,
            contentWidth: n.scrollWidth,
        }));
        assert(geometry.contentWidth <= geometry.width + 1, `${name}: horizontal overflow`);
        if (!baseline) {
            for (const action of ['play', 'tutorial', 'online', 'account']) {
                const el = page.locator(`.council-play [data-action="${action}"]`);
                const box = await el.boundingBox();
                assert(box && box.height >= 44, `${name}: ${action} touch height`);
                if (height >= 667)
                    assert(
                        box.y >= 0 && box.y + box.height <= height,
                        `${name}: ${action} outside viewport`,
                    );
            }
            const layers = await page
                .locator('.cinematic-world img, .cinematic-ensemble')
                .evaluateAll((imgs) =>
                    imgs.map((img) => ({
                        loaded: img.complete && img.naturalWidth > 0,
                        width: img.naturalWidth,
                        height: img.naturalHeight,
                        rendered:
                            img.getBoundingClientRect().width / img.getBoundingClientRect().height,
                    })),
                );
            assert.equal(layers.length, 4);
            for (const layer of layers) {
                assert(layer.loaded);
                assert(
                    Math.abs(layer.rendered - layer.width / layer.height) < 0.02,
                    `${name}: art distorted`,
                );
            }
        }
        await page.screenshot({ path: `${out}/${name}-menu.png` });
        assert.deepEqual(errors, []);
        report.push({ name, width, height, geometry, errors });
        console.log(`${name}: captured`);
        await page.close();
    }
} finally {
    await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
