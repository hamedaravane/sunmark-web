import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright-core';
import { plan } from './online-planner';
import { actionGroup } from '../src/online/markup';
import { matchSnapshotSchema, type MatchSnapshot } from '../src/online/shared/src/online/wire';
import type { Intent } from '../src/online/client';
import { fitBoard, boardToScreen } from '../src/game/ui/layout';

const base = process.env.SUNMARK_TEST_API_URL;
const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
if (!base || !executablePath)
    throw new Error('SUNMARK_TEST_API_URL and CHROMIUM_EXECUTABLE_PATH are required');
const artifacts = resolve(process.env.SUNMARK_BROWSER_ARTIFACTS ?? 'test-results/online');
const errors: string[] = [];
let browser: Browser;

beforeAll(async () => {
    await mkdir(artifacts, { recursive: true });
    browser = await chromium.launch({
        executablePath,
        headless: true,
        args: [
            ...(process.env.SUNMARK_BROWSER_DEBUG_PORT
                ? [`--remote-debugging-port=${process.env.SUNMARK_BROWSER_DEBUG_PORT}`]
                : []),
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
        ],
    });
});
afterAll(async () => {
    await browser?.close();
});

async function enter(name: string, width = 390, height = 844) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
        if (message.type() === 'warning' && message.text().includes('not supported'))
            errors.push(message.text());
    });
    await page.goto(base ?? '', { waitUntil: 'domcontentloaded' });
    const dismiss = page.getByRole('button', { name: 'فعلاً ادامه بده', exact: true });
    // Initial PWA guidance may open after the menu appears.
    await page.getByRole('button', { name: 'بازی آنلاین', exact: true }).waitFor();
    await page.waitForTimeout(800);
    if (await dismiss.isVisible()) await dismiss.click();
    await page.getByRole('button', { name: 'بازی آنلاین', exact: true }).click();
    await page.getByRole('textbox', { name: 'نام شما', exact: true }).fill(name);
    await page.getByRole('button', { name: 'ورود مهمان', exact: true }).click();
    await page.getByRole('button', { name: 'ساخت اتاق خصوصی', exact: true }).waitFor();
    return page;
}
async function snapshot(page: Page, id: string): Promise<MatchSnapshot> {
    const response = await page.request.get(`${base}/api/v1/online/matches/${id}`);
    if (!response.ok()) throw new Error(`Snapshot HTTP ${response.status()}`);
    const value: unknown = await response.json();
    return matchSnapshotSchema.parse(value);
}
async function waitForRevision(page: Page, id: string, revision: number) {
    await expect
        .poll(async () => (await snapshot(page, id)).revision, { timeout: 30000 })
        .toBeGreaterThan(revision);
    await expect
        .poll(async () => page.locator('[role="alert"]').allTextContents(), { timeout: 30000 })
        .toEqual([]);
}
async function create(page: Page, name: string) {
    const response = page.waitForResponse(
        (r) => r.url().endsWith('/online/matches') && r.request().method() === 'POST',
    );
    await page.getByRole('textbox', { name: 'نام بازی', exact: true }).fill(name);
    await page.locator('[data-online="create"]').click();
    return matchSnapshotSchema.parse(await (await response).json());
}
async function move(page: Page, before: MatchSnapshot, intent: Intent, useBoard = false) {
    const game = before.game;
    if (!game) throw new Error('Missing game');
    const normalize = (value: Intent) =>
        value.kind === 'play-development' && value.choice && Object.keys(value.choice).length === 0
            ? { kind: value.kind, cardId: value.cardId }
            : value;
    const index = game.availableIntents.findIndex((candidate) =>
        isDeepStrictEqual(normalize(candidate), normalize(intent)),
    );
    if (intent.kind !== 'discard' && index < 0)
        throw new Error(`No legal intent for ${JSON.stringify(intent)}`);
    const [result] = await Promise.all([
        page.waitForResponse(
            (r) => r.url().endsWith('/online/commands') && r.request().method() === 'POST',
        ),
        (async () => {
            if (intent.kind === 'discard') {
                for (const [resource, count] of Object.entries(intent.resources))
                    await page.locator(`[data-draft="discard.${resource}"]`).fill(String(count));
                await page.locator('[data-online="discard"]').click();
            } else {
                await page.locator(`[data-online="tool:${actionGroup(intent)}"]`).click();
                if (!(await page.locator('[data-online="confirm"]').count())) {
                    await expect
                        .poll(
                            async () =>
                                (await page.locator('.online-choices').boundingBox())?.height ?? 0,
                        )
                        .toBeGreaterThan(40);
                    if (useBoard && 'targetId' in intent) {
                        const bounds = await page.locator('.online-board').boundingBox();
                        if (!bounds) throw new Error('Board not visible');
                        const vertex = game.board.vertices[intent.targetId];
                        const edge = game.board.edges[intent.targetId];
                        const tile = game.board.tiles.find((t) => t.id === intent.targetId);
                        const a = edge && game.board.vertices[edge.vertexIds[0]];
                        const b = edge && game.board.vertices[edge.vertexIds[1]];
                        const target =
                            vertex ?? (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : tile);
                        if (!target) throw new Error('Missing board target');
                        const point = boardToScreen(target, fitBoard(bounds.width, bounds.height));
                        await page.evaluate(
                            () =>
                                new Promise<void>((resolve) =>
                                    requestAnimationFrame(() =>
                                        requestAnimationFrame(() => resolve()),
                                    ),
                                ),
                        );
                        await page.mouse.click(bounds.x + point.x, bounds.y + point.y);
                    } else await page.locator(`[data-online="select:${index}"]`).click();
                }
                await page.locator('[data-online="confirm"]').click();
            }
        })(),
    ]);
    if (!result.ok()) throw new Error(`Command rejected: ${await result.text()}`);
    await waitForRevision(page, before.id, before.revision);
}

