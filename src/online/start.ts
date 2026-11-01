import { restoreIdentity } from '../account/identity';
import { showAccount } from '../account/account';
import { Game, AUTO, Scale } from 'phaser';
import { OnlineClient } from './client';
import { RoomScene } from './roomScene';
import { OnlineSession } from './session';
import { mountMatch } from '../game/matchRuntime';
import { AppPlatform } from '../pwa/app';
import { newDrafts, onlineMarkup } from './markup';
import { canvasPixelSize } from '../game/rendering/displayGeometry';
import './style.css';

export function startOnline(root: HTMLElement, onExit: () => void) {
    let storage: Storage | null = null;
    try {
        storage = localStorage;
    } catch {
        /* Optional storage. */
    }
    const base = String(
        import.meta.env.VITE_API_BASE_URL ||
            (import.meta.env.DEV
                ? `${location.protocol}//${location.hostname}:3000`
                : location.origin),
    ).replace(/\/$/, '');
    const client = new OnlineClient(base, storage);
    let disposed = false;
    let accountOpen = false;
    const draft = newDrafts();
    const invite = new URL(location.href).searchParams.get('invite');
    if (invite) {
        draft.code = invite;
        draft.screen = 'join';
    }
    root.className = 'online-root';
    const canvas = document.createElement('div');
    canvas.className = 'online-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    const semantics = document.createElement('div');
    semantics.className = 'online-semantics';
    semantics.dir = 'rtl';
    root.append(canvas, semantics);
    const scene = new RoomScene(semantics);
    const game = new Game({
        type: AUTO,
        parent: canvas,
        width: root.clientWidth || 390,
        height: root.clientHeight || 844,
        backgroundColor: '#111b3b',
        scale: { mode: Scale.NONE },
        scene,
    });
    let shared: { game: Game; session: OnlineSession; root: HTMLElement } | null = null;
    const render = () => {
        if (disposed) return;
        if (client.snapshot?.game) {
            if (!shared) {
                canvas.hidden = true;
                semantics.hidden = true;
                game.loop.sleep();
                const matchRoot = document.createElement('div');
                root.append(matchRoot);
                const session = new OnlineSession(client, () => client.back());
                shared = {
                    root: matchRoot,
                    session,
                    game: mountMatch(matchRoot, session, new AppPlatform()),
                };
            }
            return;
        }
        if (shared) {
            shared.game.destroy(true);
            shared.session.destroy();
            shared.root.remove();
            shared = null;
            canvas.hidden = false;
            semantics.hidden = false;
            game.loop.wake();
        }
        const focus = semantics.querySelector<HTMLInputElement>('input:focus');
        const key = focus?.dataset.draft,
            caret = focus?.selectionStart;
        const scroll = semantics.querySelector('.online-panel')?.scrollTop ?? 0;
        semantics.innerHTML = onlineMarkup(client, draft);
        const panel = semantics.querySelector('.online-panel');
        if (panel) panel.scrollTop = scroll;
        if (key) {
            const input = semantics.querySelector<HTMLInputElement>(`input[data-draft="${key}"]`);
            input?.focus({ preventScroll: true });
            if (caret != null) input?.setSelectionRange(caret, caret);
        }
        scene.invalidate();
    };
    const click = (event: MouseEvent) => {
        const button =
            event.target instanceof Element
                ? event.target.closest<HTMLButtonElement>('button[data-online]')
                : null;
        if (!button || button.disabled) return;
        const [action, ...parts] = (button.dataset.online ?? '').split(':');
        const value = parts.join(':');
        switch (action) {
            case 'account':
                if (accountOpen) break;
                accountOpen = true;
                void showAccount(root, false, true)
                    .then(async () => {
                        if (disposed) return;
                        if (await restoreIdentity()) {
                            await client.initialize();
                            if (!client.snapshot && !client.pending)
                                await client.quickMatch('poll');
                        }
                        render();
                    })
                    .finally(() => {
                        accountOpen = false;
                    });
                break;
            case 'quick':
                void client.quickMatch();
                break;
            case 'cancel-search':
                void client.quickMatch('cancel');
                break;
            case 'exit':
                onExit();
                break;
            case 'screen':
                if (value === 'home' || value === 'join') draft.screen = value;
                draft.notice = '';
                render();
                semantics.querySelector<HTMLInputElement>('input')?.focus();
                break;
            case 'create':
                void client.create();
                break;
            case 'join':
                void client.join(draft.code.trim().toLowerCase());
                break;
            case 'open':
                void client.open(value);
                break;
            case 'back':
                client.back();
                break;
            case 'ready':
                void client.lobby({
                    kind: 'ready',
                    ready: !client.snapshot?.seats.find((s) => s.isYou)?.ready,
                });
                break;
            case 'bot':
                void client.lobby({
                    kind: 'bot',
                    seat: Number(parts[0]),
                    enabled: parts[1] === 'true',
                });
                break;
            case 'start':
                void client.lobby({ kind: 'start' });
                break;
            case 'invite': {
                const url = new URL(location.href);
                url.searchParams.set('invite', client.snapshot?.code ?? '');
                void (async () => {
                    try {
                        if (!navigator.clipboard) throw new Error('unavailable');
                        await navigator.clipboard.writeText(url.href);
                        draft.notice = 'پیوند دعوت کپی شد.';
                    } catch {
                        draft.notice = `کد دعوت: ${client.snapshot?.code ?? ''}`;
                    }
                    render();
                })();
                break;
            }
        }
    };
    const input = (event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const key = event.target.dataset.draft;
        if (key === 'code') {
            draft.code = event.target.value
                .replace(/[۰-۹٠-٩]/g, (c) =>
                    String(c.charCodeAt(0) - (c >= '۰' && c <= '۹' ? 1776 : 1632)),
                )
                .trim();
            event.target.value = draft.code;
        }
        const join = semantics.querySelector<HTMLButtonElement>('button[data-online="join"]');
        if (join) join.disabled = client.busy || !/^(?:[0-9]{5}|[a-f0-9]{12})$/i.test(draft.code);
        scene.invalidate();
    };
    const keydown = (event: KeyboardEvent) => {
        if (
            event.key === 'Enter' &&
            event.target instanceof HTMLInputElement &&
            event.target.dataset.draft === 'code' &&
            /^(?:[0-9]{5}|[a-f0-9]{12})$/i.test(draft.code)
        ) {
            event.preventDefault();
            void client.join(draft.code.toLowerCase());
        }
    };
    semantics.addEventListener('keydown', keydown);
    semantics.addEventListener('click', click);
    semantics.addEventListener('input', input);
    const resize = () => {
        if (root.clientWidth && root.clientHeight) {
            const size = canvasPixelSize(
                root.clientWidth,
                root.clientHeight,
                window.devicePixelRatio,
            );
            game.scale.resize(size.width, size.height);
            scene.invalidate();
        }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(root);
    window.addEventListener('resize', resize);
    const disconnect = client.subscribe(render);
    render();
    void (async () => {
        // Existing guest cookies are upgraded explicitly; they are not accounts.
        try {
            const response = await fetch(`${base}/api/v1/online/account`, {
                credentials: 'include',
                signal: AbortSignal.timeout(10_000),
            });
            if (disposed || !response.ok) return;
            await restoreIdentity();
            await client.initialize();
            if (!client.snapshot && !client.pending) await client.quickMatch('poll');
        } catch {
            client.error = 'اتصال برقرار نشد. برای ورود دوباره تلاش کن.';
            render();
        }
    })();
    return {
        client,
        destroy() {
            disposed = true;
            disconnect();
            semantics.removeEventListener('keydown', keydown);
            shared?.game.destroy(true);
            shared?.session.destroy();
            shared?.root.remove();
            client.destroy();
            observer.disconnect();
            window.removeEventListener('resize', resize);
            semantics.removeEventListener('click', click);
            semantics.removeEventListener('input', input);
            game.destroy(true);
        },
    };
}
