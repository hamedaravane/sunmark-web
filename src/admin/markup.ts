import { icon } from '../ui/icons';
import type { AdminUser, Overview, UserPage, ProfileAudit } from './client';

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
    value === 'male' ? 'مرد' : value === 'female' ? 'زن' : 'نیازمند تکمیل';
const complete = (user: AdminUser) => ['male', 'female'].includes(user.gender);

export const shell =
    () => `<div class="admin-app"><aside class="sidebar"><a class="brand" href="/" aria-label="بازگشت به بازی">${icon('sun', 40)}<span><b dir="ltr">Sunmark</b><small>اتاق تصمیم‌گیری</small></span></a><p class="nav-label">مدیریت بازی</p><nav aria-label="بخش‌های مدیریت"><a href="#overview">${icon('chart', 22)} نمای کلی</a><a href="#engagement">${icon('offline', 22)} مسیر بازیکن</a><a href="#retention">${icon('refresh', 22)} بازگشت و کیفیت</a><a href="#players">${icon('profile', 22)} بازیکنان</a></nav><div class="sidebar-note">هر نمودار برای یک تصمیم<br>هر تصمیم بر پایهٔ داده</div><a class="game-link" href="/">${icon('back', 20)} بازگشت به بازی</a></aside><div class="workspace"><header class="topbar"><div><p class="eyebrow">سان‌مارک · مدیریت</p><h1>نبض بازی</h1></div><div class="header-actions"><span class="access-badge">دسترسی محافظت‌شده</span><button id="logout" hidden>${icon('logout', 20)} خروج</button></div></header><p id="message" class="message" role="status" aria-live="polite"></p>
<section id="login" class="login-card" hidden aria-labelledby="login-title"><div class="login-mark">${icon('lock', 44)}</div><p class="eyebrow">خوش آمدید</p><h2 id="login-title">یک تصویر روشن از بازی</h2><p class="muted">با حسابی وارد شوید که دسترسی مدیریت دارد.</p><form id="login-form"><label>نام کاربری<input name="username" dir="ltr" autocomplete="username" required maxlength="24"></label><label>رمز عبور<input name="password" type="password" dir="ltr" autocomplete="current-password" required minlength="10" maxlength="128"></label><button class="primary" type="submit">ورود به مدیریت</button></form></section>
<main id="dashboard" hidden><div class="page-heading"><div><h2>وضعیت بازی، در یک نگاه</h2><p class="muted">رشد، پیشرفت و بازگشت بازیکنان را کنار هم ببینید.</p></div><div class="report-controls"><div class="window-picker" role="group" aria-label="بازهٔ گزارش"><button data-window="7" aria-pressed="true">۷ روز</button><button data-window="30" aria-pressed="false">۳۰ روز</button></div><button id="refresh" aria-label="به‌روزرسانی گزارش">${icon('refresh', 20)} به‌روزرسانی</button></div></div><p id="updated" class="updated"></p><div id="insight-content"></div>
<section id="players" class="panel users-panel"><div class="panel-heading"><div><p class="eyebrow">شناخت و نگهداری حساب‌ها</p><h2>بازیکنان</h2><p class="muted">فهرست همهٔ حساب‌ها · زمان‌ها به وقت تهران</p></div><span class="soft-badge">ویرایش نام، سن و جنسیت</span></div><form id="search-form" class="search-form" role="search"><label class="search-field"><span>جست‌وجو</span><input id="search" name="q" type="search" maxlength="80" placeholder="نام، نام کاربری یا شماره همراه…"></label><label><span>انتخاب جنسیت</span><select id="gender-filter"><option value="">همهٔ حساب‌ها</option value="male">مرد</option><option value="female">زن</option></select></label><label class="checkbox-label"><input id="incomplete-filter" type="checkbox"> فقط پروفایل‌های نیازمند تکمیل</label><button type="submit" class="primary">جست‌وجو</button></form><div id="user-list"></div><div class="pagination"><p id="page-info" class="muted"></p><div><button id="previous">صفحهٔ قبل</button><button id="next">صفحهٔ بعد</button></div></div></section><footer class="dashboard-footer">اطلاعات پروفایل خوداظهاری است. آمار فعالیت، مشاهدهٔ سمت کاربر است و تمام استفاده‌های آفلاین را پوشش نمی‌دهد.</footer></main></div></div>
<dialog id="user-detail" aria-labelledby="detail-title"><header class="detail-header"><div><p class="eyebrow">پروندهٔ بازیکن</p><h2 id="detail-title">پروفایل و فعالیت</h2></div><button id="close-detail" aria-label="بستن پرونده">${icon('close', 22)}</button></header><div id="detail-body" class="detail-body"></div></dialog>`;

