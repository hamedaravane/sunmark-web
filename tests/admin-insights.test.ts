import { expect, test, vi } from 'vitest';
import { dashboard } from '../src/admin/dashboard';
import { cohortCell, trendChart } from '../src/admin/charts';
import { insightsSchema } from '../src/online/shared/src/admin/admin.schemas';
import { AdminClient } from '../src/admin/client';
import { accountMarkup } from '../src/account/markup';

test('empty charts do not imply retention and practice is distinct from full matches', () => {
    const data = insightsSchema.parse({
        days: 7,
        checkedAt: '2026-11-02T12:00:00.000Z',
        from: '2026-10-27T00:00:00.000Z',
        excludedAdmins: 1,
        accounts: {
            total: 2,
            new: 2,
            incompleteProfiles: 1,
            eligibleForMeasurement: 1,
            optedOut: 1,
        },
        activity: {
            players: 1,
            sessions: 2,
            activeSeconds: 90,
            medianActiveSeconds: 90,
            repeatPlayers: 1,
            rejectedActions: 0,
            affectedPlayers: 0,
        },
        daily: [],
        journeys: ['offline', 'online', 'practice'].map((mode) => ({
            mode,
            entrants: mode === 'practice' ? 1 : 0,
            runs: mode === 'practice' ? 1 : 0,
            progressed: 0,
            builders: 0,
            traders: 0,
            finishers: mode === 'practice' ? 1 : 0,
        })),
        online: { visitors: 0, entrants: 0, firstActors: 0, stages: [] },
        cohorts: [{ date: '2026-11-02', players: 1, d1: null, d7: null }],
        genders: { male: 1, female: 0 },
        ages: [],
        builds: [],
    });
    const html = dashboard(data);
    expect(html).toContain('هنوز آماده نیست');
    expect(html).toContain('پایان تمرین');
    expect(html).toContain('پایان بازی');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('style=');
    expect(cohortCell(null, 1)).toContain('در انتظار');
    expect(cohortCell(0, 1)).not.toContain('در انتظار');
    expect(cohortCell(1, 2)).toContain('۵۰');
    expect(trendChart([])).not.toMatch(/NaN|Infinity/);
    expect(trendChart([{ date: '<script>', registrations: 0, players: 0 }])).not.toContain(
        '<script>',
    );
});
test('profile editing only sends validated fields and carries the previous values for conflict detection', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const profile = { name: 'Player', age: 25, gender: 'female' as const };
    const expected = { name: 'Old', age: 24, gender: 'undisclosed' };
    const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({ id, profile })));
    await new AdminClient(request).updateProfile(
        id,
        { profile, expected },
        new AbortController().signal,
    );
    expect(request.mock.calls[0][1]).toMatchObject({
        method: 'PATCH',
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ profile, expected }),
    });
    const form = accountMarkup(
        'complete',
        1,
        {},
        { id, name: '<img>', username: 'fixture' },
        '',
        false,
    );
    expect(form).not.toContain('checked');
    expect(form.match(/name="gender"/g)).toHaveLength(2);
    expect(form).not.toContain('<img>');
    expect(form).not.toContain('data-account="done"');
});
