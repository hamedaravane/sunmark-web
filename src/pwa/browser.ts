import type { AppPlatform } from './app';

interface InstallEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** No automatic reloads: another tab activating a worker must not interrupt this match. */
export function connectPlatform(app: AppPlatform, production = import.meta.env.PROD): () => void {
    const removers: Array<() => void> = [];
    const listen = (target: EventTarget, event: string, handler: EventListener) => {
        target.addEventListener(event, handler);
        removers.push(() => target.removeEventListener(event, handler));
    };
    const standalone = window.matchMedia('(display-mode: standalone)');
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    app.installed = standalone.matches || navigatorWithStandalone.standalone === true;
    app.ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    app.android = /Android/i.test(navigator.userAgent);
    app.chrome =
        /Chrome\//.test(navigator.userAgent) &&
        !/EdgA|OPR|SamsungBrowser/.test(navigator.userAgent);
    app.embedded =
        /Instagram|FBAN|FBAV|Telegram|Line\//i.test(navigator.userAgent) ||
        (app.ios &&
            /AppleWebKit/.test(navigator.userAgent) &&
            !/Safari|CriOS|FxiOS|EdgiOS/.test(navigator.userAgent));
    app.online = navigator.onLine;
    listen(standalone, 'change', () => {
        app.installed = standalone.matches || navigatorWithStandalone.standalone === true;
        app.changed();
    });
    listen(window, 'beforeinstallprompt', (event) => {
        event.preventDefault();
        const install = event as InstallEvent;
        app.installPrompt = async () => {
            await install.prompt();
            return (await install.userChoice).outcome;
        };
        app.changed();
    });
    listen(window, 'appinstalled', () => {
        app.installed = true;
        app.installPrompt = null;
        app.changed();
    });
    let registration: ServiceWorkerRegistration | undefined;
    let registering = false;
    let disposed = false;
    let lastCheck = 0;
    let controller = navigator.serviceWorker?.controller;
    let reloadRequired = false;
    let cancelActivation: (() => void) | undefined;
    const supported = production && window.isSecureContext && 'serviceWorker' in navigator;
    const fail = () => {
        if (disposed) return;
        if (!registration?.active) app.offline = 'error';
        app.changed();
    };
    const sync = () => {
        if (disposed || !registration) return;
        if (registration.active?.state === 'activated') app.offline = 'ready';
        app.updateReady =
            reloadRequired || (!!registration.waiting && !!navigator.serviceWorker.controller);
        app.changed();
    };
    const watchWorker = (worker: ServiceWorker | null) => {
        if (!worker) return;
        listen(worker, 'statechange', () => {
            if (worker.state === 'redundant' && !registration?.active) fail();
            else sync();
            // Let the registration's waiting reference settle after the state event.
            queueMicrotask(sync);
        });
    };
    const register = async () => {
        if (!supported || disposed || registering) return;
        registering = true;
        try {
            if (!registration) {
                const base = new URL(import.meta.env.BASE_URL, document.baseURI);
                registration = await navigator.serviceWorker.register(new URL('sw.js', base), {
                    scope: base.pathname,
                    updateViaCache: 'none',
                });
                if (disposed) return;
                watchWorker(registration.installing);
                watchWorker(registration.active);
                listen(registration, 'updatefound', () => watchWorker(registration!.installing));
                listen(navigator.serviceWorker, 'controllerchange', () => {
                    const next = navigator.serviceWorker.controller;
                    // A release accepted by another tab still needs consent to
                    // reload this page's older JavaScript and UI.
                    if (controller && next && next !== controller) reloadRequired = true;
                    controller = next;
                    sync();
                });
                sync();
            }
            if (!disposed) await registration.update();
        } catch {
            fail();
        } finally {
            registering = false;
        }
    };
    app.retry = () => {
        if (!registration?.active) app.offline = 'preparing';
        app.changed();
        void register();
    };
    app.activateUpdate = () =>
        new Promise<void>((resolve, reject) => {
            const worker = registration?.waiting;
            if (!worker) {
                if (reloadRequired) {
                    window.location.reload();
                    resolve();
                    return;
                }
                sync();
                reject(new Error('Update no longer waiting'));
                return;
            }
            const changed = () => {
                if (navigator.serviceWorker.controller !== worker) return;
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('controllerchange', changed);
                cancelActivation = undefined;
                resolve();
                window.location.reload();
            };
            const timeout = window.setTimeout(() => {
                navigator.serviceWorker.removeEventListener('controllerchange', changed);
                cancelActivation = undefined;
                reject(new Error('Activation timed out'));
            }, 15_000);
            navigator.serviceWorker.addEventListener('controllerchange', changed);
            cancelActivation = () => {
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('controllerchange', changed);
                cancelActivation = undefined;
                reject(new Error('Platform disconnected'));
            };
            try {
                worker.postMessage({ type: 'SKIP_WAITING' });
            } catch (error) {
                clearTimeout(timeout);
                navigator.serviceWorker.removeEventListener('controllerchange', changed);
                cancelActivation = undefined;
                reject(error);
            }
        });
    const check = () => {
        if (!navigator.onLine || document.visibilityState === 'hidden') return;
        if (Date.now() - lastCheck < 5 * 60_000 && registration) return;
        lastCheck = Date.now();
        void register();
    };
    listen(window, 'online', () => {
        app.online = true;
        app.changed();
        check();
    });
    listen(window, 'offline', () => {
        app.online = false;
        app.changed();
    });
    listen(window, 'focus', check);
    listen(document, 'visibilitychange', check);
    if (supported) {
        lastCheck = Date.now();
        void register();
        const interval = window.setInterval(check, 5 * 60_000);
        removers.push(() => window.clearInterval(interval));
    } else app.offline = 'unsupported';
    app.changed();
    return () => {
        disposed = true;
        cancelActivation?.();
        removers.forEach((remove) => remove());
    };
}