/** Kept for callers of the previous overview endpoint; the new dashboard uses scoped insights. */
export function stats(data: Overview): string {
    return `<p>${number(data.registered)} حساب · ${number(data.registered24h)} ثبت‌نام در ۲۴ ساعت گذشته · ${number(data.registered7d)} در ۷ روز</p>`;
}
export function userList(data: UserPage): string {
    if (!data.users.length)
        return `<div class="empty-state">${icon('profile', 40)}<h3>بازیکنی در این جست‌وجو نیست</h3><p>عبارت یا فیلترها را تغییر دهید.</p></div>`;
    return `<div class="table-scroll"><table class="users-table"><thead><tr><th>بازیکن</th><th>پروفایل</th><th>عضویت</th><th>بازی آنلاین کامل</th><th>پروفایل و فعالیت</th></tr></thead><tbody>${data.users.map((u) => `<tr><td><div class="user-identity">${icon('profile', 32)}<div><strong dir="auto">${escapeHtml(u.name)}</strong><small dir="ltr">@${escapeHtml(u.username)}</small></div>${u.isAdmin ? '<span class="admin-badge">مدیر</span>' : ''}</div></td><td><span class="${complete(u) ? 'profile-ready' : 'profile-pending'}">${gender(u.gender)}</span><small class="cell-note">${number(u.age)} سال</small></td><td><time>${date(u.createdAt)}</time></td><td><b>${number(u.matches)}</b><small class="cell-note">${number(u.wins)} برد</small></td><td><button class="row-action" data-user="${escapeHtml(u.id)}" aria-label="مشاهده و ویرایش ${escapeHtml(u.name)}">مشاهده و ویرایش ${icon('next', 18)}</button></td></tr>`).join('')}</tbody></table></div>`;
}
export function userDetail(user: AdminUser): string {
    return `<section class="detail-profile"><div class="detail-identity">${icon('profile', 48)}<div><h3 dir="auto">${escapeHtml(user.name)}</h3><p dir="ltr">@${escapeHtml(user.username)}</p></div></div>${!complete(user) ? '<p class="notice notice-warning">این حساب قدیمی هنوز انتخاب مرد/زن ندارد. برای ثبت انتخاب، از خود بازیکن تأیید بگیرید.</p>' : ''}<form id="profile-edit" class="profile-form"><h3>ویرایش اطلاعات</h3><label>نام نمایشی<input name="name" value="${escapeHtml(user.name)}" required maxlength="24" autocomplete="off" dir="auto"></label><div class="field-row"><label>سن<input name="age" type="number" min="1" max="120" step="1" value="${user.age}" required></label><fieldset><legend>جنسیت</legend><label class="radio-label"><input type="radio" name="gender" value="male" ${user.gender === 'male' ? 'checked' : ''} required> مرد</label><label class="radio-label"><input type="radio" name="gender" value="female" ${user.gender === 'female' ? 'checked' : ''} required> زن</label></fieldset></div><p class="field-help">فقط این سه فیلد تغییر می‌کنند؛ نام کاربری، شماره، امتیاز و دسترسی مدیر قابل ویرایش نیستند. تغییرها با شناسهٔ مدیر و زمان ثبت می‌شوند.</p><p id="profile-edit-message" role="status" aria-live="polite"></p><button class="primary" type="submit">ذخیرهٔ تغییرات</button></form></section><section class="detail-summary"><h3>اطلاعات حساب</h3><dl class="detail-grid"><div><dt>شمارهٔ ثبت‌شده</dt><dd dir="ltr">${escapeHtml(user.phone)}</dd></div><div><dt>عضویت · تهران</dt><dd>${date(user.createdAt)}</dd></div><div><dt>دسترسی</dt><dd>${user.isAdmin ? 'مدیر' : 'بازیکن'}</dd></div><div><dt>بازی آنلاین کامل</dt><dd>${number(user.matches)}</dd></div><div><dt>برد آنلاین</dt><dd>${number(user.wins)}</dd></div><div><dt>رقابت کامل</dt><dd>${number(user.rankedMatches)}</dd></div><div><dt>رتبه</dt><dd>${number(user.rating)}</dd></div><div><dt>تجربه</dt><dd>${number(user.xp)}</dd></div><div><dt>سکه</dt><dd>${number(user.coins)}</dd></div></dl><p class="field-help">اطلاعات شخصی تأیید هویت نشده‌اند. آمار آنلاین از پیشرفت ثبت‌شدهٔ سرور می‌آید؛ بازی آفلاین در این شمارش نیست.</p></section><section id="user-activity" class="detail-activity"><p class="muted">در حال دریافت فعالیت…</p></section><section id="profile-history" class="detail-audit"><p class="muted">در حال دریافت سابقهٔ ویرایش…</p></section>`;
}
export function auditMarkup(data: ProfileAudit): string {
    const labels: Record<string, string> = { name: 'نام', age: 'سن', gender: 'جنسیت' };
    const display = (key: string, value: string | number) =>
        key === 'gender'
            ? gender(String(value))
            : typeof value === 'number'
              ? number(value)
              : escapeHtml(value);
    return `<h3>سابقهٔ ویرایش مدیر</h3>${
        data.changes.length
            ? `<ol class="audit-list">${data.changes
                  .map(
                      (c) =>
                          `<li><time>${date(c.at)}</time><small>مدیر: <bdi dir="ltr">${escapeHtml(c.actorId ?? 'حساب حذف‌شده')}</bdi></small><p>${(
                              Object.keys(labels) as Array<'name' | 'age' | 'gender'>
                          )
                              .filter((k) => c.before[k] !== c.after[k])
                              .map(
                                  (k) =>
                                      `${labels[k]}: <del>${display(k, c.before[k])}</del> ← <b>${display(k, c.after[k])}</b>`,
                              )
                              .join(' · ')}</p></li>`,
                  )
                  .join('')}</ol>`
            : '<p class="muted">هنوز ویرایشی از مدیریت ثبت نشده است.</p>'
    }`;
}
