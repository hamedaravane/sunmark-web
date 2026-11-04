import type { z } from 'zod';
import type {
    analyticsSummarySchema,
    analyticsTimelineSchema,
} from '../online/shared/src/analytics/analytics.schemas';
import { escapeHtml, number, date } from './markup';

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
export type AnalyticsTimeline = z.infer<typeof analyticsTimelineSchema>;
const labels: Record<string, string> = {
    app_open: 'بازکردن بازی',
    heartbeat: 'زمان فعال',
    screen_view: 'دیدن بخش',
    match_entered: 'ورود به یک بازی',
    match_left: 'ترک صفحهٔ بازی',
    match_finished: 'پایان بازی یا تمرین',
    phase_changed: 'تغییر مرحله',
    tutorial_shown: 'نمایش گفت‌وگوی آموزش',
    tutorial_closed: 'بستن گفت‌وگو',
    tutorial_acknowledged: 'ادامهٔ آموزش',
    action_confirmed: 'اقدام تأییدشده',
    action_rejected: 'خطای اقدام',
    connection_changed: 'تغییر اتصال',
    online_flow: 'مرحلهٔ ورود آنلاین',
    ui_interaction: 'تعامل با رابط',
    app_visibility: 'نمایش یا پنهان‌شدن بازی',
};
const phases: Record<string, string> = {
    'setup-roll': 'تاس آغاز',
    'setup-settlement': 'آبادی آغازین',
    'setup-road': 'راه آغازین',
    roll: 'تاس',
    discard: 'دورریختن',
    robber: 'اهریمن',
    steal: 'انتخاب حریف',
    'road-building': 'راه‌سازی',
    actions: 'اقدام‌ها',
    finished: 'پایان',
};
const modes: Record<string, string> = {
    hub: 'خانهٔ بازیکن',
    offline: 'آفلاین',
    online: 'آنلاین',
    practice: 'تمرین',
};
const steps: Record<string, string> = {
    opened: 'دیدن بخش آنلاین',
    searching: 'جست‌وجوی حریف',
    room_created: 'ساخت اتاق',
    room_joined: 'پیوستن به اتاق',
    ready: 'آماده‌شدن',
    started: 'شروع بازی',
};
const actions: Record<string, string> = {
    'buy-development': 'خرید توسعه',
    'declare-victory': 'اعلام پیروزی',
    'play-development': 'بازی کارت توسعه',
    discard: 'دورریختن',
    steal: 'انتخاب حریف',
    roll: 'تاس',
    'end-turn': 'پایان نوبت',
    'setup-roll': 'تاس آغاز',
    setup: 'جانمایی',
    build: 'ساخت',
    robber: 'اهریمن',
    'domestic-trade': 'معامله با بازیکن',
    trade: 'معامله با بانک',
};
const retention = (value: AnalyticsSummary['d1']) =>
    value.eligible
        ? `${number(Math.round((value.returned / value.eligible) * 100))}٪ <small>${number(value.returned)} از ${number(value.eligible)} حساب واجد مشاهده</small>`
        : 'هنوز قابل محاسبه نیست <small>پنجرهٔ مشاهدهٔ کامل نشده است</small>';

