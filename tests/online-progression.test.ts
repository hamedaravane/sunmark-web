import { afterEach, expect, test, vi } from 'vitest';
import { saveIdentity } from '../src/account/identity';
import {
    changeProgression,
    onlineProgression,
    rankLabel,
    refreshProgression,
} from '../src/account/progression';
import {
    progressionProfileSchema,
    type ProgressionProfile,
} from '../src/online/shared/src/online/progression.schemas';
import { OnlineClient } from '../src/online/client';
import { GameSession } from '../src/game/ui/session';
import { ProgressionStore } from '../src/game/progression/progression';
import { menuContent } from '../src/game/ui/menu';
import { sheetContent } from '../src/game/ui/sheets';
import { AppPlatform } from '../src/pwa/app';
const id = '20000000-0000-4000-8000-000000000000';
const other = '30000000-0000-4000-8000-000000000000';
function profile(playerId = id): ProgressionProfile {
    return {
        version: 1,
        playerId,
        xp: 300,
        coins: 100,
        level: 2,
        levelXP: 0,
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
}
function identity(playerId = id) {
    saveIdentity({ id: playerId, name: 'هم‌سفر', username: 'traveler' });
    vi.stubGlobal('location', {
        protocol: 'https:',
        hostname: 'example.test',
        origin: 'https://example.test',
        href: 'https://example.test/',
    });
}
afterEach(async () => {
    saveIdentity(null);
    await refreshProgression();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});
test('restores server-owned progression and renders real rank while keeping offline wealth separate', async () => {
    identity();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json(profile())));
    await refreshProgression();
    const local = new ProgressionStore(null);
    local.completePractice();
    const session = new GameSession(undefined, local);
    const markup = menuContent(new AppPlatform(), session);
    expect(markup).toContain('نقره');
    expect(markup).toContain('پیشرفت آفلاین');
    expect(markup).toContain('data-action="hub:cosmetics"');
    session.openSheet({ kind: 'online-profile' });
    expect(sheetContent(session).body).toContain('سکه و تجربهٔ آفلاین به آن منتقل نمی‌شوند');
    expect(rankLabel(onlineProgression())).toContain('۱٬۰۰۰');
    expect(local.snapshot.coins).toBe(40);
    saveIdentity({ id: other, name: 'دیگری', username: 'another' });
    expect(onlineProgression()).toBeNull();
});
test('rejects stale responses after switching accounts and validates fetched balances', async () => {
    identity();
    let resolve: ((response: Response) => void) | undefined;
    vi.stubGlobal(
        'fetch',
        vi.fn<typeof fetch>().mockImplementation(
            () =>
                new Promise<Response>((done) => {
                    resolve = done;
                }),
        ),
    );
    const request = refreshProgression();
    saveIdentity({ id: other, name: 'دیگری', username: 'another' });
    resolve?.(Response.json(profile()));
    await request;
    expect(onlineProgression()).toBeNull();
    expect(progressionProfileSchema.safeParse({ ...profile(), coins: -1 }).success).toBe(false);
});
test('purchases through the server without submitting a balance or price and displays the committed result', async () => {
    identity();
    const request = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
            ...profile(),
            coins: 0,
            ownedSeals: ['sun', 'turquoise'],
            equippedSeal: 'turquoise',
        }),
    );
    vi.stubGlobal('fetch', request);
    expect(await changeProgression('cosmetics', { seal: 'turquoise' })).toBe(true);
    expect(request.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ seal: 'turquoise' }));
    expect(onlineProgression()?.coins).toBe(0);
    expect(onlineProgression()?.equippedSeal).toBe('turquoise');
    expect(
        rankLabel({ ...profile(), tier: null, rating: null, placementGamesRemaining: 4 }),
    ).toContain('۱ از ۵');
});
test('ranked queue heartbeat and cancellation never use the casual matchmaking route', async () => {
    vi.useFakeTimers();
    const routes: string[] = [];
    const request = vi.fn<typeof fetch>().mockImplementation(async (url, options) => {
        routes.push(String(url));
        const cancel = options?.body === JSON.stringify({ kind: 'cancel' });
        return Response.json({
            state: cancel ? 'idle' : 'waiting',
            count: cancel ? 0 : 1,
            snapshot: null,
        });
    });
    const client = new OnlineClient('https://example.test', null, request);
    await client.quickMatch('join', 'ranked');
    await vi.advanceTimersByTimeAsync(3000);
    await client.quickMatch('cancel');
    client.destroy();
    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes.every((url) => url.endsWith('/ranked'))).toBe(true);
});
