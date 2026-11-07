import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = `output/playwright/${process.argv[2] || 'menu-compact-v3'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = [];
try {
    for (const [name, width, height] of [
        ['mobile', 390, 844],
        ['small-mobile', 360, 640],
        ['short-mobile', 320, 568],
        ['tablet', 820, 1180],
        ['desktop', 1440, 900],
    ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        await context.route('**/api/**', (r) =>
            r.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
        );
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' });
        await page.locator('.graphics-ui').waitFor();
        await page.waitForTimeout(1000);
        const geometry = await page.locator('.main-menu').evaluate((n) => ({
            height: n.clientHeight,
            content: n.scrollHeight,
            width: n.clientWidth,
            contentWidth: n.scrollWidth,
        }));
        assert(
            geometry.content <= geometry.height + 1,
            `${name} scrolls: ${JSON.stringify(geometry)}`,
        );
        for (const action of ['play', 'tutorial', 'online', 'account']) {
            const box = await page.locator(`.council-play [data-action="${action}"]`).boundingBox();
            assert(
                box && box.y >= 0 && box.y + box.height <= height,
                `${name}: ${action} outside viewport`,
            );
            assert(box.height >= 44);
        }
        await page.screenshot({ path: `${out}/${name}-menu.png` });
        await page.locator('.title-more > summary').click();
        assert(await page.locator('.title-more [data-action="analytics-settings"]').isVisible());
        await page.screenshot({ path: `${out}/${name}-more.png` });
        assert.deepEqual(errors, []);
        report.push({ name, width, height, geometry, errors });
        console.log(`${name}: four actions visible, no menu scroll`);
        await context.close();
    }
} finally {
    await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
