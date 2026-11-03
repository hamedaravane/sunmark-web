import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = `output/playwright/redesign/${process.argv[2] || 'startup'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const report = [];
try {
    for (const [device, width, height] of [
        ['mobile', 390, 844],
        ['tablet', 820, 1180],
        ['desktop', 1440, 900],
    ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.route('**/api/v1/**', (route) =>
            route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
        );
        await page.goto('http://127.0.0.1:4174', { waitUntil: 'networkidle' });
        await page.locator('.council-home').waitFor();
        assert.equal(await page.locator('.account-dialog').count(), 0);
        await page.screenshot({ path: `${out}/${device}-guest-home.png` });
        await page.locator('[data-action=play]').click();
        await page.locator('#player-name').waitFor();
        await page.locator('dialog[open] [data-action=close-sheet]').first().click();
        await page.locator('[data-action=account]').click();
        await page.locator('.account-card [name=name]').waitFor();
        await page.locator('[data-account=done]').click();
        await page.locator('[data-action=online]').click();
        await page.locator('[data-online=account]').waitFor();
        await page.screenshot({ path: `${out}/${device}-online-account-gate.png` });
        await page.locator('[data-online=exit]').click();
        await page.locator('.council-home').waitFor();
        assert.deepEqual(errors, []);
        report.push({
            device,
            errors,
            guestEntry: true,
            accountEntry: true,
            onlineAccountGate: true,
            returnHome: true,
        });
        console.log(`${device}: guest entry, account, online gate and return passed`);
        await context.close();
    }
    await writeFile(`${out}/startup-report.json`, JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