export function analyticsSummary(data: AnalyticsSummary) {
    const rows = data.eventsByName.filter((row) => row.name !== 'heartbeat');
    return `<div class="panel-heading"><div><p class="eyebrow">یادگیری از رفتار بازیکنان</p><h2>بینش هفت روز گذشته</h2><p class="muted">پوشش: ${number(data.optedInAccounts)} حساب با آمار فعال از ${number(data.registeredAccounts)} حساب ثبت‌شده</p></div><span class="readonly">آمار پایه · از این نسخه به بعد</span></div>
    <div class="insight-grid"><article class="stat"><p>حساب مشاهده‌شده</p><strong>${number(data.players)}</strong><small>${number(data.sessions)} نشست مشاهده‌شده</small></article><article class="stat"><p>دقیقهٔ فعال تقریبی</p><strong>${number(Math.round(data.activeSeconds / 60))}</strong><small>تب قابل مشاهده و تعامل در یک دقیقهٔ اخیر</small></article><article class="stat"><p>بازگشت روز اول</p><div class="retention">${retention(data.d1)}</div></article><article class="stat"><p>بازگشت روز هفتم</p><div class="retention">${retention(data.d7)}</div></article></div>
    ${data.players < 20 ? '<p class="data-note insight-note">نمونه هنوز کوچک است؛ از درصدها نتیجهٔ قطعی نگیرید. حساب‌هایی که آمارشان خاموش است در این نمونه نیستند.</p>' : ''}
    <div class="insight-tables"><section><h3>مسیر تعامل‌ها</h3><p class="muted">تعداد حساب‌های متمایز برای هر رویداد؛ این جدول قیف ترتیبی نیست.</p>${rows.length ? `<table><thead><tr><th>رویداد</th><th>حساب</th><th>دفعات</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${labels[row.name]}</td><td>${number(row.players)}</td><td>${number(row.events)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">هنوز رویدادی ثبت نشده است. اطلاعات پس از موافقت بازیکنان و استفاده از نسخهٔ تازه ظاهر می‌شود.</p>'}</section>
    <section><h3>روند روزانه · UTC</h3>${data.daily.length ? `<table><thead><tr><th>روز</th><th>حساب</th><th>دقیقهٔ فعال</th></tr></thead><tbody>${data.daily.map((day) => `<tr><td dir="ltr">${escapeHtml(day.date)}</td><td>${number(day.players)}</td><td>${number(Math.round(day.activeSeconds / 60))}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">دادهٔ روزانه هنوز موجود نیست.</p>'}</section></div>
    <details class="analytics-details"><summary>مرحله‌های بازی و نسخه‌ها</summary><p class="data-note">تعداد تغییر به هر مرحله؛ نشان‌دهندهٔ محل ریزش قطعی نیست.</p><div class="phase-tags">${data.phases.map((row) => `<span>${escapeHtml(phases[row.phase] ?? row.phase)}: ${number(row.events)}</span>`).join('')}</div><table><thead><tr><th>نسخه</th><th>حساب</th><th>رویداد</th></tr></thead><tbody>${data.builds.map((row) => `<tr><td dir="ltr">${escapeHtml(row.build.slice(0, 8))}</td><td>${number(row.players)}</td><td>${number(row.events)}</td></tr>`).join('')}</tbody></table></details>
    <p class="data-note insight-note">فقط رویدادهای رسیده به سرور شمرده می‌شوند؛ قطع اتصال و حافظهٔ محدود ممکن است داده را ناقص کنند. پایان بازی/تمرین و ورود به بازی گزارش سمت کاربر است، نه شمارش بازی‌های یکتای تأییدشدهٔ سرور. خروج از صفحه به معنی رهاکردن یک بازی قابل ادامه نیست. بازگشت‌ها از اولین فعالیت ثبت‌شده، برای گروه‌های ۳۰ روز اخیر و فقط پس از پایان روز کامل UTC محاسبه می‌شوند.</p>`;
}

export function analyticsTimeline(data: AnalyticsTimeline) {
    const offline = data.offlineProgression;
    const progress = offline
        ? `<section><h3>پیشرفت آفلاین همگام‌شده</h3><p>${number(offline.profile.matches)} بازی · ${number(offline.profile.wins)} برد · ${number(offline.profile.xp)} تجربه · ${number(offline.profile.coins)} سکه</p><p>تمرین: ${offline.profile.practice ? 'کامل' : 'تکمیل نشده'} · ${number(offline.profile.badges.length)} نشان · آخرین همگام‌سازی: ${date(offline.updatedAt)}</p><p class="data-note">نتیجهٔ آفلاین گزارش دستگاه است؛ رتبهٔ رقابتی را تغییر نمی‌دهد.</p></section>`
        : '<p class="data-note">پیشرفت آفلاین هنوز همگام نشده است.</p>';
    const devices = data.devices?.length
        ? `<section><h3>دستگاه‌های مشاهده‌شده</h3><p class="data-note">شناسهٔ مرورگر است، نه اثبات دستگاه یا شخص یکتا. نشانی اتصال ممکن است متعلق به پراکسی باشد؛ موقعیت مکانی نیست.</p>${data.devices.map((d) => `<article><strong>${escapeHtml(d.device.platform || 'سیستم گزارش نشده')}</strong><p dir="ltr">${escapeHtml(d.device.userAgent)}</p><p>${number(d.device.screenWidth)} × ${number(d.device.screenHeight)} · ${d.device.cpuThreads ? number(d.device.cpuThreads) + ' پردازندهٔ منطقی' : ''} ${d.device.memoryGiB ? number(d.device.memoryGiB) + ' GiB' : ''}</p><p>نشانی اتصال: <bdi dir="ltr">${escapeHtml(d.networkPeer)}</bdi> · ${date(d.lastSeen)}</p></article>`).join('')}</section>`
        : '';
    return `${progress}${devices}<section class="user-analytics"><h3>فعالیت ثبت‌شدهٔ بازیکن</h3><p class="data-note">وضعیت: ${data.enabled === false ? 'آمار خاموش است' : 'آمار پایه فعال است'}${data.lastSeen ? ' · آخرین دریافت: ' + date(data.lastSeen) : ''}</p>${data.events.length ? `<ol class="activity-list">${data.events.map((event) => `<li><b>${labels[event.name]}</b><time>${date(event.occurredAt ?? event.receivedAt)}</time><small dir="auto">${escapeHtml([event.data.mode ? modes[event.data.mode] : '', event.data.interaction ?? '', event.data.screen ?? '', event.data.building ?? '', event.data.won === undefined ? '' : event.data.won ? 'برد آفلاین' : 'پایان آفلاین بدون برد', event.data.onlineStep ? steps[event.data.onlineStep] : '', event.data.outcome === 'success' ? 'تأیید شد' : event.data.outcome === 'failure' ? 'ناموفق' : '', event.data.connected === undefined ? '' : event.data.connected ? 'متصل' : 'قطع اتصال', event.data.phase ? (phases[event.data.phase] ?? event.data.phase) : '', event.data.action ? actions[event.data.action] : '', event.data.lesson === undefined ? '' : 'آموزش ' + number(event.data.lesson + 1)].filter(Boolean).join(' · '))}</small></li>`).join('')}</ol>` : '<p class="data-note">رویداد قابل نمایشی وجود ندارد.</p>'}</section>`;
}
