import { existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const out = `output/playwright/redesign/${process.argv[2] || 'authenticated'}`;
await mkdir(out, { recursive: true });
const id = '10000000-0000-4000-8000-000000000000';
const profile = {
    id,
    username: 'traveler',
    name: 'هم‌سفر',
    phone: '+989120000000',
    age: 28,
    gender: 'female',
};
const progression = {
    version: 1,
    playerId: id,
    xp: 450,
    coins: 160,
    level: 2,
    levelXP: 150,
    nextLevelXP: 400,
    matches: 5,
    wins: 1,
    rankedMatches: 5,
    rankedWins: 1,
    rating: 1000,
    tier: 'silver',
    placementGamesRemaining: 0,
    lastRatingChange: 24,
    badges: ['first-match', 'first-win', 'explorer'],
    ownedSeals: ['sun'],
    equippedSeal: 'sun',
    catalog: [
        { id: 'sun', name: 'خورشید', cost: 0 },
        { id: 'turquoise', name: 'فیروزه', cost: 100 },
    ],
    referral: {
        code: 'traveler',
        status: 'none',
        qualifiedGames: 0,
        requiredGames: 3,
        rewardedInvites: 0,
        limit: 10,
    },
    rewards: [],
};
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
        await page.route('**/api/v1/**', async (route) => {
            const url = route.request().url();
            const data = url.includes('/analytics/preference')
                ? { accountId: id, enabled: false }
                : url.includes('/progression')
                  ? progression
                  : url.endsWith('/register')
                    ? { profile, recoveryCode: 'REVIEW-ONLY-NOT-A-REAL-KEY' }
                    : { profile };
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(data),
            });
        });
        await page.goto('http://127.0.0.1:4174/?review', { waitUntil: 'networkidle' });
        await page.waitForFunction(() => !!globalThis.sunmarkReview);
        await page.evaluate(() => globalThis.sunmarkReview.pause());
        const shot = async (name) => {
            await page.waitForTimeout(500);
            await page.screenshot({ path: `${out}/${device}-${name}.png` });
        };
        const account = async () =>
            page.evaluate(async () => {
                const { showAccount } = await import('/src/account/account.ts');
                void showAccount(globalThis.document.querySelector('#game-container'), true);
            });
        await account();
        await page.locator('[name=name]').fill('هم‌سفر');
        await page.locator('[name=phone]').fill('09120000000');
        await page.locator('.account-card [type=submit]').click();
        await page.locator('[name=username]').fill('traveler');
        await page.locator('[name=password]').fill('review-example-password');
        await page.locator('[name=age]').fill('28');
        await page.locator('[name=gender][value=female]').check();
        await page.locator('.account-card [type=submit]').click();
        await page.locator('.account-recovery').waitFor();
        await shot('account-recovery-key');
        await page.locator('[data-account=done]').click();
        await account();
        await shot('account-profile');
        await page.locator('[data-account=analytics]').click();
        await page.locator('[data-choice=later]').waitFor();
        await shot('account-privacy');
        await page.locator('[data-choice=no]').click();
        await page.locator('[data-account=done]').click();
        await page.evaluate(async () => {
            const { playerIdentity, saveIdentity } = await import('/src/account/identity.ts');
            saveIdentity({ ...playerIdentity(), profileComplete: false });
        });
        await account();
        await shot('account-complete');
        await page.locator('[name=gender][value=female]').check();
        await page.locator('.account-card [type=submit]').click();
        await page.locator('.account-dialog').waitFor({ state: 'hidden' });
        await page.evaluate(async () => {
            const { refreshProgression } = await import('/src/account/progression.ts');
            await refreshProgression();
            globalThis.sunmarkReview.pause(false);
        });
        for (const [action, name] of [
            ['hub:online-profile', 'online-profile'],
            ['hub:online-achievements', 'online-achievements'],
            ['hub:online-cosmetics', 'online-cosmetics'],
            ['hub:referrals', 'referrals'],
        ]) {
            await page.locator(`[data-action="${action}"]`).first().click();
            await shot(name);
            await page.locator('dialog[open] [data-action=close-sheet]').first().click();
        }
        assert.deepEqual(errors, []);
        report.push({ device, errors, mockedBackend: true });
        console.log(`${device}: authenticated account and progression reviewed`);
        await context.close();
    }
    await writeFile(`${out}/auth-report.json`, JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
