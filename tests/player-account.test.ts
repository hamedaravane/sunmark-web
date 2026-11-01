import { afterEach, expect, test, vi } from 'vitest';
import { accountMarkup } from '../src/account/markup';
import { playerIdentity, saveIdentity } from '../src/account/identity';
import { menuContent } from '../src/game/ui/menu';
import { AppPlatform } from '../src/pwa/app';
import { GameSession } from '../src/game/ui/session';
import { ScreenAwake, type ScreenLock } from '../src/pwa/screenAwake';
const identity = {
    id: '20000000-0000-4000-8000-000000000000',
    name: 'هم‌سفر',
    username: 'traveler',
};
afterEach(() => {
    saveIdentity(null);
    vi.unstubAllGlobals();
});
test('account onboarding separates a short introduction from credentials and escapes identity', () => {
    const first = accountMarkup('register', 1, {}, null, '', true);
    expect(first).toContain('autocomplete="tel"');
    expect(first).not.toContain('name="password"');
    const second = accountMarkup(
        'register',
        2,
        { username: '"><script>bad</script>' },
        null,
        '',
        true,
    );
    expect(second).not.toContain('<script>');
    expect(second).toContain('autocomplete="new-password"');
    expect(second).toContain('value="undisclosed"');
    expect(accountMarkup('login', 1, {}, null, '', false)).toContain(
        'autocomplete="current-password"',
    );
    expect(accountMarkup('recover', 1, {}, null, '', false)).toContain('name="recoveryCode"');
});
test('only public identity is cached, and blocked storage still supports this session', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem, removeItem: vi.fn() });
    saveIdentity({ ...identity, phone: 'private', password: 'private' } as typeof identity);
    expect(setItem).toHaveBeenCalledWith('sunmark-player', JSON.stringify(identity));
    vi.stubGlobal('localStorage', {
        setItem: () => {
            throw new Error('blocked');
        },
    });
    saveIdentity(identity);
    expect(playerIdentity()).toEqual(identity);
});
test('offline games and practice use the account name without another name prompt', () => {
    saveIdentity(identity);
    const game = new GameSession();
    game.requestPlay();
    expect(game.humanPlayer?.name).toBe(identity.name);
    expect(game.sheet?.kind).toBe('introduction');
    const practice = new GameSession();
    practice.requestPlay(true);
    expect(practice.humanPlayer?.name).toBe(identity.name);
});
test('screen lock is released on inactivity and reacquired on return', async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ release, addEventListener: vi.fn() }));
    const awake = new ScreenAwake(request);
    awake.setActive(true);
    await Promise.resolve();
    awake.setActive(true);
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(1);
    awake.setActive(false);
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
    awake.setActive(true);
    await Promise.resolve();
    expect(request).toHaveBeenCalledTimes(2);
    awake.destroy();
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(2);
});
test('a late screen-lock grant is released after the match ends', async () => {
    let grant: ((lock: ScreenLock) => void) | undefined;
    const request = new Promise<ScreenLock>((resolve) => {
        grant = resolve;
    });
    const release = vi.fn(async () => {});
    const awake = new ScreenAwake(() => request);
    awake.setActive(true);
    awake.destroy();
    grant?.({ release, addEventListener: vi.fn() });
    await request;
    await Promise.resolve();
    expect(release).toHaveBeenCalledTimes(1);
});
test('unavailable or denied wake locks never block the game', async () => {
    const unsupported = new ScreenAwake(null);
    unsupported.setActive(true);
    unsupported.destroy();
    const denied = new ScreenAwake(async () => {
        throw new Error('denied');
    });
    denied.setActive(true);
    await Promise.resolve();
    denied.destroy();
});

test('the shared menu escapes an account display name', () => {
    saveIdentity({ ...identity, name: '<img src=x>' });
    const menu = menuContent(new AppPlatform(), new GameSession());
    expect(menu).not.toContain('<img src=x>');
    expect(menu).toContain('&lt;img src=x&gt;');
});
