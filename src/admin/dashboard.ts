import type { Insights } from './client';
import { escapeHtml as escape, number } from './markup';
import { cohortCell, reachBar, trendChart } from './charts';
import { icon } from '../ui/icons';

const modeName = { offline: 'آفلاین', online: 'آنلاین', practice: 'تمرین' };
const stepName: Record<string, string> = {
    opened: 'ورود به بخش آنلاین',
    searching: 'جست‌وجوی حریف',
    room_created: 'ساخت اتاق',
    room_joined: 'پیوستن به اتاق',
    ready: 'آماده‌شدن',
    started: 'شروع بازی',
};
const metric = (label: string, value: string, detail: string, mark: Parameters<typeof icon>[0]) =>
    `<article class="metric-card"><div class="metric-label">${icon(mark, 24)}<span>${label}</span></div><strong>${value}</strong><p>${detail}</p></article>`;

export function dashboard(data: Insights): string {
    const offline = data.journeys.find((j) => j.mode === 'offline');
    const mature = data.cohorts.filter((c) => c.d1 !== null && c.players > 0);
    const eligible = mature.reduce((n, c) => n + c.players, 0),
        returned = mature.reduce((n, c) => n + (c.d1 ?? 0), 0);
    const coverage = data.accounts.total
        ? Math.round((data.activity.players / data.accounts.total) * 100)
        : 0;
    const attention: Array<{ title: string; body: string; href: string }> = [];
    if (data.online.visitors > data.online.firstActors)
        attention.push({
            title: 'اولین اقدام آنلاین را بررسی کنید',
            body: `${number(data.online.visitors)} حساب بخش آنلاین را دیده‌اند؛ ${number(data.online.entrants)} به بازی رسیده‌اند و ${number(data.online.firstActors)} اقدام تأییدشده دارند. مراحل اتاق و تاس آغاز را با یک بازیکن بررسی کنید؛ علت توقف از این شمارش مشخص نیست.`,
            href: '#engagement',
        });
    if (offline?.entrants && !offline.finishers)
        attention.push({
            title: 'هنوز پایان بازی آفلاین مشاهده نشده',
            body: `از ${number(offline.entrants)} حساب واردشده، ${number(offline.progressed)} به نوبت عادی و ${number(offline.builders)} به ساخت رسیده‌اند. بازی ذخیره‌شده ممکن است بعداً ادامه پیدا کند؛ این عدد به‌تنهایی ریزش نیست.`,
            href: '#engagement',
        });
    if (data.accounts.incompleteProfiles)
        attention.push({
            title: 'پروفایل‌های نیازمند تکمیل',
            body: `${number(data.accounts.incompleteProfiles)} حساب قدیمی هنوز انتخاب مرد/زن ندارند. اطلاعات را با تأیید خود بازیکن تکمیل کنید؛ مقدار حدسی ثبت نشود.`,
            href: '#players',
        });
    if (!attention.length)
        attention.push({
            title: 'مسیرهای بازی را در چند روز دنبال کنید',
            body: 'تعداد حساب‌ها و نمونه هر نمودار را کنار نتیجه بخوانید. یک روز یا یک بازیکن برای تصمیم قطعی کافی نیست.',
            href: '#retention',
        });
    return `<section id="overview" class="overview-section"><div class="metrics-grid">${metric('حساب‌های ثبت‌شده', number(data.accounts.total), `${number(data.accounts.new)} ثبت‌نام در بازهٔ انتخابی`, 'profile')}${metric('بازیکن مشاهده‌شده', number(data.activity.players), `${number(data.activity.sessions)} نشست · ${number(coverage)}٪ پوشش از حساب‌ها`, 'chart')}${metric('زمان فعال میانه', `${number(Math.round(data.activity.medianActiveSeconds / 60))}<small> دقیقه</small>`, `زمان تقریبی هر حساب · مجموع ${number(Math.round(data.activity.activeSeconds / 60))} دقیقه`, 'time')}${metric('بازگشت روز اول', eligible ? `${number(Math.round((returned / eligible) * 100))}٪` : 'هنوز آماده نیست', eligible ? `${number(returned)} از ${number(eligible)} حساب با پنجرهٔ کامل` : 'روز بازگشت باید به‌طور کامل سپری شود', 'refresh')}</div>
    <div class="scope-strip"><span>${icon('privacy', 18)} حساب‌های مدیر از نمودارها کنار گذاشته شده‌اند: ${number(data.excludedAdmins)}</span><span>آمار پایه · ${number(data.accounts.optedOut)} حساب غیرفعال کرده‌اند</span><span>رویدادها از زمان شروع ثبت در دسترس‌اند؛ سابقهٔ ساختگی نداریم.</span></div></section>
    <section class="dashboard-grid"><article class="panel chart-panel"><div class="panel-heading"><div><p class="eyebrow">رشد و استفاده</p><h2>چه کسانی می‌آیند و بازی را باز می‌کنند؟</h2></div><div class="chart-legend"><span class="legend-registration">ثبت‌نام</span><span class="legend-activity">فعالیت مشاهده‌شده</span></div></div>${trendChart(data.daily)}<p class="chart-caption">روزها بر اساس UTC هستند؛ روز جاری هنوز کامل نشده است. دو خط، جمعیت یکسان یا نرخ تبدیل نیستند.</p><details class="data-table"><summary>دیدن اعداد دقیق روزانه</summary><div class="table-scroll"><table><thead><tr><th>روز UTC</th><th>ثبت‌نام</th><th>مشاهده‌شده</th><th>نشست</th><th>دقیقهٔ فعال</th></tr></thead><tbody>${data.daily.map((d) => `<tr><td dir="ltr">${escape(d.date)}</td><td>${number(d.registrations)}</td><td>${number(d.players)}</td><td>${number(d.sessions)}</td><td>${number(Math.round(d.activeSeconds / 60))}</td></tr>`).join('')}</tbody></table></div></details></article>
    <article class="panel attention-panel"><p class="eyebrow">قدم بعدی مدیر</p><h2>چه چیزی ارزش بررسی دارد؟</h2><div class="attention-list">${attention.map((i, n) => `<a href="${i.href}" class="attention-item"><span class="attention-number">${number(n + 1)}</span><div><h3>${i.title}</h3><p>${i.body}</p></div></a>`).join('')}</div></article></section>
    <section id="engagement" class="panel"><div class="panel-heading"><div><p class="eyebrow">از ورود تا پیشرفت</p><h2>بازیکن تا کجای بازی پیش می‌رود؟</h2></div><span class="soft-badge">حساب متمایز · آمار سمت کاربر</span></div><div class="journey-grid">${data.journeys.map((j) => `<article class="journey"><div class="journey-heading">${icon(j.mode === 'offline' ? 'offline' : j.mode === 'online' ? 'online' : 'practice', 28)}<h3>${modeName[j.mode]}</h3><small>${number(j.runs)} ورود یا ادامه</small></div>${reachBar('ورود یا ادامه', j.entrants, j.entrants)}${reachBar('رسیدن به نوبت عادی', j.progressed, j.entrants)}${reachBar('ساخت پس از جانمایی', j.builders, j.entrants)}${reachBar('اقدام معامله', j.traders, j.entrants)}${reachBar(j.mode === 'practice' ? 'پایان تمرین' : 'پایان بازی', j.finishers, j.entrants, 'green')}</article>`).join('')}</div><p class="chart-caption">هر عدد، حساب‌هایی است که آن مرحله را در یکی از ورودهای مشاهده‌شده تجربه کرده‌اند؛ قیف ترتیبی یا شمارش بازی یکتای سرور نیست. یک نفر می‌تواند چند حالت بازی را امتحان کند. پایان تمرین جدا از پایان بازی است.</p>
    <div class="online-check"><h3>مسیر آنلاین</h3><div class="online-numbers"><span><b>${number(data.online.visitors)}</b> دیدن بخش آنلاین</span><span><b>${number(data.online.entrants)}</b> ورود به برد</span><span><b>${number(data.online.firstActors)}</b> اولین اقدام ثبت‌شده</span></div><p class="chart-caption">این شمارش‌ها علت توقف را ثابت نمی‌کنند.</p>${data.online.stages.length ? `<div class="flow-stages">${data.online.stages.map((s) => `<span>${escape(stepName[s.step] ?? s.step)} <b>${number(s.players)}</b><small>${number(s.failures)} پاسخ ناموفق ثبت‌شده</small></span>`).join('')}</div>` : '<p class="empty-inline">جزئیات ساخت، پیوستن، آماده‌شدن و شروع از نسخهٔ تازه ثبت می‌شوند؛ دادهٔ گذشته بازسازی نمی‌شود.</p>'}</div></section>
    ${data.guests ? `<section class="panel"><h2>بازی مهمان‌ها، جدا از حساب‌ها</h2><p>${number(data.guests.players)} شناسهٔ مهمان · ${number(data.guests.sessions)} نشست · ${number(Math.round(data.guests.activeSeconds / 60))} دقیقهٔ فعال</p><p>${number(data.guests.offlineEntrants)} ورود به آفلاین · ${number(data.guests.offlineFinishers)} پایان آفلاین · ${number(data.guests.actions)} اقدام</p><p class="chart-caption">مهمان‌ها در مخرج پوشش حساب‌های ثبت‌شده نیستند. فعالیت قطع اتصال پس از همگام‌سازی، در تاریخ وقوع گزارش می‌شود.</p></section>` : ''}
    <section id="retention" class="dashboard-grid"><article class="panel"><p class="eyebrow">بازگشت واقعی</p><h2>آیا بازیکن دوباره برمی‌گردد؟</h2><p class="muted">گروه‌بندی بر اساس اولین روز مشاهده، نه روز ثبت‌نام. مخرج هر درصد کنار آن آمده است.</p><div class="table-scroll"><table class="cohort-table"><thead><tr><th>اولین روز UTC</th><th>حساب</th><th>روز اول</th><th>روز هفتم</th></tr></thead><tbody>${
        data.cohorts
            .filter((c) => c.players > 0)
            .map(
                (c) =>
                    `<tr><td dir="ltr">${escape(c.date)}</td><td>${number(c.players)}</td>${cohortCell(c.d1, c.players)}${cohortCell(c.d7, c.players)}</tr>`,
            )
            .join('') || '<tr><td colspan="4">گروهی برای مشاهده وجود ندارد.</td></tr>'
    }</tbody></table></div><p class="chart-caption">«در انتظار» صفر درصد نیست. نشست دوباره در همان روز، بازگشت روز بعد محسوب نمی‌شود. ${number(data.activity.repeatPlayers)} حساب در بازه بیش از یک نشست دارند؛ بارگذاری مجدد هم می‌تواند نشست تازه بسازد.</p></article>
    <article class="panel"><p class="eyebrow">کیفیت تجربه و داده</p><h2>چه چیزی نتیجه را محدود می‌کند؟</h2><div class="quality-list"><div><span>اقدام ناموفق ثبت‌شده</span><b>${number(data.activity.rejectedActions)}</b></div><div><span>حساب درگیر این خطاها</span><b>${number(data.activity.affectedPlayers)}</b></div><div><span>نمونهٔ مشاهده‌شده</span><b>${number(data.activity.players)} / ${number(data.accounts.total)}</b></div></div><p class="chart-caption">نبود خطای ثبت‌شده، تضمین بی‌خطا بودن بازی نیست. قطع اتصال، شروع ثبت در میانهٔ بازی و بافر محدود می‌توانند رویدادها را ناقص کنند.</p><h3>نسخه‌های دیده‌شده</h3><div class="build-list">${data.builds.map((b) => `<div><code>${escape(b.build.slice(0, 8))}</code><span>${number(b.players)} حساب</span></div>`).join('') || '<p>هنوز نسخه‌ای مشاهده نشده است.</p>'}</div><p class="chart-caption">یک حساب می‌تواند چند نسخه را دیده باشد؛ این جدول آزمایش مقایسه‌ای نیست.</p></article></section>
    <section class="dashboard-grid demographics"><article class="panel"><p class="eyebrow">پروفایل‌های ثبت‌شده</p><h2>ترکیب سنی</h2>${data.ages.map((a) => reachBar(`${a.band} سال`, a.players, data.accounts.total, 'purple')).join('')}<p class="chart-caption">سن خوداظهاری است؛ برای نتیجه‌گیری دربارهٔ رفتار کافی نیست.</p></article><article class="panel"><p class="eyebrow">تکمیل پروفایل</p><h2>انتخاب ثبت‌شدهٔ جنسیت</h2>${reachBar('مرد', data.genders.male, data.accounts.total, 'purple')}${reachBar('زن', data.genders.female, data.accounts.total, 'purple')}<p class="chart-caption">${number(data.accounts.incompleteProfiles)} پروفایل قدیمی نیازمند انتخاب بازیکن‌اند و در این دو گروه قرار نگرفته‌اند. جنسیت از نام استنباط نمی‌شود.</p></article></section>`;
}
