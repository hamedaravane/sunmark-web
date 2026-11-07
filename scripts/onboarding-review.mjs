import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = 'output/playwright/onboarding';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
    for (const [name, width, height, ua, installed, prompt] of [
        ['mobile', 390, 844, '', false, false],
        ['tablet', 820, 1180, '', false, false],
        ['desktop', 1440, 900, '', false, false],
        [
            'iphone',
            390,
            844,
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
            false,
            false,
        ],
        [
            'instagram',
            390,
            844,
            'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Instagram',
            false,
            false,
        ],
        ['installed', 390, 844, '', true, false],
        [
            'android',
            390,
            844,
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36',
            false,
            true,
        ],
    ]) {
        const context = await browser.newContext({
            viewport: { width, height },
            ...(ua ? { userAgent: ua } : {}),
        });
        await context.addInitScript(
            ({ installed }) => {
                if (installed) {
                    const original = globalThis.window.matchMedia.bind(globalThis.window);
                    globalThis.window.matchMedia = (q) =>
                        q === '(display-mode: standalone)'
                            ? { matches: true, addEventListener() {}, removeEventListener() {} }
                            : original(q);
                }
            },
            { installed },
        );
        await context.route('**/api/**', (route) =>
            route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }),
        );
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(process.env.REVIEW_BASE_URL || 'http://127.0.0.1:4173', {
            waitUntil: 'networkidle',
        });
        await page.locator('.graphics-ui').waitFor();
        if (prompt)
            await page.evaluate(() => {
                const e = new Event('beforeinstallprompt');
                e.prompt = async () => {};
                e.userChoice = Promise.resolve({ outcome: 'dismissed' });
                globalThis.window.dispatchEvent(e);
            });
        for (const id of ['ahriman', 'anahita', 'mithra', 'ashi', 'spenta-armaiti'])
            assert.equal(await page.locator(`.council-figure--${id}`).count(), 1);
        assert.equal(
            await page.locator('.title-screen [data-action="open:characters"]').count(),
            0,
        );
        for (const action of ['play', 'tutorial', 'online', 'account'])
            assert.equal(await page.locator(`.council-play [data-action="${action}"]`).count(), 1);
        assert.equal(await page.locator('.entry-install').count(), installed ? 0 : 1);
        await page.screenshot({ path: `${out}/${name}-home.png` });
        if (name === 'iphone' || name === 'instagram') {
            await page.locator('.entry-install [data-action="open-app"]').click();
            assert.match(
                await page.locator('dialog[open]').innerText(),
                name === 'iphone' ? /Add to Home Screen/ : /Open in Safari/,
            );
            await page.screenshot({ path: `${out}/${name}-guide.png` });
            await page.keyboard.press('Escape');
        }
        if (prompt) {
            await page.locator('.entry-install [data-action="app-install"]').click();
            assert.equal(await page.locator('.entry-install [data-action="open-app"]').count(), 1);
        }
        assert.deepEqual(errors, []);
        console.log(`${name}: entry and guide checks passed`);
        await context.close();
    }
} finally {
    await browser.close();
}
