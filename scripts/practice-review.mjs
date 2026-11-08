import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = `output/playwright/redesign/${process.argv[2] || 'practice'}`;
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
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const click = async (action) => {
            const modal = page.locator('dialog[open]');
            const root = (await modal.count()) ? modal : page;
            await root.locator(`[data-action="${action}"]`).first().click();
        };
        const shot = async (name) => {
            await page.waitForTimeout(400);
            await page.screenshot({ path: `${out}/${device}-${name}.png` });
        };
        const lessons = async () => {
            for (let n = 0; n < 16; n++) {
                const button = page.locator('[data-action=tutorial-next]');
                if (!(await button.isVisible())) break;
                await button.click();
            }
        };
        const target = async () => {
            await click('open:targets');
            await page.locator('[data-action^="preview-target:"]').first().click();
            await click('primary');
            await lessons();
        };
        await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
        await page.locator('.graphics-ui').waitFor();
        await click('open:experience');
        for (const key of ['anahita', 'rivals', 'reduced'])
            for (let n = 0; n < 2; n++) await click(`experience:${key}`);
        await shot('home-settings');
        await click('resume-game');
        await click('tutorial');
        await shot('anahita');
        await lessons();
        await click('roll-dice');
        await lessons();
        await shot('income');
        await click('open:build');
        await click('build:road');
        await lessons();
        await target();
        await click('open:trade');
        await click('trade:give:wood');
        await click('trade:receive:wool');
        await shot('practice-exchange');
        await click('confirm-trade');
        await lessons();
        await click('open:build');
        assert(await page.locator('.construction-card[data-build-kind=settlement]').isVisible());
        await click('build:settlement');
        await lessons();
        await target();
        if (await page.locator('.dock-primary[data-action=primary]').isVisible())
            await click('primary');
        await page.locator('.council-home').waitFor();
        assert.equal(await page.locator('.council-home .hub-reward').count(), 0);
        await shot('practice-complete');
        await page.locator('.title-more > summary').click();
        await page.locator('.title-more [data-action="hub:profile"]').click();
        assert.match(await page.locator('dialog[open] .hub-reward').innerText(), /تمرین کامل شد/);
        await shot('practice-reward-profile');
        assert.deepEqual(errors, []);
        report.push({ device, errors, completedPractice: true, homeSettings: true });
        console.log(`${device}: real practice completed and rewarded`);
        await context.close();
    }
    await writeFile(`${out}/practice-report.json`, JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
