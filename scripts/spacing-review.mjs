import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = `output/playwright/redesign/${process.env.SPACING_LABEL || 'spacing-verified'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = [];
try {
    for (const [device, width, height] of [
        ['mobile', 390, 844],
        ['tablet', 820, 1180],
        ['desktop', 1440, 900],
    ]) {
        if (process.argv[2] && process.argv[2] !== device) continue;
        const page = await browser.newPage({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('http://127.0.0.1:4173/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => globalThis.sunmarkReview);
        const show = async (name) => {
            await page.evaluate((name) => globalThis.sunmarkReview.show(name), name);
            await page.waitForFunction(() => globalThis.sunmarkReview.ready());
        };
        const shot = async (name) => {
            await page.waitForTimeout(200);
            await page.screenshot({ path: `${out}/${device}-${name}.png` });
        };
        await show('bot');
        await page.locator('[data-action="bot-step"]').click();
        await shot('receipt');
        if (device === 'desktop') {
            const b = await page.locator('.header-menu').boundingBox();
            const seats = await page.locator('.header-seats').boundingBox();
            assert(b.x + b.width <= seats.x, 'menu must sit outside standings');
            const nav = await page.locator('.desktop-shortcuts').boundingBox();
            for (const button of await page.locator('.desktop-shortcuts button:visible').all()) {
                const box = await button.boundingBox();
                assert(Math.abs(box.width - nav.width) < 2, 'shortcut full width');
            }
            const context = page.locator('.context-line .context-button');
            if (await context.count()) {
                const box = await context.boundingBox();
                const rail = await page.locator('.context-line').boundingBox();
                assert(Math.abs(box.width - rail.width) < 2);
                assert(box.height < 160, 'receipt must follow text height');
            }
        }
        await show('build');
        const buttons = await page
            .locator('.construction-card:visible .construction-actions button')
            .all();
        const boxes = await Promise.all(buttons.map((b) => b.boundingBox()));
        if (device !== 'mobile') {
            assert(
                Math.max(...boxes.map((b) => b.y)) - Math.min(...boxes.map((b) => b.y)) < 2,
                'construction actions align',
            );
            const cards = await page
                .locator('.construction-card:visible')
                .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().height));
            assert(Math.max(...cards) - Math.min(...cards) < 2, 'cards equal height');
        }
        const dialog = await page.locator('dialog[open]').boundingBox();
        if (device === 'desktop') assert(dialog.height < 650, 'construction should fit content');
        await shot('construction');
        await show('domestic');
        await page.locator('[data-action="deal-adjust:give:wood:1"]').scrollIntoViewIfNeeded();
        const pairs = await page.locator('.deal-counter').evaluateAll((ns) =>
            ns.map((n) => {
                const [minus, , plus] = n.children;
                const a = minus.getBoundingClientRect(),
                    b = plus.getBoundingClientRect();
                return { gap: b.left - a.right, width: a.width };
            }),
        );
        assert(pairs.every((p) => p.gap >= 8 && p.width >= 44));
        await shot('trade-editor');
        await page.locator('[data-action="deal-adjust:give:wood:1"]').click();
        await page.locator('[data-action="deal-adjust:want:brick:1"]').click();
        await page.locator('[data-action="deal-send"]').click();
        assert((await page.locator('.deal-offer').count()) > 0);
        await shot('offer-sent');
        await show('deal-confirm');
        await shot('trade-confirm');
        const finish = page.locator('[data-action^="deal-finish:"]');
        await page.waitForTimeout(350); // Respect the existing final-confirmation guard.
        await finish.click();
        await finish.waitFor({ state: 'hidden' });
        await shot('trade-complete');
        assert.deepEqual(errors, []);
        report.push({
            device,
            errors,
            checks: [
                'header',
                'receipt',
                'full-width shortcuts',
                'equal construction cards',
                'counter gaps',
                'send offer',
                'final exchange',
            ],
        });
        console.log(`${device}: spacing and interaction checks passed`);
        await page.close();
    }
} finally {
    await browser.close();
}
await writeFile(
    `${out}/${process.argv[2] ? 'report-refinements' : 'report'}.json`,
    JSON.stringify(report, null, 2),
);