test('four isolated browsers play through victory using the rendered online controls', async () => {
    const pages: Page[] = [];
    try {
        for (let i = 0; i < 4; i++) {
            pages.push(await enter(`بازیکن ${i + 1}`));
            process.stdout.write(`Browser player ${i + 1} signed in\n`);
        }
        const room = await create(pages[0], 'آزمون کامل مرورگر');
        for (const page of pages.slice(1)) {
            await page.getByRole('textbox', { name: 'کد دعوت', exact: true }).fill(room.code);
            await page.locator('[data-online="join"]').click();
            await page.locator('[data-online="ready"]').waitFor();
        }
        for (const page of pages) await page.locator('[data-online="ready"]').click();
        await pages[0].screenshot({ path: resolve(artifacts, 'lobby.png') });
        await pages[0].locator('[data-online="start"]').click();
        let current = await snapshot(pages[0], room.id);
        const kinds = new Set<string>();
        let moves = 0;
        while (current.game && !current.game.winnerId) {
            const index = Number(current.game.actorId.split('-')[1]) - 1;
            const page = pages[index];
            const view = await snapshot(page, room.id);
            if (!view.game) throw new Error('Game missing');
            const intent = plan(view.game);
            kinds.add(intent.kind);
            try {
                await move(page, view, intent);
            } catch (error) {
                console.error(
                    'Browser move failed',
                    moves,
                    intent,
                    errors,
                    await page.locator('.online-semantics').innerText(),
                );
                throw error;
            }
            current = await snapshot(page, room.id);
            moves++;
            if (moves === 24 || moves === 100)
                await page.screenshot({ path: resolve(artifacts, `match-${moves}.png`) });
            if (moves === 40) {
                await page.reload({ waitUntil: 'domcontentloaded' });
                const dismiss = page.getByRole('button', { name: 'فعلاً ادامه بده', exact: true });
                await page.getByRole('button', { name: 'بازی آنلاین', exact: true }).waitFor();
                await page.waitForTimeout(800);
                if (await dismiss.isVisible()) await dismiss.click();
                await page.getByRole('button', { name: 'بازی آنلاین', exact: true }).click();
                await page.locator('.online-board:not([hidden])').waitFor();
                expect((await snapshot(page, room.id)).game?.self.id).toBe(`player-${index + 1}`);
            }
            if (moves % 50 === 0)
                process.stdout.write(`Browser match: ${moves} moves, turn ${current.game?.turn}\n`);
            if (moves > 3000) throw new Error('Browser match did not reach victory');
        }
        expect(current.status).toBe('finished');
        expect(current.game?.winnerId).toBeTruthy();
        for (const page of pages) {
            await page.locator('[data-online="rematch"]').waitFor();
            expect((await snapshot(page, room.id)).status).toBe('finished');
        }
        await pages[0].screenshot({ path: resolve(artifacts, 'victory.png') });
        await pages[0].locator('[data-online="rematch"]').click();
        await pages[0].locator('[data-online="start"]').waitFor();
        await pages[0].locator('[data-online="back"]').click();
        await pages[0].locator('[data-online="exit"]').click();
        await pages[0].locator('[data-action="play"]').waitFor();
        console.log(
            `Browser victory: ${moves} UI moves; ${current.game?.winnerId}; actions ${[...kinds].join(', ')}`,
        );
        expect(errors).toEqual([]);
    } finally {
        for (let i = 0; i < pages.length; i++) {
            await pages[i]
                .screenshot({ path: resolve(artifacts, `final-${i}.png`) })
                .catch(() => {});
            await pages[i].context().close();
        }
    }
});

