import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = `output/playwright/redesign/${process.argv[2] || 'discovery'}`;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath:
        process.env.PLAYWRIGHT_MCP_EXECUTABLE_PATH ||
        (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
try {
    for (const [device, width, height] of [
        ['mobile', 390, 844],
        ['tablet', 820, 1180],
        ['desktop', 1440, 900],
    ]) {
        if (process.argv.includes('mobile') && device !== 'mobile') continue;
        const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.stack));
        await page.route('**/api/v1/**', (route) =>
            route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
        );
        await page.goto('http://127.0.0.1:4173/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => !!globalThis.sunmarkReview);
        await page.evaluate(() => globalThis.sunmarkReview.pause());
        const shot = async (screen) => {
            await page.waitForTimeout(600);
            await page.screenshot({ path: `${out}/${device}-${screen}.png` });
        };
        await page.evaluate(async () => {
            const { showAccount } = await import('/src/account/account.ts');
            void showAccount(globalThis.document.querySelector('#game-container'), true);
        });
        await shot('account-register');
        await page.locator('input[name="name"]').fill('آزمایشگر');
        await page.locator('input[name="phone"]').fill('09120000000');
        await page.locator('.account-card [type="submit"]').click();
        await shot('account-credentials');
        await page.locator('[data-account="login"]').click();
        await shot('account-login');
        await page.locator('[data-account="recover"]').click();
        await shot('account-recover');
        await page.locator('[data-account="done"]').click();
        await page.evaluate(async () => {
            const { startOnline } = await import('/src/online/start.ts');
            const root = globalThis.document.createElement('div');
            root.style.cssText = 'position:fixed;inset:0;z-index:500';
            globalThis.document.body.append(root);
            globalThis.reviewOnline = startOnline(root, () => root.remove());
        });
        await shot('online-guest');
        await page.evaluate(() => {
            const c = globalThis.reviewOnline.client;
            c.session = { id: '00000000-0000-4000-8000-000000000001', name: 'آزمایشگر' };
            c.emit();
        });
        await shot('online-home');
        await page.locator('[data-online="screen:join"]').click();
        await page.locator('input[data-draft="code"]').fill('۱۲۳۴۵');
        assert.equal(await page.locator('input[data-draft="code"]').inputValue(), '12345');
        await shot('online-join');
        await page.locator('[data-online="screen:home"]').click();
        await page.evaluate(() => {
            const c = globalThis.reviewOnline.client;
            c.matchmaking = { state: 'waiting', count: 2, snapshot: null };
            c.emit();
        });
        await shot('online-search');
        await page.evaluate(() => {
            const c = globalThis.reviewOnline.client;
            c.matchmaking = null;
            c.snapshot = {
                id: '00000000-0000-4000-8000-000000000002',
                name: 'جزیرهٔ دوستان',
                code: '12345',
                status: 'lobby',
                revision: 1,
                host: true,
                protocolVersion: 1,
                rulesVersion: 'review',
                game: null,
                offers: [],
                seats: Array.from({ length: 4 }, (_, i) => ({
                    occupied: i < 2,
                    isYou: i === 0,
                    ready: i === 0,
                    bot: false,
                    name: i === 0 ? 'آزمایشگر' : i === 1 ? 'هم‌سفر' : '',
                    color: 0,
                })),
            };
            c.emit();
        });
        await shot('online-lobby');
        await page.evaluate(() => {
            const client = globalThis.reviewOnline.client;
            client.snapshot.seats[1].ready = true;
            globalThis.reviewBotSeats = [];
            // Exercise the real button handler with an isolated transport fixture.
            client.lobby = async (action) => {
                assertBotAction(action);
                function assertBotAction(value) {
                    if (value.kind !== 'bot' || !value.enabled)
                        throw new Error('Unexpected lobby action');
                }
                globalThis.reviewBotSeats.push(action.seat);
                const seat = client.snapshot.seats[action.seat];
                if (seat.occupied) throw new Error('Cannot replace a human');
                Object.assign(seat, { occupied: true, bot: true, ready: true, name: 'ربات' });
                client.emit();
            };
            client.emit();
        });
        await page.locator('[data-online="fill-bots"]').click();
        await page.waitForFunction(() => globalThis.reviewBotSeats.length === 2);
        assert.deepEqual(await page.evaluate(() => globalThis.reviewBotSeats), [2, 3]);
        assert(await page.locator('[data-online="start"]').isEnabled());
        await shot('online-lobby-with-bots');
        assert.deepEqual(errors, []);
        results.push({ device, errors, accountSteps: 4, onlineStates: 5 });
        console.log(`${device}: account and online entry reviewed`);
        await context.close();
    }
    await writeFile(`${out}/entry-report.json`, JSON.stringify(results, null, 2));
} finally {
    await browser.close();
}
