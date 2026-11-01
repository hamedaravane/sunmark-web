import { describe, it, expect, vi } from 'vitest';
import {
    AnalyticsRecorder,
    type AnalyticsEvent,
    type EventContext,
    type EventName,
} from '../src/analytics/recorder';
import { observeMatch } from '../src/analytics/matchObserver';
import { GameSession } from '../src/game/ui/session';
import { analyticsEventSchema } from '../src/online/shared/src/analytics/analytics.schemas';
import { analyticsSummary } from '../src/admin/analyticsMarkup';

describe('optional analytics recorder', () => {
    it('sends nothing before consent and clears queued events immediately after withdrawal', async () => {
        const send = vi.fn<(events: AnalyticsEvent[]) => Promise<void>>().mockResolvedValue();
        const recorder = new AnalyticsRecorder(send);
        recorder.track('app_open');
        await recorder.flush();
        expect(send).not.toHaveBeenCalled();
        recorder.setEnabled(true);
        recorder.track('app_open');
        recorder.setEnabled(false);
        await recorder.flush();
        expect(send).not.toHaveBeenCalled();
    });
    it('retries the same immutable event IDs and removes acknowledged batches', async () => {
        const send = vi
            .fn<(events: AnalyticsEvent[]) => Promise<void>>()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValue();
        const recorder = new AnalyticsRecorder(send);
        recorder.setEnabled(true);
        recorder.track('match_entered', { mode: 'offline' });
        await recorder.flush();
        await recorder.flush();
        await recorder.flush();
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0]);
    });
    it('bounds the memory queue and batch size, rejects invalid metadata, and never throws transport failures', async () => {
        const send = vi.fn<(events: AnalyticsEvent[]) => Promise<void>>().mockResolvedValue();
        const recorder = new AnalyticsRecorder(send);
        recorder.setEnabled(true);
        recorder.track('heartbeat', { activeMs: 30001 });
        await recorder.flush();
        expect(send).not.toHaveBeenCalled();
        for (let i = 0; i < 150; i++) recorder.track('screen_view', { screen: 'board' });
        for (let i = 0; i < 10; i++) await recorder.flush();
        expect(send).toHaveBeenCalledTimes(5);
        expect(send.mock.calls.every((call) => call[0].length === 20)).toBe(true);
        expect(
            analyticsEventSchema.safeParse({
                id: crypto.randomUUID(),
                sessionId: crypto.randomUUID(),
                name: 'screen_view',
                build: 'development',
                data: { phone: '+15550000000' },
            }).success,
        ).toBe(false);
    });
    it('does not mix a previous identity queue into an enabled new session', async () => {
        let finish: () => void = () => {};
        const send = vi
            .fn<(events: AnalyticsEvent[]) => Promise<void>>()
            .mockImplementationOnce(
                () =>
                    new Promise<void>((resolve) => {
                        finish = resolve;
                    }),
            )
            .mockResolvedValue();
        const recorder = new AnalyticsRecorder(send);
        recorder.setEnabled(true);
        recorder.track('app_open');
        const pending = recorder.flush();
        recorder.setEnabled(false);
        recorder.setEnabled(true);
        recorder.track('app_open');
        finish();
        await pending;
        await recorder.flush();
        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][0][0].sessionId).not.toBe(send.mock.calls[1][0][0].sessionId);
    });
});

describe('match telemetry projection', () => {
    it('deduplicates observations and records tutorial acknowledgment without transmitting state or error text', () => {
        const session = new GameSession();
        const collected: { name: EventName; data: EventContext }[] = [];
        const observer = observeMatch(session, (name, data) => collected.push({ name, data }));
        session.start(4, false, 'Private fixture name');
        const count = collected.length;
        observer.refresh();
        expect(collected).toHaveLength(count);
        session.tutorial.replay('practice-intro');
        session.sheet = { kind: 'tutorial' };
        observer.refresh();
        session.tutorial.acknowledge();
        observer.refresh();
        session.error = 'private sensitive raw error';
        observer.refresh();
        observer.refresh();
        expect(collected.filter((event) => event.name === 'tutorial_shown')).toHaveLength(1);
        expect(collected.filter((event) => event.name === 'tutorial_acknowledged')).toHaveLength(1);
        expect(collected.filter((event) => event.name === 'action_rejected')).toHaveLength(1);
        expect(JSON.stringify(collected)).not.toContain('Private fixture');
        expect(JSON.stringify(collected)).not.toContain('sensitive raw error');
        for (const event of collected)
            expect(
                analyticsEventSchema.safeParse({
                    ...event,
                    id: crypto.randomUUID(),
                    sessionId: crypto.randomUUID(),
                    build: 'development',
                }).success,
            ).toBe(true);
        observer.destroy();
    });
    it('optional diagnostics cannot throw into gameplay observers', () => {
        const session = new GameSession();
        const observer = observeMatch(session, () => {
            throw new Error('analytics failed');
        });
        expect(() => session.start(4, false)).not.toThrow();
        expect(() => observer.refresh()).not.toThrow();
    });
});

it('shows insufficient retention history rather than invented percentages', () => {
    const html = analyticsSummary({
        days: 7,
        players: 0,
        sessions: 0,
        events: 0,
        activeSeconds: 0,
        optedInAccounts: 0,
        registeredAccounts: 7,
        d1: { eligible: 0, returned: 0 },
        d7: { eligible: 0, returned: 0 },
        daily: [],
        eventsByName: [],
        phases: [],
        builds: [],
        checkedAt: '2026-11-01T12:00:00.000Z',
    });
    expect(html).toContain('هنوز قابل محاسبه نیست');
    expect(html).not.toContain('NaN');
    expect(html).toContain('نمونه هنوز کوچک است');
});
