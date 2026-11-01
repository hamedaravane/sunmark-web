import type { AdminUser, Overview, UserPage } from './client';

export const escapeHtml = (value: string | number) =>
    String(value).replace(
        /[&<>"']/g,
        (char) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
    );
export const number = (value: number) => value.toLocaleString('fa-IR');
export const date = (value: string) =>
    new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Tehran',
    }).format(new Date(value));
const gender = (value: string) =>
    ({ male: 'مرد', female: 'زن', other: 'سایر', undisclosed: 'بیان نشده' })[value] ?? 'بیان نشده';

export const shell = () => `
<header class="topbar"><a class="brand" href="/" aria-label="بازگشت به بازی"><span class="sun" aria-hidden="true">✺</span><span><b dir="ltr">Sunmark</b><small>اتاق مدیریت</small></span></a><div class="header-actions"><span class="readonly">فقط مشاهده</span><button id="logout" hidden>خروج از حساب</button></div></header>
<main>
    <section id="login" class="login-card" hidden aria-labelledby="login-title">
        <p class="eyebrow">به اتاق مدیریت خوش آمدید</p><h1 id="login-title">یک نگاه به دنیای سان‌مارک</h1>
        <p class="muted">با حساب بازی که دسترسی مدیریت دارد وارد شوید.</p>
        <form id="login-form"><label>نام کاربری<input name="username" dir="ltr" autocomplete="username" required maxlength="24" /></label><label>رمز عبور<input name="password" type="password" dir="ltr" autocomplete="current-password" required minlength="10" maxlength="128" /></label><button class="primary" type="submit">ورود به پنل</button></form>
    </section>
    <p id="message" class="message" role="status" aria-live="polite"></p>
    <section id="dashboard" hidden aria-labelledby="dashboard-title">
        <div class="page-heading"><div><p class="eyebrow">نمای کلی</p><h1 id="dashboard-title">بازیکنان سان‌مارک</h1><p class="muted">آدم‌هایی که به بازی شما پیوسته‌اند.</p></div><div class="refresh-group"><button id="refresh">به‌روزرسانی اطلاعات</button><small id="updated" class="muted"></small></div></div>
        <div id="stats" class="stats"></div>
        <section id="analytics" class="users-panel analytics-panel" aria-label="بینش رفتار بازیکنان"></section>
        <section class="users-panel" aria-labelledby="users-title"><div class="panel-heading"><div><h2 id="users-title">حساب‌های ثبت‌شده</h2><p class="muted">اطلاعات پروفایل توسط خود بازیکن وارد شده است.</p></div><form id="search-form" role="search"><label class="sr-only" for="search">جست‌وجوی نام، نام کاربری یا شماره</label><input id="search" name="q" type="search" maxlength="80" placeholder="نام، نام کاربری یا شماره تلفن…" /><button type="submit">جست‌وجو</button></form></div><div id="user-list"></div><div class="pagination"><p id="page-info" class="muted"></p><div><button id="previous">صفحه قبل</button><button id="next">صفحه بعد</button></div></div></section>
        <p class="data-note">این آمار مربوط به حساب‌ها و بازی‌های آنلاین است. بازیکنان آفلاین شمرده نمی‌شوند. «بازی در جریان» وضعیت ذخیره‌شدهٔ بازی است و به معنی حضور بازیکن در همین لحظه نیست.</p>
    </section>
</main>
<dialog id="user-detail" aria-labelledby="detail-title"><div class="detail-header"><h2 id="detail-title">جزئیات بازیکن</h2><button id="close-detail" aria-label="بستن جزئیات">بستن</button></div><div id="detail-body"></div></dialog>`;

export function stats(data: Overview) {
    const cards = [
        ['حساب ثبت‌شده', data.registered, 'کل حساب‌های بازیکنان'],
        ['عضویت تازه', data.registered24h, 'در ۲۴ ساعت گذشته'],
        ['بازی در جریان', data.games.playing, 'وضعیت ذخیره‌شدهٔ آنلاین'],
        ['بازی تمام‌شده', data.games.finished, 'کل بازی‌های آنلاین پایان‌یافته'],
    ] as const;
    return (
        cards
            .map(
                ([label, value, note]) =>
                    `<article class="stat"><p>${label}</p><strong>${number(value)}</strong><small>${note}</small></article>`,
            )
            .join('') +
        `<p class="secondary-stats">عضویت در ۷ روز گذشته: <b>${number(data.registered7d)}</b><span>اتاق‌های شروع‌نشده: <b>${number(data.games.lobby)}</b></span><span>حساب دارای بازی کامل ثبت‌شده: <b>${number(data.accountsWithCompletedMatches)}</b></span></p>`
    );
}

export function userList(data: UserPage) {
    if (!data.users.length)
        return `<div class="empty-state"><span aria-hidden="true">✺</span><h3>${data.total ? 'در این صفحه بازیکنی نیست' : 'بازیکنی پیدا نشد'}</h3><p>عبارت جست‌وجو را تغییر دهید یا دوباره اطلاعات را دریافت کنید.</p></div>`;
    return `<div class="table-scroll" tabindex="0" role="region" aria-label="فهرست بازیکنان"><table><thead><tr><th scope="col">بازیکن</th><th scope="col">شماره تلفن</th><th scope="col">عضویت · زمان تهران</th><th scope="col">بازی / برد</th><th scope="col">جزئیات</th></tr></thead><tbody>${data.users.map((user) => `<tr><td><div class="identity"><span class="avatar" aria-hidden="true">${escapeHtml(Array.from(user.name)[0] ?? '؟')}</span><div><b>${escapeHtml(user.name)}</b><small dir="ltr">@${escapeHtml(user.username)}</small>${user.isAdmin ? '<span class="admin-badge">مدیر</span>' : ''}</div></div></td><td><span dir="ltr">${escapeHtml(user.phone)}</span></td><td>${date(user.createdAt)}</td><td>${number(user.matches)} / ${number(user.wins)}</td><td><button data-user="${escapeHtml(user.id)}" aria-label="جزئیات ${escapeHtml(user.name)}">مشاهده</button></td></tr>`).join('')}</tbody></table></div>`;
}

export function userDetail(user: AdminUser) {
    const fields: [string, string | number][] = [
        ['نام', user.name],
        ['نام کاربری', user.username],
        ['شماره تلفن', user.phone],
        ['سن اعلام‌شده', number(user.age)],
        ['جنسیت اعلام‌شده', gender(user.gender)],
        ['عضویت · زمان تهران', date(user.createdAt)],
        ['دسترسی', user.isAdmin ? 'مدیر' : 'بازیکن'],
        ['بازی کامل ثبت‌شده', number(user.matches)],
        ['برد', number(user.wins)],
        ['بازی رقابتی', number(user.rankedMatches)],
        ['برد رقابتی', number(user.rankedWins)],
        ['رتبه رقابتی', number(user.rating)],
        ['تجربه', number(user.xp)],
        ['سکه', number(user.coins)],
    ];
    return `<dl class="detail-grid">${fields.map(([key, value]) => `<div><dt>${key}</dt><dd dir="auto">${escapeHtml(value)}</dd></div>`).join('')}</dl><p class="data-note">اطلاعات پروفایل تأیید هویت نشده است. آمار بازی از پیشرفت ثبت‌شدهٔ حساب می‌آید؛ بازی‌های آفلاین در این آمار نیستند.</p>`;
}
