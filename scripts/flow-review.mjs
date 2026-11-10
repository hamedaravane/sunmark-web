import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = `output/playwright/redesign/${process.argv[2] || 'flows'}`;
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
        await page.goto('http://127.0.0.1:4173/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => !!globalThis.sunmarkReview);
        const show = async (name) => {
            await page.evaluate((name) => globalThis.sunmarkReview.show(name), name);
        };
        const click = async (action) => {
            const modal = page.locator('dialog[open]');
            const root = (await modal.count()) ? modal : page;
            await root.locator(`[data-action="${action}"]`).first().click();
        };
        const shot = async (name) => {
            await page.waitForTimeout(300);
            await page.screenshot({ path: `${out}/${device}-${name}.png` });
        };
        const close = async () => click('close-sheet');
        await show('board');
        const geometry = await page
            .locator('.board-stage,.resource-hand,.action-dock')
            .evaluateAll((nodes) =>
                nodes.map((n) => ({
                    name: n.className,
                    top: n.getBoundingClientRect().top,
                    bottom: n.getBoundingClientRect().bottom,
                    left: n.getBoundingClientRect().left,
                    right: n.getBoundingClientRect().right,
                })),
            );
        const [board, hand, dock] = ['board-stage', 'resource-hand', 'action-dock'].map((name) =>
            geometry.find((n) => n.name.includes(name)),
        );
        assert(hand.bottom <= board.top + 1, 'inventory stays above island');
        assert(
            board.right <= dock.left + 1 || board.bottom <= dock.top + 1,
            'decisions do not obstruct island',
        );
        await show('build');
        if (width < 760) {
            await click('construction-focus:city');
            assert(await page.locator('.construction-card[data-build-kind=city]').isVisible());
            await shot('construction-city');
            await click('construction-focus:road');
        }
        const summary = page.locator('.construction-card[data-build-kind=road] summary');
        await summary.focus();
        await summary.press('Enter');
        assert(
            await page
                .locator('.construction-card[data-build-kind=road] details')
                .evaluate((n) => n.open),
        );
        await shot('construction-planning');
        await click('pin-build:road');
        assert(await page.locator('.build-goal').count());
        await show('trade');
        await click('trade:give:wood');
        await click('trade:receive:wool');
        await shot('trade-review');
        assert(await page.locator('[data-action=confirm-trade]').isEnabled());
        await click('confirm-trade');
        assert.equal(
            await page.locator('.hand-resource[data-resource=wood] .resource-count').innerText(),
            '۴',
        );
        assert.equal(
            await page.locator('.hand-resource[data-resource=wool] .resource-count').innerText(),
            '۹',
        );
        await show('domestic');
        await click('deal-adjust:give:wood:1');
        await click('deal-adjust:want:brick:1');
        await shot('negotiation');
        assert(await page.locator('[data-action=deal-send]').isEnabled());
        await click('deal-send');
        await shot('offer-sent');
        await show('development');
        for (const kind of [
            'knight',
            'monopoly',
            'road-building',
            'victory-point',
            'year-of-plenty',
        ]) {
            await page.locator(`[data-action^="development-select:${kind}-"]`).first().click();
            assert(await page.locator('.development-feature').isVisible());
        }
        await click('development-resource:0:stone');
        await click('development-resource:1:wood');
        await shot('card-inspector');
        await click('play-development');
        assert.equal(
            await page.locator('.hand-resource[data-resource=stone] .resource-count').innerText(),
            '۹',
        );
        assert.equal(
            await page.locator('.hand-resource[data-resource=wood] .resource-count').innerText(),
            '۹',
        );
        await show('experience');
        for (const key of ['anahita', 'rivals', 'sound', 'quick', 'reduced']) {
            const button = page.locator(`[data-action="experience:${key}"]`);
            const before = await button.getAttribute('aria-pressed');
            await button.click();
            assert.notEqual(
                await page
                    .locator(`[data-action="experience:${key}"]`)
                    .getAttribute('aria-pressed'),
                before,
            );
        }
        await shot('settings');
        await show('rules');
        await page.locator('.rule-chapter summary').first().focus();
        await page.locator('.rule-chapter summary').first().press('Enter');
        assert(await page.locator('.rule-chapter[open]').count());
        await shot('rules-expanded');
        await show('discard');
        for (const [resource, count] of [
            ['wood', 8],
            ['brick', 8],
            ['wheat', 4],
        ])
            for (let i = 0; i < count; i++) {
                const button = page.locator(`[data-action="discard-adjust:${resource}:1"]`);
                await button.press('Enter');
            }
        assert(await page.locator('[data-action=confirm-discard]').isEnabled());
        await shot('discard-ready');
        await click('confirm-discard');
        await show('steal');
        await page.locator('[data-action^="steal:"]').first().click();
        assert.equal(await page.locator('dialog[open]').count(), 0);
        await show('results');
        await shot('results');
        await close();
        assert.deepEqual(errors, []);
        report.push({
            device,
            errors,
            geometry,
            verified: [
                'construction focus/keyboard/planning',
                'bank payment',
                'negotiation proposal',
                'all card kinds/Year of Plenty payment',
                'settings toggles',
                'rule chapters',
                'mandatory discard/theft',
                'results',
            ],
        });
        console.log(`${device}: focused gameplay flows passed`);
        await context.close();
    }
    await writeFile(`${out}/flow-report.json`, JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
