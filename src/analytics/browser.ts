import { apiBase, playerIdentity } from '../account/identity';
import {
    analyticsPreferenceSchema,
    interactionSchema,
} from '../online/shared/src/analytics/analytics.schemas';
import { remoteIdentity } from '../account/transportIdentity';
import { AnalyticsRecorder, type EventName, type EventContext } from './recorder';
import { eventPersistence } from './persistence';
import { deviceDiagnostics } from './device';

const ownerKey = () => playerIdentity()?.id ?? 'guest';
let enabled = false,
    owner: string | null = null,
    initialized = false;
let configuring: Promise<void> | null = null;
let parentRoot: HTMLElement | null = null;
let settings: Promise<void> | null = null;
let preferenceGeneration = 0;
let lastPreferenceAt = 0;
let activeAt = 0,
    tickAt = 0;
let currentMode: EventContext['mode'] = 'hub';
const recorder = new AnalyticsRecorder(
    async (events) => {
        const expected = owner;
        if (!expected || ownerKey() !== expected) throw new Error('Identity changed');
        const id = await remoteIdentity(expected);
        if (ownerKey() !== expected) throw new Error('Identity changed');
        const response = await fetch(`${apiBase()}/api/v1/analytics/events`, {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: id, events, device: deviceDiagnostics() }),
            signal: AbortSignal.timeout(5000),
        });
        if (response.status === 403 && ownerKey() === expected) {
            try {
                if ((await preference(undefined, id)) === false) setEnabled(false);
            } catch {
                /* Keep unacknowledged events for the original owner. */
            }
        }
        if (!response.ok) throw new Error('Analytics unavailable');
    },
    import.meta.env.VITE_BUILD_ID || 'development',
);
function cached(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}
function savePreference(value: boolean) {
    try {
        localStorage.setItem('sunmark-analytics-enabled:' + owner, value ? '1' : '0');
    } catch {
        /* Memory fallback. */
    }
}
function setEnabled(value: boolean) {
    if (enabled === value) {
        if (!value) recorder.setEnabled(false);
        return;
    }
    enabled = value;
    recorder.setEnabled(value);
    activeAt = tickAt = performance.now();
    if (value) recorder.track('app_open');
}
export const analytics = {
    track: (name: EventName, data: EventContext = {}) => {
        if (ownerKey() !== owner) {
            recorder.suspend();
            enabled = false;
            return;
        }
        if (data.mode) currentMode = data.mode;
        recorder.track(name, data);
    },
    flush: async () => {
        for (let i = 0; i < 2; i++) await recorder.flush();
    },
};
async function preference(value?: boolean, expectedId?: string) {
    const expected = ownerKey(),
        id = expectedId ?? (await remoteIdentity(expected));
    const response = await fetch(`${apiBase()}/api/v1/analytics/preference`, {
        method: value === undefined ? 'GET' : 'PUT',
        credentials: 'include',
        cache: 'no-store',
        ...(value === undefined
            ? {}
            : {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accountId: id, enabled: value }),
              }),
        signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('Preference unavailable');
    const result = analyticsPreferenceSchema.parse(await response.json());
    if (result.accountId !== id || expected !== ownerKey()) throw new Error('Identity changed');
    if (result.enabled !== null) savePreference(result.enabled);
    return result.enabled;
}
export function configureAnalytics(parent: HTMLElement, force = false): Promise<void> {
    parentRoot = parent;
    if (import.meta.env.VITE_ONLINE_ENABLED === 'false') return Promise.resolve();
    const key = ownerKey();
    if (key !== owner) {
        recorder.suspend();
        enabled = false;
        owner = key;
        try {
            recorder.attach(eventPersistence(localStorage, key));
        } catch {
            recorder.attach(null);
        }
        const pending = cached('sunmark-analytics-optout:' + key) === '1';
        setEnabled(!pending && cached('sunmark-analytics-enabled:' + key) !== '0');
    }
    initializeListeners();
    if (force) return showSettings(parent, key);
    if (configuring) return Promise.resolve();
    const task = configureAnalyticsOnce().finally(() => {
        if (configuring === task) configuring = null;
    });
    configuring = task;
    // Start play immediately; preference reconciliation and uploads are background work.
    return Promise.resolve();
}
async function configureAnalyticsOnce() {
    const key = ownerKey(),
        generation = preferenceGeneration;
    try {
        const id = await remoteIdentity(key);
        const pending = cached('sunmark-analytics-optout:' + key) === '1';
        const current = await preference(pending ? false : undefined, id);
        if (ownerKey() !== key || owner !== key || preferenceGeneration !== generation) return;
        if (pending)
            try {
                localStorage.removeItem('sunmark-analytics-optout:' + key);
            } catch {
                /* Optional storage. */
            }
        setEnabled(current === true);
        lastPreferenceAt = performance.now();
        void analytics.flush();
    } catch {
        /* Cached preference remains usable offline. */
    }
}
function showSettings(parent: HTMLElement, key: string): Promise<void> {
    if (settings) return settings;
    const task = new Promise<void>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'account-dialog';
        dialog.dir = 'rtl';
        dialog.setAttribute('aria-label', 'آمار پایهٔ بازی');
        dialog.innerHTML = `<section class="account-card"><p class="account-eyebrow">کمک به بهترشدن سان‌مارک</p><h1>آمار پایهٔ بازی</h1><p class="account-description">زمان تقریبی استفادهٔ فعال، بازگشت، پیشرفت آموزش و نوع اقدام‌ها برای بهترشدن بازی ثبت می‌شوند. این آمار به حساب یا شناسهٔ مهمان این مرورگر متصل است و فقط مدیر بازی آن را می‌بیند.</p><p class="account-note">رمز، کلید بازیابی، متن نوشته‌ها، موقعیت مکانی و دست‌های مخفی در این آمار ثبت نمی‌شوند. مشخصات مرورگر، سیستم، صفحه و نشانی اتصال برای رفع اشکال ذخیره می‌شوند. مشخصات فنی و نشانی اتصال پس از ۳۰ روز پاک می‌شوند. فعالیت آفلاین در مرورگر می‌ماند و پس از اتصال فرستاده می‌شود. رویدادهای خام با دورهٔ ۹۰روزه پاک می‌شوند؛ زمان اولین و آخرین فعالیت تا خاموش‌کردن این گزینه می‌ماند. هر زمان از بخش حساب می‌توانی این گزینه را خاموش کنی؛ با خاموش‌کردن، رویدادهای ذخیره‌شدهٔ حساب پاک می‌شوند. بازی به این انتخاب وابسته نیست.</p><button class="account-primary" data-choice="yes">روشن‌کردن آمار پایه</button><button data-choice="no">خاموش‌کردن و حذف رویدادها</button><button data-choice="later">بستن تنظیمات</button><p class="account-error" role="alert"></p></section>`;
        const close = () => {
            dialog.close();
            dialog.remove();
            resolve();
        };
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            close();
        });
        dialog.addEventListener('click', (event) => {
            const choice =
                event.target instanceof Element
                    ? event.target.closest<HTMLElement>('[data-choice]')?.dataset.choice
                    : undefined;
            if (!choice) return;
            if (ownerKey() !== key) {
                close();
                return;
            }
            if (choice === 'later') {
                close();
                return;
            }
            preferenceGeneration++;
            for (const button of dialog.querySelectorAll('button')) button.disabled = true;
            // Stop immediately on opt-out, even if the server cannot be reached.
            if (choice === 'no') {
                setEnabled(false);
                try {
                    localStorage.setItem('sunmark-analytics-optout:' + key, '1');
                    localStorage.setItem('sunmark-analytics-enabled:' + key, '0');
                } catch {
                    /* Optional preference storage. */
                }
                close();
                void preference(false)
                    .then(() => {
                        try {
                            localStorage.removeItem('sunmark-analytics-optout:' + key);
                        } catch {
                            /* Retried later if storage is blocked. */
                        }
                    })
                    .catch(() => {});
                return;
            }
            void preference(true)
                .then((value) => {
                    if (ownerKey() !== key) {
                        close();
                        return;
                    }
                    try {
                        localStorage.removeItem('sunmark-analytics-optout:' + key);
                    } catch {
                        /* Optional preference storage. */
                    }
                    setEnabled(value === true);
                    close();
                })
                .catch(() => {
                    const error = dialog.querySelector('.account-error');
                    if (error)
                        error.textContent =
                            'ذخیره انتخاب انجام نشد؛ می‌توانی فعلاً بدون تغییر ادامه بدهی.';
                    for (const button of dialog.querySelectorAll('button')) button.disabled = false;
                });
        });
        parent.append(dialog);
        dialog.showModal();
    });
    settings = task.finally(() => {
        settings = null;
    });
    return settings;
}