test('a desktop host plays setup with three real server bots', async () => {
    const page = await enter('میزبان ربات‌ها', 1280, 900);
    try {
        const room = await create(page, 'ربات‌ها');
        for (let seat = 1; seat < 4; seat++)
            await page.locator(`[data-online="bot:${seat}:true"]`).click();
        await page.locator('[data-online="ready"]').click();
        await page.locator('[data-online="start"]').click();
        let current = await snapshot(page, room.id);
        for (let step = 0; current.game?.phase.startsWith('setup-'); step++) {
            if (step > 45) throw new Error('Bot setup stalled');
            if (current.game.actorId === current.game.self.id)
                await move(page, current, plan(current.game));
            else await waitForRevision(page, room.id, current.revision);
            current = await snapshot(page, room.id);
        }
        expect(
            Object.values(current.game?.board.vertices ?? {}).filter((v) => v.building),
        ).toHaveLength(8);
        await page.screenshot({ path: resolve(artifacts, 'bots-desktop.png') });
        expect(errors).toEqual([]);
    } finally {
        await page.screenshot({ path: resolve(artifacts, 'bots-final.png') }).catch(() => {});
        await page.context().close();
    }
});

test('browser players propose, accept and finally confirm a resource trade', async () => {
    const pages: Page[] = [];
    try {
        for (let i = 0; i < 4; i++) pages.push(await enter(`تاجر ${i + 1}`));
        const room = await create(pages[0], 'تجارت مرورگر');
        for (const page of pages.slice(1)) {
            await page.getByRole('textbox', { name: 'کد دعوت', exact: true }).fill(room.code);
            await page.locator('[data-online="join"]').click();
            await page.locator('[data-online="ready"]').waitFor();
        }
        for (const page of pages) await page.locator('[data-online="ready"]').click();
        await pages[0].locator('[data-online="start"]').click();
        let current = await snapshot(pages[0], room.id);
        const resources = ['wood', 'brick', 'wheat', 'wool', 'stone'] as const;
        for (let step = 0; step < 120; step++) {
            const game = current.game;
            if (!game) throw new Error('Missing game');
            const actor = Number(game.actorId.split('-')[1]) - 1;
            const views = await Promise.all(pages.map((page) => snapshot(page, room.id)));
            const active = views[actor].game;
            if (!active) throw new Error('Missing active view');
            if (active.phase === 'actions') {
                const give = resources.find((r) => active.self.resources[r] > 0);
                const recipient = views.findIndex(
                    (v, i) =>
                        i !== actor &&
                        resources.some((r) => r !== give && (v.game?.self.resources[r] ?? 0) > 0),
                );
                const receive = resources.find(
                    (r) => r !== give && (views[recipient]?.game?.self.resources[r] ?? 0) > 0,
                );
                if (give && receive && recipient >= 0) {
                    const host = pages[actor],
                        guest = pages[recipient];
                    await host.locator('[data-online="offer-form"]').click();
                    await host.locator(`[data-online="recipient:player-${recipient + 1}"]`).click();
                    await host.locator(`[data-draft="offerGive.${give}"]`).fill('1');
                    await host.locator(`[data-draft="offerWant.${receive}"]`).fill('1');
                    const offerResponse = host.waitForResponse((r) =>
                        r.url().endsWith('/online/commands'),
                    );
                    await host.locator('[data-online="offer"]').click();
                    expect((await offerResponse).ok()).toBe(true);
                    let updated = await snapshot(host, room.id);
                    const offer = updated.offers.find((o) => o.status === 'open');
                    if (!offer) throw new Error('Offer was not persisted');
                    expect(updated.game?.self.resources).toEqual(active.self.resources);
                    await guest.locator(`[data-online="accept:${offer.id}"]`).click();
                    await host.locator(`[data-online="trade-confirm:${offer.id}"]`).click();
                    await expect
                        .poll(
                            async () =>
                                (await snapshot(host, room.id)).offers.find(
                                    (o) => o.id === offer.id,
                                )?.status,
                            { timeout: 30000 },
                        )
                        .toBe('completed');
                    updated = await snapshot(host, room.id);
                    expect(updated.game?.self.resources[give]).toBe(
                        active.self.resources[give] - 1,
                    );
                    expect(updated.game?.self.resources[receive]).toBe(
                        active.self.resources[receive] + 1,
                    );
                    await host.screenshot({ path: resolve(artifacts, 'trade-completed.png') });
                    expect(errors).toEqual([]);
                    return;
                }
            }
            await move(pages[actor], views[actor], plan(active), true);
            current = await snapshot(pages[actor], room.id);
        }
        throw new Error('No resource exchange became available');
    } finally {
        for (const page of pages) await page.context().close();
    }
});
