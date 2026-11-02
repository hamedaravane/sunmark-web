import { apiBase, playerIdentity } from '../account/identity';
import { analyticsPreferenceSchema } from '../online/shared/src/analytics/analytics.schemas';
import { AnalyticsRecorder, type EventName, type EventContext } from './recorder';

let enabled = false;
let owner: string | null = null;
let initialized = false;
let configuring: Promise<void> | null = null;
let activeAt = 0;
let tickAt = 0;
let currentMode: EventContext['mode'] = 'hub';
const recorder = new AnalyticsRecorder(
    async (events) => {
        if (!owner || playerIdentity()?.id !== owner) {
            setEnabled(false);
            return;
        }
        const response = await fetch(`${apiBase()}/api/v1/analytics/events`, {
            method: 'POST',
            credentials: 'include',
            cache: 'no-store',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: owner, events }),
            signal: AbortSignal.timeout(5000),
        });
        if ([401, 403].includes(response.status)) {
            enabled = false;
            recorder.setEnabled(false);
        }
        if (!response.ok) throw new Error('Analytics unavailable');
    },
    import.meta.env.VITE_BUILD_ID || 'development',
);
export const analytics = {
    track: (name: EventName, data: EventContext = {}) => {
        if (playerIdentity()?.id !== owner) setEnabled(false);
        if (data.mode) currentMode = data.mode;
        recorder.track(name, data);
    },
    flush: recorder.flush.bind(recorder),
};
function setEnabled(value: boolean) {
    if (enabled === value) return;
    enabled = value;
    recorder.setEnabled(value);
    activeAt = tickAt = performance.now();
    if (value) recorder.track('app_open');
}
async function preference(value?: boolean, expectedId = playerIdentity()?.id) {
    const response = await fetch(`${apiBase()}/api/v1/analytics/preference`, {
        method: value === undefined ? 'GET' : 'PUT',
        credentials: 'include',
        cache: 'no-store',
        ...(value === undefined
            ? {}
            : {
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ accountId: expectedId, enabled: value }),
              }),
        signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) throw new Error('Analytics preference unavailable');
    const data: unknown = await response.json();
    const result = analyticsPreferenceSchema.parse(data);
    if (result.accountId !== expectedId || expectedId !== playerIdentity()?.id)
        throw new Error('Account changed');
    return result.enabled;
}
export function configureAnalytics(parent: HTMLElement, force = false): Promise<void> {
    const id = playerIdentity()?.id ?? null;
    if (id !== owner) {
        owner = id;
        setEnabled(false);
    }
    if (configuring) return configuring;
    const pending = configureAnalyticsOnce(parent, force).finally(() => {
        if (configuring === pending) configuring = null;
    });
    configuring = pending;
    return pending;
}
async function configureAnalyticsOnce(parent: HTMLElement, force = false): Promise<void> {
    if (import.meta.env.VITE_ONLINE_ENABLED === 'false') return;
    const id = playerIdentity()?.id ?? null;
    if (id !== owner) {
        owner = id;
        setEnabled(false);
    }
    if (!id) return;
    initializeListeners();
    try {
        let pending = false;
        try {
            pending = localStorage.getItem('sunmark-analytics-optout:' + id) === '1';
        } catch {
            /* Optional preference storage. */
        }
        const current = pending ? await preference(false, id) : await preference(undefined, id);
        if (pending)
            try {
                localStorage.removeItem('sunmark-analytics-optout:' + id);
            } catch {
                /* Optional preference storage. */
            }
        setEnabled(current === true);
        if (!force) return;
        await new Promise<void>((resolve) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'account-dialog';
            dialog.dir = 'rtl';
            dialog.setAttribute('aria-label', 'آمار پایهٔ بازی');
            dialog.innerHTML = `<section class="account-card"><p class="account-eyebrow">کمک به بهترشدن سان‌مارک</p><h1>آمار پایهٔ بازی</h1><p class="account-description">زمان تقریبی استفادهٔ فعال، بازگشت، پیشرفت آموزش و نوع اقدام‌ها برای بهترشدن بازی ثبت می‌شوند. این آمار به حساب تو متصل است و فقط مدیر بازی آن را می‌بیند.</p><p class="account-note">رمز، کلید بازیابی، متن نوشته‌ها، موقعیت مکانی و دست‌های مخفی در این آمار ثبت نمی‌شوند. رویدادهای خام با دورهٔ ۹۰روزه پاک می‌شوند؛ زمان اولین و آخرین فعالیت تا خاموش‌کردن این گزینه می‌ماند. هر زمان از بخش حساب می‌توانی این گزینه را خاموش کنی؛ با خاموش‌کردن، رویدادهای ذخیره‌شدهٔ حساب پاک می‌شوند. بازی به این انتخاب وابسته نیست.</p><button class="account-primary" data-choice="yes">روشن‌کردن آمار پایه</button><button data-choice="no">خاموش‌کردن و حذف رویدادها</button><button data-choice="later">بستن تنظیمات</button><p class="account-error" role="alert"></p></section>`;
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
                if (choice === 'later') {
                    close();
                    return;
                }
                for (const button of dialog.querySelectorAll('button')) button.disabled = true;
                // Stop immediately on opt-out, even if the server cannot be reached.
                if (choice === 'no') {
                    setEnabled(false);
                    try {
                        localStorage.setItem('sunmark-analytics-optout:' + id, '1');
                    } catch {
                        /* Optional preference storage. */
                    }
                }
                void preference(choice === 'yes', id)
                    .then((value) => {
                        try {
                            localStorage.removeItem('sunmark-analytics-optout:' + id);
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
                        for (const button of dialog.querySelectorAll('button'))
                            button.disabled = false;
                    });
            });
            parent.append(dialog);
            dialog.showModal();
        });
    } catch {
        setEnabled(false); /* Analytics availability never blocks the game. */
    }
}
function initializeListeners() {
    if (!initialized) {
        initialized = true;
        const active = () => {
            const now = performance.now();
            if (enabled && now - activeAt > 30 * 60_000) {
                recorder.setEnabled(true);
                recorder.track('app_open');
            }
            activeAt = now;
        };
        document.addEventListener('pointerdown', active, { passive: true });
        document.addEventListener('keydown', active);
        document.addEventListener('visibilitychange', () => {
            tickAt = performance.now();
            if (document.hidden) void recorder.flush();
        });
        window.addEventListener('pagehide', () => {
            void recorder.flush();
        });
        window.setInterval(() => {
            const now = performance.now();
            if (enabled && !document.hidden && now - activeAt <= 60000) {
                recorder.track('heartbeat', {
                    mode: currentMode,
                    activeMs: Math.max(0, Math.min(30000, Math.round(now - tickAt))),
                });
            }
            tickAt = now;
            if (navigator.onLine) void recorder.flush();
        }, 30000);
    }
}
