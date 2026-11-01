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
const retention = (value: AnalyticsSummary['d1']) =>
    value.eligible
        ? `${number(Math.round((value.returned / value.eligible) * 100))}٪ <small>${number(value.returned)} از ${number(value.eligible)} حساب واجد مشاهده</small>`
        : 'هنوز قابل محاسبه نیست <small>پنجرهٔ مشاهدهٔ کامل نشده است</small>';

export function analyticsSummary(data: AnalyticsSummary) {
    const rows = data.eventsByName.filter((row) => row.name !== 'heartbeat');
    return `<div class="panel-heading"><div><p class="eyebrow">یادگیری از رفتار بازیکنان</p><h2>بینش هفت روز گذشته</h2><p class="muted">پوشش: ${number(data.optedInAccounts)} حساب موافق از ${number(data.registeredAccounts)} حساب ثبت‌شده</p></div><span class="readonly">آمار اختیاری · از این نسخه به بعد</span></div>
    <div class="insight-grid"><article class="stat"><p>حساب مشاهده‌شده</p><strong>${number(data.players)}</strong><small>${number(data.sessions)} نشست مشاهده‌شده</small></article><article class="stat"><p>دقیقهٔ فعال تقریبی</p><strong>${number(Math.round(data.activeSeconds / 60))}</strong><small>تب قابل مشاهده و تعامل در یک دقیقهٔ اخیر</small></article><article class="stat"><p>بازگشت روز اول</p><div class="retention">${retention(data.d1)}</div></article><article class="stat"><p>بازگشت روز هفتم</p><div class="retention">${retention(data.d7)}</div></article></div>
    ${data.players < 20 ? '<p class="data-note insight-note">نمونه هنوز کوچک است؛ از درصدها نتیجهٔ قطعی نگیرید. افراد بدون موافقت در این آمار نیستند.</p>' : ''}
    <div class="insight-tables"><section><h3>مسیر تعامل‌ها</h3><p class="muted">تعداد حساب‌های متمایز برای هر رویداد؛ این جدول قیف ترتیبی نیست.</p>${rows.length ? `<table><thead><tr><th>رویداد</th><th>حساب</th><th>دفعات</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${labels[row.name]}</td><td>${number(row.players)}</td><td>${number(row.events)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">هنوز رویدادی ثبت نشده است. اطلاعات پس از موافقت بازیکنان و استفاده از نسخهٔ تازه ظاهر می‌شود.</p>'}</section>
    <section><h3>روند روزانه · UTC</h3>${data.daily.length ? `<table><thead><tr><th>روز</th><th>حساب</th><th>دقیقهٔ فعال</th></tr></thead><tbody>${data.daily.map((day) => `<tr><td dir="ltr">${escapeHtml(day.date)}</td><td>${number(day.players)}</td><td>${number(Math.round(day.activeSeconds / 60))}</td></tr>`).join('')}</tbody></table>` : '<p class="empty-state">دادهٔ روزانه هنوز موجود نیست.</p>'}</section></div>
    <details class="analytics-details"><summary>مرحله‌های بازی و نسخه‌ها</summary><p class="data-note">تعداد تغییر به هر مرحله؛ نشان‌دهندهٔ محل ریزش قطعی نیست.</p><div class="phase-tags">${data.phases.map((row) => `<span>${escapeHtml(phases[row.phase] ?? row.phase)}: ${number(row.events)}</span>`).join('')}</div><table><thead><tr><th>نسخه</th><th>حساب</th><th>رویداد</th></tr></thead><tbody>${data.builds.map((row) => `<tr><td dir="ltr">${escapeHtml(row.build.slice(0, 8))}</td><td>${number(row.players)}</td><td>${number(row.events)}</td></tr>`).join('')}</tbody></table></details>
    <p class="data-note insight-note">فقط رویدادهای رسیده به سرور شمرده می‌شوند؛ قطع اتصال و حافظهٔ محدود ممکن است داده را ناقص کنند. پایان بازی/تمرین و ورود به بازی گزارش سمت کاربر است، نه شمارش بازی‌های یکتای تأییدشدهٔ سرور. خروج از صفحه به معنی رهاکردن یک بازی قابل ادامه نیست. بازگشت‌ها از اولین فعالیت اختیاری، برای گروه‌های ۳۰ روز اخیر و فقط پس از پایان روز کامل UTC محاسبه می‌شوند.</p>`;
}

export function analyticsTimeline(data: AnalyticsTimeline) {
    return `<section class="user-analytics"><h3>فعالیت اختیاری بازیکن</h3><p class="data-note">وضعیت: ${data.enabled === null ? 'هنوز انتخاب نشده' : data.enabled ? 'موافق' : 'غیرفعال'}${data.lastSeen ? ' · آخرین دریافت: ' + date(data.lastSeen) : ''}</p>${data.events.length ? `<ol class="activity-list">${data.events.map((event) => `<li><b>${labels[event.name]}</b><time>${date(event.receivedAt)}</time><small dir="auto">${escapeHtml([event.data.mode, event.data.phase ? (phases[event.data.phase] ?? event.data.phase) : '', event.data.action, event.data.lesson === undefined ? '' : 'آموزش ' + number(event.data.lesson + 1)].filter(Boolean).join(' · '))}</small></li>`).join('')}</ol>` : '<p class="data-note">رویداد قابل نمایشی وجود ندارد.</p>'}</section>`;
}
