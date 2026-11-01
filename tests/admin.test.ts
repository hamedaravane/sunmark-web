import { describe, expect, it, vi } from 'vitest';
import { AdminClient, AdminRequestError } from '../src/admin/client';
import { userDetail, userList } from '../src/admin/markup';

const user = {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'fixture',
    name: '<img src=x onerror=alert(1)>',
    phone: '+15550000000',
    age: 30,
    gender: 'undisclosed',
    createdAt: '2026-11-01T12:00:00.000Z',
    isAdmin: false,
    matches: 0,
    wins: 0,
    xp: 0,
    coins: 0,
    rankedMatches: 0,
    rankedWins: 0,
    rating: 1000,
};

describe('admin boundary', () => {
    it('escapes user-controlled profile text in the table, attributes and detail view', () => {
        for (const html of [
            userList({ users: [user], total: 1, page: 1, limit: 25 }),
            userDetail(user),
        ]) {
            expect(html).not.toContain('<img src=x');
            expect(html).toContain('&lt;img');
        }
    });
    it('uses no-store, same-origin cookies and encoded search parameters', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(
                new Response(JSON.stringify({ users: [user], total: 1, page: 2, limit: 25 })),
            );
        await new AdminClient(request).users('a&role=admin', 2, new AbortController().signal);
        const [url, options] = request.mock.calls[0];
        expect(url).toBe('/api/v1/admin/users?q=a%26role%3Dadmin&page=2&limit=25');
        expect(options).toMatchObject({ credentials: 'same-origin', cache: 'no-store' });
    });
    it('preserves unauthorized responses for the login screen without consuming private data', async () => {
        for (const status of [401, 403]) {
            const request = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status }));
            await expect(
                new AdminClient(request).overview(new AbortController().signal),
            ).rejects.toMatchObject({ status });
        }
        expect(new AdminRequestError(403).message).toContain('دسترسی');
    });
    it('rejects malformed or unexpectedly expanded profile responses', async () => {
        const request = vi.fn<typeof fetch>().mockResolvedValue(
            new Response(
                JSON.stringify({
                    users: [{ ...user, passwordHash: 'must-never-arrive' }],
                    total: 1,
                    page: 1,
                    limit: 25,
                }),
            ),
        );
        await expect(
            new AdminClient(request).users('', 1, new AbortController().signal),
        ).rejects.toThrow();
    });
});
