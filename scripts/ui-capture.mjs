import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const cycle = process.argv[2] || 'review';
const selectedViewport = process.argv
    .slice(3)
    .find((arg) => ['mobile', 'tablet', 'desktop'].includes(arg));
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const out = `output/playwright/ui/${cycle}`;
await mkdir(out, { recursive: true });
const report = [];
try {
    for (const [name, width, height] of [
        ['mobile', 390, 844],
        ['tablet', 820, 1180],
        ['desktop', 1440, 900],
    ]) {
        if (selectedViewport && name !== selectedViewport) continue;
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 1,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const shot = async (state) => {
            await page.waitForTimeout(700);
            await page.screenshot({ path: `${out}/${name}-${state}.png`, timeout: 30000 });
        };
        const close = async () => {
            const b = page.locator('dialog[open] [data-action="close-sheet"]').first();
            if (await b.isVisible()) await b.click();
        };
        const lessons = async () => {
            for (let n = 0; n < 12; n++) {
                const b = page.locator('[data-action="tutorial-next"]');
                if (!(await b.isVisible())) break;
                await b.click();
            }
        };
        if (process.argv.includes('--story-only'))
            await page.addInitScript(() =>
                globalThis.localStorage.setItem(
                    'sunmark.experience.v1',
                    JSON.stringify({
                        introduced: true,
                        anahita: false,
                        anahitaChosen: true,
                        rivals: true,
                        rivalsChosen: true,
                    }),
                ),
            );
        await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173', {
            waitUntil: 'networkidle',
        });
        await page.locator('.graphics-ui').waitFor();
        await close();
        await shot('hub');
        if (process.argv.includes('--hub-only')) {
            report.push({
                name,
                errors,
                overflow: await page.evaluate(
                    () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
                ),
                iconWidths: await page
                    .locator('.hub-mode > .game-icon')
                    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width)),
            });
            await context.close();
            continue;
        }
        if (process.argv.includes('--story-only')) {
            await page.locator('[data-action="play"]').click();
            await page.locator('#player-name').fill('آزمایشگر');
            await page.locator('[data-action="confirm-player-name"]').click();
            await page.locator('[data-action="enter-match"]:enabled').waitFor();
            await shot('introduction');
            await page.locator('[data-action="enter-match"]').click();
            await page.locator('[data-action="rival-next"]').waitFor();
            const speakers = new Set();
            for (let n = 0; n < 12; n++) {
                const next = page.locator('[data-action="rival-next"]');
                if (!(await next.isVisible())) break;
                const speaker = await page.locator('dialog[open]').getAttribute('data-portrait');
                if (!speakers.has(speaker)) {
                    await shot(speaker);
                    speakers.add(speaker);
                }
                await next.click();
            }
            assert.deepEqual([...speakers].sort(), [
                'ashi-portrait',
                'mithra-portrait',
                'spenta-armaiti-portrait',
            ]);
            await shot('opening');
            assert.deepEqual(errors, []);
            report.push({ name, errors, speakers: [...speakers] });
            console.log(`${name}: all three rivals spoke`);
            await context.close();
            continue;
        }
        await page.locator('[data-action="play"]').click();
        await shot('name');
        await close();
        await page.locator('[data-action="tutorial"]').click();
        await shot('narration');
        await lessons();
        await shot('roll');
        await page.locator('[data-action="roll-dice"]').click();
        await lessons();
        await shot('board');
        await page.locator('[data-action="open:build"]').click();
        await shot('construction');
        const disclosure = page.locator('dialog[open] .construction-details').first();
        await disclosure.focus();
        await disclosure.press('Enter');
        await page.locator('dialog[open] details[open]').waitFor();
        await shot('construction-details');
        await disclosure.press('Enter');
        await close();
        await page.locator('[data-action="open:help"]').click();
        await shot('pause');
        await close();
        await page.locator('[data-action="open:build"]').click();
        await page.locator('[data-action="build:road"]').click();
        await lessons();
        await page.locator('[data-action="open:targets"]').click();
        await page.locator('[data-action^="preview-target:"]').first().click();
        await page.locator('[data-action="primary"]').click();
        await lessons();
        await page.locator('[data-action="open:trade"]').click();
        await shot('trade');
        await close();
        assert.deepEqual(errors, []);
        report.push({
            name,
            errors,
            overflow: await page.evaluate(
                () => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
            ),
        });
        console.log(`${name}: ${errors.length} errors`);
        await context.close();
    }
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
