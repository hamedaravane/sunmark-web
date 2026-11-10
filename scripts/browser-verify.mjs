import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const executablePath =
    process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
    (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const output = resolve('output/playwright');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
    const report = [];
    for (const viewport of [
        { width: 390, height: 844 },
        { width: 1440, height: 900 },
    ]) {
        const context = await browser.newContext({
            viewport,
            deviceScaleFactor: 1,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(baseURL, { waitUntil: 'networkidle' });
        await page.locator('.graphics-ui canvas').first().waitFor();
        const close = page.locator('dialog[open] [data-action="close-sheet"]').first();
        if (await close.isVisible()) await close.click();
        await page.locator('[data-action="open:experience"]').click();
        await page.locator('dialog[open]').waitFor();
        await page.evaluate(() => globalThis.document.fonts.ready);
        await page.waitForTimeout(1200); // Allow optional portrait downloads and the canvas repaint.
        const name = viewport.width === 390 ? 'mobile' : 'desktop';
        await page.screenshot({ path: `${output}/${name}-settings.png`, fullPage: true });
        await writeFile(
            `${output}/${name}-accessibility.yml`,
            await page.locator('body').ariaSnapshot(),
        );
        await page.locator('dialog[open] [data-action="close-sheet"]').first().click();
        await page.locator('[data-action="tutorial"]').click();
        await page.locator('.match-screen:not([hidden])').waitFor();
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${output}/${name}-game.png`, fullPage: true });
        report.push({ viewport, title: await page.title(), errors });
        await context.close();
        if (errors.length) throw new Error(JSON.stringify(errors));
    }
    await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
    console.log(
        `Verified mobile and desktop interaction; screenshots and accessibility snapshots: ${output}`,
    );
} finally {
    await browser.close();
}