function initializeListeners() {
    if (initialized) return;
    initialized = true;
    const active = () => {
        const now = performance.now();
        if (enabled && now - activeAt > 30 * 60000) {
            recorder.newSession();
            recorder.track('app_open');
        }
        activeAt = now;
    };
    document.addEventListener('pointerdown', active, { passive: true });
    document.addEventListener('keydown', active);
    document.addEventListener(
        'submit',
        (event) => {
            if (event.target instanceof Element && event.target.closest('.account-dialog'))
                analytics.track('ui_interaction', {
                    mode: currentMode,
                    interaction: 'account-submit',
                });
        },
        true,
    );
    document.addEventListener(
        'click',
        (event) => {
            const target =
                event.target instanceof Element
                    ? event.target.closest<HTMLButtonElement>(
                          'button[data-action],button[data-online],button[data-account]',
                      )
                    : null;
            if (!target || target.disabled) return;
            const interaction = interactionSchema.safeParse(
                target.dataset.online
                    ? 'room-' + target.dataset.online.split(':')[0]
                    : target.dataset.account
                      ? 'account-' + target.dataset.account.split(':')[0]
                      : target.dataset.action?.split(':')[0],
            );
            if (interaction.success)
                analytics.track('ui_interaction', {
                    mode: currentMode,
                    interaction: interaction.data,
                });
        },
        true,
    );
    const heartbeat = () => {
        const now = performance.now();
        if (enabled && now - activeAt <= 60000)
            recorder.track('heartbeat', {
                mode: currentMode,
                activeMs: Math.max(0, Math.min(30000, Math.round(now - tickAt))),
            });
        tickAt = now;
    };
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) heartbeat();
        else tickAt = performance.now();
        analytics.track('app_visibility', { mode: currentMode, visible: !document.hidden });
        if (document.hidden) void analytics.flush();
    });
    window.addEventListener('pagehide', () => {
        if (!document.hidden) heartbeat();
        void analytics.flush();
    });
    window.addEventListener('sunmark:identity', () => {
        if (parentRoot) void configureAnalytics(parentRoot);
    });
    window.addEventListener('online', () => {
        analytics.track('connection_changed', { mode: currentMode, connected: true });
        if (parentRoot) void configureAnalytics(parentRoot);
    });
    window.addEventListener('offline', () =>
        analytics.track('connection_changed', { mode: currentMode, connected: false }),
    );
    window.addEventListener('storage', (event) => {
        preferenceGeneration++;
        if (
            event.key === 'sunmark-analytics-optout:' + owner ||
            event.key === 'sunmark-analytics-enabled:' + owner
        ) {
            if (
                cached('sunmark-analytics-optout:' + owner) === '1' ||
                cached('sunmark-analytics-enabled:' + owner) === '0'
            )
                setEnabled(false);
        }
    });
    window.setInterval(() => {
        if (!document.hidden) heartbeat();
        else tickAt = performance.now();
        if (navigator.onLine) {
            void analytics.flush();
            if (parentRoot && performance.now() - lastPreferenceAt > 5 * 60000)
                void configureAnalytics(parentRoot);
        }
    }, 30000);
}
