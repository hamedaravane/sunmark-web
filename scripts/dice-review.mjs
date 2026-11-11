import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = `output/playwright/redesign/${process.argv[2] || 'dice-review'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
try {
    for (const [name, width, height] of [
        ['mobile', 390, 844],
        ['compact', 320, 568],
        ['landscape', 844, 390],
        ['desktop', 1440, 900],
    ]) {
        const page = await browser.newPage({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto('http://127.0.0.1:4173/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => !!globalThis.sunmarkReview);
        const show = async (screen) => {
            await page.evaluate((screen) => globalThis.sunmarkReview.show(screen), screen);
            await page.waitForFunction(() => globalThis.sunmarkReview.ready());
            await page.waitForTimeout(180);
        };
        await show('board');
        const before = await page.locator('.board-viewport').boundingBox();
        await show('roll-only');
        const board = await page.locator('.board-viewport').boundingBox();
        const dice = await page.locator('[data-action=roll-dice]').boundingBox();
        assert(
            Math.abs(dice.x + dice.width / 2 - board.x - board.width / 2) < 1.1,
            `${name}: horizontal center`,
        );
        assert(
            Math.abs(dice.y + dice.height / 2 - board.y - board.height / 2) < 1.1,
            `${name}: vertical center`,
        );
        assert(dice.width >= 48 && dice.height >= 48);
        assert(dice.x >= board.x && dice.x + dice.width <= board.x + board.width + 1);
        assert.deepEqual(board, before, 'The island viewport must not jump with turn state');
        assert.equal(await page.locator('.dock-roll-hint').count(), 0);
        assert.equal(await page.locator('[data-action=roll-dice]').count(), 1);
        await page.screenshot({ path: `${out}/${name}-roll-only.png` });
        const trays = await page
            .locator('.action-dock,.bottom-space,.command-panel')
            .evaluateAll((nodes) =>
                nodes.map((n) => ({
                    name: n.className,
                    display: globalThis.getComputedStyle(n).display,
                    top: n.getBoundingClientRect().top,
                    height: n.getBoundingClientRect().height,
                })),
            );
        // Use the actual pointer hit target; a successful roll removes the CTA.
        await page.locator('[data-action=roll-dice]').click();
        await page.waitForTimeout(100);
        assert.equal(await page.locator('[data-action=roll-dice]').count(), 0);
        await page.screenshot({ path: `${out}/${name}-after-roll.png` });
        await show('roll');
        assert(await page.locator('[data-action="open:development"]').isVisible());
        await page.locator('[data-action="open:development"]').click();
        assert(await page.locator('dialog[open]').count());
        assert.deepEqual(errors, []);
        results.push({
            name,
            board,
            dice,
            trays,
            errors,
            centered: true,
            realRoll: true,
            preRollCards: true,
        });
        console.log(`${name}: centered CTA, stable island, real roll and pre-roll cards passed`);
        await page.close();
    }
    await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2));
} finally {
    await browser.close();
}
