import { expect, test, vi, afterEach } from 'vitest';
import { AnalyticsRecorder, type AnalyticsEvent } from '../src/analytics/recorder';
import { eventPersistence } from '../src/analytics/persistence';
import { ProgressionStore } from '../src/game/progression/progression';
import {
    applyOfflineCommand,
    emptyProfile,
} from '../src/online/shared/src/online/offlineProgression';
import { analyticsTimeline } from '../src/admin/analyticsMarkup';

function storage(): Storage {
    const data = new Map<string, string>();
    return {
        get length() {
            return data.size;
        },
        clear: () => data.clear(),
        getItem: (key) => data.get(key) ?? null,
        key: (i) => [...data.keys()][i] ?? null,
        removeItem: (key) => {
            data.delete(key);
        },
        setItem: (key, value) => {
            data.set(key, value);
        },
    };
}
afterEach(() => vi.unstubAllGlobals());
test('offline events survive closing the app, preserve occurrence times and retry the same IDs after a lost acknowledgment', async () => {
    const disk = storage();
    const send = vi
        .fn<(e: AnalyticsEvent[]) => Promise<void>>()
        .mockRejectedValueOnce(new Error('lost ack'))
        .mockResolvedValue();
    const one = new AnalyticsRecorder(send);
    one.attach(eventPersistence(disk, 'a'));
    one.setEnabled(true);
    one.track('match_entered', { mode: 'offline' });
    const saved = eventPersistence(disk, 'a').read();
    expect(saved).toHaveLength(1);
    expect(saved[0].occurredAt).toBeTruthy();
    const two = new AnalyticsRecorder(send);
    two.attach(eventPersistence(disk, 'a'));
    two.setEnabled(true);
    await two.flush();
    await two.flush();
    expect(send.mock.calls[0][0]).toEqual(saved);
    expect(send.mock.calls[1][0]).toEqual(saved);
    expect(eventPersistence(disk, 'a').read()).toHaveLength(0);
});
test('acknowledging one tab does not discard another tab event; withdrawal deletes only that owner', async () => {
    const disk = storage();
    let finish = () => {};
    const recorder = new AnalyticsRecorder(
        () =>
            new Promise<void>((resolve) => {
                finish = resolve;
            }),
    );
    recorder.attach(eventPersistence(disk, 'a'));
    recorder.setEnabled(true);
    recorder.track('app_open');
    const sending = recorder.flush();
    const other = new AnalyticsRecorder(async () => {});
    other.attach(eventPersistence(disk, 'a'));
    other.setEnabled(true);
    other.track('screen_view', { screen: 'board' });
    finish();
    await sending;
    expect(eventPersistence(disk, 'a').read()).toHaveLength(1);
    other.suspend();
    other.attach(eventPersistence(disk, 'b'));
    other.setEnabled(true);
    other.track('app_open');
    recorder.setEnabled(false);
    expect(eventPersistence(disk, 'a').read()).toHaveLength(0);
    expect(eventPersistence(disk, 'b').read()).toHaveLength(1);
});
test('pending rewards and purchases survive restart and reconcile without discarding work performed during upload', () => {
    const disk = storage(),
        one = new ProgressionStore(disk);
    const match = crypto.randomUUID();
    one.completeMatch(match, true);
    const restored = new ProgressionStore(disk);
    const request = restored.syncRequest();
    expect(request.commands).toHaveLength(1);
    let server = request.commands.reduce(applyOfflineCommand, request.baseline ?? emptyProfile());
    restored.completePractice();
    restored.reconcile(
        server,
        1,
        request.commands.map((c) => c.id),
    );
    expect(restored.snapshot).toMatchObject({ xp: 400, coins: 105, matches: 1, practice: true });
    expect(restored.synchronization.pending).toBe(1);
    const next = restored.syncRequest();
    server = next.commands.reduce(applyOfflineCommand, server);
    restored.reconcile(
        server,
        2,
        next.commands.map((c) => c.id),
    );
    expect(restored.synchronization.pending).toBe(0);
    expect(restored.completeMatch(match, true)).toBeNull();
    expect(new ProgressionStore(disk).snapshot).toEqual(server);
});
test('server reconciliation rebases a conflicting cosmetic purchase without allowing a negative wallet', () => {
    const disk = storage(),
        one = new ProgressionStore(disk);
    one.completePractice();
    one.completeMatch(crypto.randomUUID(), true);
    const first = one.syncRequest();
    let canonical = first.commands.reduce(applyOfflineCommand, first.baseline ?? emptyProfile());
    one.reconcile(
        canonical,
        2,
        first.commands.map((c) => c.id),
    );
    expect(one.equip('turquoise')).toBe(true);
    // Another device has spent the available balance before our queued purchase reaches the server.
    canonical = { ...canonical, coins: 0 };
    one.reconcile(canonical, 3, []);
    expect(one.snapshot.coins).toBe(0);
    expect(one.snapshot.owned).toEqual(['sun']);
});
test('a reload imports a legacy profile once and keeps a backup when the canonical account already exists', () => {
    const disk = storage(),
        original = emptyProfile();
    original.name = 'Fixture';
    disk.setItem('legacy', JSON.stringify(original));
    const store = new ProgressionStore(disk, 'legacy');
    expect(store.syncRequest().baseline).toEqual(original);
    store.reconcile(emptyProfile(), 0, []);
    expect(store.syncRequest().baseline).toBeUndefined();
    expect(disk.getItem('legacy:legacy-backup')).toBe(JSON.stringify(original));
});
test('admin diagnostics escape device strings and expose offline progress independently of online counters', () => {
    const text = analyticsTimeline({
        enabled: true,
        firstSeen: null,
        lastSeen: null,
        events: [],
        offlineProgression: {
            profile: emptyProfile(),
            revision: 0,
            updatedAt: '2026-11-04T00:00:00Z',
        },
        devices: [
            {
                device: {
                    installationId: crypto.randomUUID(),
                    userAgent: '<script>unsafe</script>',
                    platform: 'Fixture OS',
                    language: 'fa',
                    screenWidth: 390,
                    screenHeight: 844,
                    viewportWidth: 390,
                    viewportHeight: 844,
                    pixelRatio: 2,
                    touchPoints: 5,
                },
                networkPeer: '127.0.0.1',
                lastSeen: '2026-11-04T00:00:00Z',
            },
        ],
    });
    expect(text).not.toContain('<script>');
    expect(text).toContain('&lt;script&gt;');
    expect(text).toContain('پیشرفت آفلاین همگام‌شده');
});
