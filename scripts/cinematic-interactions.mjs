import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const out = 'output/playwright/redesign/cinematic-interactions';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = [];
try {
    const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await page.locator('.graphics-ui').waitFor();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('data-action'), 'open:experience');
    assert.equal(
        await page.locator(':focus').evaluate((n) => globalThis.getComputedStyle(n).outlineStyle),
        'solid',
    );
    await page.keyboard.press('Enter');
    await page.locator('dialog[open]').waitFor();
    await page.keyboard.press('Escape');
    assert(await page.locator('.cinematic-home').isVisible());
    await page.locator('.title-more > summary').click();
    await page.screenshot({ path: `${out}/mobile-more.png` });
    await page.locator('.title-more [data-action="hub:profile"]').click();
    await page.locator('dialog[open] .hub-profile-heading').waitFor();
    await page.screenshot({ path: `${out}/mobile-profile.png` });
    await page.keyboard.press('Escape');
    // A real new match and reload retain identity/save semantics.
    await page.locator('[data-action="play"]').click();
    await page.locator('#player-name').fill('هم‌سفر');
    await page.locator('[data-action="confirm-player-name"]').click();
    await page.locator('[data-action="enter-match"]:not(:disabled)').waitFor();
    await page.locator('[data-action="enter-match"]').click();
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.graphics-ui').waitFor();
    assert.match(await page.locator('[data-action="play"]').innerText(), /ادامهٔ سفر/);
    await page.screenshot({ path: `${out}/mobile-resume.png` });
    await page.locator('[data-action="play"]').click();
    await page.locator('.match-screen:not([hidden])').waitFor();
    assert.equal(await page.locator('#player-name').count(), 0);
    results.push('keyboard focus + settings + profile + real match save/resume');
    await page.close();
    const robust = await browser.newPage({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
    });
    robust.on('pageerror', (e) => errors.push(e.message));
    await robust.route('**/assets/menu/**', (route) => route.abort());
    await robust.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
    await robust.locator('.graphics-ui').waitFor();
    assert.equal(
        await robust
            .locator('.cinematic-world img[data-failed], .cinematic-hero img[data-failed]')
            .count(),
        5,
    );
    assert.equal(
        await robust
            .locator('.cinematic-ensemble')
            .evaluate((n) => globalThis.getComputedStyle(n).opacity),
        '0',
    );
    await robust.screenshot({ path: `${out}/art-unavailable.png` });
    await robust.locator('[data-action="play"]').click();
    await robust.locator('#player-name').waitFor();
    await robust.keyboard.press('Escape');
    await robust.evaluate(() => (globalThis.document.documentElement.style.fontSize = '200%'));
    assert(await robust.locator('[data-action="play"]').isVisible());
    assert(await robust.locator('.main-menu').evaluate((n) => n.scrollWidth <= n.clientWidth + 1));
    await robust.locator('.title-more > summary').scrollIntoViewIfNeeded();
    await robust.screenshot({ path: `${out}/text-200-percent.png` });
    await robust.evaluate(() => (globalThis.document.documentElement.style.fontSize = ''));
    await robust.setViewportSize({ width: 844, height: 390 });
    await robust.locator('[data-action="play"]').click();
    await robust.locator('#player-name').waitFor();
    await robust.keyboard.press('Escape');
    await robust.setViewportSize({ width: 390, height: 844 });
    assert(await robust.locator('[data-action="play"]').isVisible());
    assert.equal(
        await robust
            .locator('.world-light')
            .evaluate((n) => globalThis.getComputedStyle(n).animationName),
        'none',
    );
    assert.deepEqual(errors, []);
    results.push('missing decorative images + 200% text + rotation + reduced motion');
    await robust.close();
} finally {
    await browser.close();
}
await writeFile(`${out}/report.json`, JSON.stringify(results, null, 2));
console.log(results.join('\n'));
