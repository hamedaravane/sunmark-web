import { expect, test, vi, afterEach } from 'vitest';

function disk(): Storage {
    const data = new Map<string, string>();
    return {
        get length() {
            return data.size;
        },
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => {
            data.set(k, v);
        },
        removeItem: (k) => {
            data.delete(k);
        },
        key: (i) => [...data.keys()][i] ?? null,
        clear: () => data.clear(),
    };
}
afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.useRealTimers();
});
test('starts guest measurement offline without a dialog and uploads the same stored events after reconnect', async () => {
    vi.useFakeTimers();
    const localStorage = disk(),
        window = new EventTarget(),
        document = new EventTarget();
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('window', Object.assign(window, { setInterval: globalThis.setInterval }));
    vi.stubGlobal('document', Object.assign(document, { hidden: false }));
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('location', {
        origin: 'https://fixture.test',
        protocol: 'https:',
        hostname: 'fixture.test',
    });
    let connected = false;
    const accepted: unknown[] = [];
    const guest = '60000000-0000-4000-8000-000000000000';
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (url, options) => {
        if (!connected) throw new Error('offline');
        if (String(url).endsWith('/session')) return Response.json({ id: guest, name: 'Guest' });
        if (String(url).endsWith('/preference'))
            return Response.json({ accountId: guest, enabled: true });
        if (String(url).endsWith('/events')) {
            accepted.push(JSON.parse(String(options?.body)));
            return Response.json({ accepted: 1 }, { status: 201 });
        }
        throw new Error('Unexpected route');
    });
    vi.stubGlobal('fetch', fetch);
    const { configureAnalytics, analytics } = await import('../src/analytics/browser');
    await configureAnalytics({} as HTMLElement);
    analytics.track('match_entered', { mode: 'offline' });
    expect(
        [...Array(localStorage.length)]
            .map((_, i) => localStorage.key(i))
            .filter((k) => k?.startsWith('sunmark.analytics.v2:guest:')).length,
    ).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    connected = true;
    vi.stubGlobal('navigator', { onLine: true });
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(100);
    expect(accepted.length).toBeGreaterThan(0);
    expect(JSON.stringify(accepted)).toContain('match_entered');
    expect(JSON.stringify(accepted)).toContain(guest);
});

test('offline rewards synchronize on reconnect and a response after account switching cannot acknowledge the old queue', async () => {
    vi.useFakeTimers();
    const localStorage = disk(),
        window = new EventTarget(),
        document = new EventTarget();
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('window', Object.assign(window, { setInterval: globalThis.setInterval }));
    vi.stubGlobal('document', Object.assign(document, { hidden: false }));
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('location', {
        origin: 'https://fixture.test',
        protocol: 'https:',
        hostname: 'fixture.test',
    });
    const { saveIdentity } = await import('../src/account/identity');
    const { ProgressionStore } = await import('../src/game/progression/progression');
    const { emptyProfile, applyOfflineCommand } =
        await import('../src/online/shared/src/online/offlineProgression');
    const { synchronizeOfflineProgression } = await import('../src/account/offlineSync');
    const id = '60000000-0000-4000-8000-000000000000';
    saveIdentity({ id, name: 'Fixture', username: 'fixture' });
    const store = new ProgressionStore(localStorage);
    store.completePractice();
    let server = emptyProfile(),
        resolve: ((response: Response) => void) | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async (_url, options) => {
        const body = JSON.parse(String(options?.body));
        server = body.commands.reduce(applyOfflineCommand, body.baseline ?? server);
        return new Promise<Response>((done) => {
            resolve = () =>
                done(
                    Response.json({
                        accountId: id,
                        profile: server,
                        revision: 1,
                        acknowledged: body.commands.map((c: { id: string }) => c.id),
                    }),
                );
        });
    });
    vi.stubGlobal('fetch', fetch);
    const close = synchronizeOfflineProgression(store, id);
    expect(fetch).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', { onLine: true });
    window.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    saveIdentity({
        id: '70000000-0000-4000-8000-000000000000',
        name: 'Another',
        username: 'another',
    });
    resolve?.(Response.json({}));
    await vi.advanceTimersByTimeAsync(1);
    expect(store.synchronization.pending).toBe(1);
    expect(store.snapshot.practice).toBe(true);
    close();
});

test('opens settings without a connection and applies withdrawal immediately without waiting for the server', async () => {
    vi.useFakeTimers();
    class Node extends EventTarget {
        dataset: Record<string, string> = {};
        className = '';
        dir = '';
        innerHTML = '';
        setAttribute() {}
        closest() {
            return this.dataset.choice ? this : null;
        }
        querySelectorAll() {
            return [];
        }
        querySelector() {
            return null;
        }
        showModal() {}
        close() {}
        remove() {}
        append() {}
    }
    const localStorage = disk(),
        window = new EventTarget();
    let dialog: Node | undefined,
        created = 0;
    vi.stubGlobal('Element', Node);
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('window', Object.assign(window, { setInterval: globalThis.setInterval }));
    vi.stubGlobal(
        'document',
        Object.assign(new EventTarget(), {
            hidden: false,
            createElement: () => {
                created++;
                dialog = new Node();
                return dialog;
            },
        }),
    );
    vi.stubGlobal('navigator', { onLine: false });
    vi.stubGlobal('location', {
        origin: 'https://fixture.test',
        protocol: 'https:',
        hostname: 'fixture.test',
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')));
    const { configureAnalytics, analytics } = await import('../src/analytics/browser');
    const parent = new Node() as unknown as HTMLElement;
    await configureAnalytics(parent);
    expect(created).toBe(0);
    const settings = configureAnalytics(parent, true);
    expect(created).toBe(1);
    if (!dialog) throw new Error('Settings did not open');
    dialog.dataset.choice = 'no';
    dialog.dispatchEvent(new Event('click'));
    await settings;
    analytics.track('match_entered', { mode: 'offline' });
    expect(localStorage.getItem('sunmark-analytics-optout:guest')).toBe('1');
    expect(localStorage.getItem('sunmark-analytics-enabled:guest')).toBe('0');
    expect(
        [...Array(localStorage.length)]
            .map((_, i) => localStorage.key(i))
            .filter((k) => k?.startsWith('sunmark.analytics.v2:guest:')),
    ).toHaveLength(0);
});
