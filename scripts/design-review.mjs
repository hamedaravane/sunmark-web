import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const label = process.argv[2] || 'discovery';
const selectedViewport = process.argv
    .slice(3)
    .find((arg) => ['mobile', 'tablet', 'desktop'].includes(arg));
const out = `output/playwright/redesign/${label}`;
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
        if (selectedViewport && selectedViewport !== device) continue;
        const context = await browser.newContext({
            viewport: { width, height },
            deviceScaleFactor: 1,
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto('http://127.0.0.1:4173/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => !!globalThis.sunmarkReview);
        await page.waitForTimeout(1800);
        const selected = process.argv
            .find((arg) => arg.startsWith('--screens='))
            ?.slice(10)
            .split(',');
        const screens = (await page.evaluate(() => globalThis.sunmarkReview.screens)).filter(
            (name) => !selected || selected.includes(name),
        );
        for (const screen of screens) {
            await page.evaluate((name) => globalThis.sunmarkReview.show(name), screen);
            await page.waitForFunction(() => globalThis.sunmarkReview.ready());
            await page.waitForTimeout(180);
            if (!process.argv.includes('--interactions'))
                await page.screenshot({ path: `${out}/${device}-${screen}.png`, timeout: 150000 });
            const controls = await page
                .locator('button, summary, input, select')
                .evaluateAll((nodes) =>
                    nodes
                        .filter(
                            (n) =>
                                n.getBoundingClientRect().width &&
                                !n.closest('[hidden]') &&
                                (!globalThis.document.querySelector('dialog[open]') ||
                                    !!n.closest('dialog[open]')),
                        )
                        .map((n) => ({
                            action: n.dataset.action || n.name || n.tagName,
                            label: (n.getAttribute('aria-label') || n.textContent || '')
                                .trim()
                                .slice(0, 100),
                            disabled: !!n.disabled,
                        })),
                );
            if (process.argv.includes('--interactions')) {
                const seen = new Set();
                for (const control of controls.filter((c) => !c.disabled)) {
                    const action = control.action;
                    if (
                        !action.includes(':') &&
                        ![
                            'close-sheet',
                            'resume-game',
                            'confirm-player-name',
                            'roll-dice',
                            'primary',
                            'cancel',
                            'clear',
                            'end-turn',
                            'buy-development',
                            'play-development',
                            'confirm-trade',
                            'deal-send',
                            'confirm-discard',
                            'bot-pause',
                            'bot-step',
                            'new-game',
                            'tutorial-next',
                        ].includes(action)
                    )
                        continue;
                    const category =
                        /^(give|receive|discard-adjust|deal-adjust|preview-target|inspect-tile|development-select):/.test(
                            action,
                        )
                            ? action.split(':')[0]
                            : action;
                    if (seen.has(category)) continue;
                    seen.add(category);
                    await page.evaluate((name) => globalThis.sunmarkReview.show(name), screen);
                    const root = (await page.locator('dialog[open]').count())
                        ? page.locator('dialog[open]')
                        : page;
                    const target = root
                        .locator(`[data-action="${action}"]`)
                        .filter({ visible: true })
                        .first();
                    if ((await target.count()) && (await target.isEnabled())) {
                        await target.click({ timeout: 15000 });
                        await page.waitForTimeout(30);
                    }
                }
            }
            report.push({ device, screen, controls });
        }
        assert.deepEqual(errors, [], `${device} browser errors`);
        console.log(`${device}: ${screens.length} screens, no page errors`);
        await context.close();
    }
    await writeFile(
        `${out}/${process.argv.some((arg) => arg.startsWith('--screens=')) ? 'inventory-refinements' : 'inventory'}.json`,
        JSON.stringify(report, null, 2),
    );
} finally {
    await browser.close();
}
