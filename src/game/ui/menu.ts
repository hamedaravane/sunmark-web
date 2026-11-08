import { icon } from '../../ui/icons';
import { playerIdentity } from '../../account/identity';
import { onlineProgression, rankLabel } from '../../account/progression';
import type { AppPlatform } from '../../pwa/app';
import { menuStatus, entryInstall } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { artSprite, button, escape } from './components';
import type { MatchSession } from './matchSession';
import { storageNotice } from './progressionMarkup';
export function menuContent(app: AppPlatform, session: MatchSession): string {
    const store = session.progression,
        local = store?.snapshot;
    const accountProgress = onlineProgression();
    const server = local ? null : accountProgress,
        identity = playerIdentity();
    const profileAction = server ? 'hub:online-profile' : 'hub:profile';
    const cosmeticAction = server ? 'hub:online-cosmetics' : 'hub:cosmetics';

    const name = identity?.name ?? local?.name ?? 'بازیکن';
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const resume = session.savedMatch && session.savedMatch.state.phase !== 'finished';
    return `<div class="council-home title-screen" role="region" aria-label="خانهٔ بازیکن">
    <header class="council-brand">${button('<span class="menu-gear" aria-hidden="true"></span><span>تنظیمات</span>', 'open:experience', { className: 'button title-settings', label: 'تنظیمات بازی', disabled: app.updating })}</header>
    <section class="council-hero" aria-label="جهان سان‌مارک"><div class="council-cast" aria-hidden="true">${(['mithra', 'ahriman', 'ashi', 'spenta-armaiti', 'anahita'] as const).map((id) => artSprite(id === 'anahita' ? 'anahita-calm' : `${id}-portrait`, 180, `council-figure council-figure--${id}`)).join('')}</div><h1 class="title-foreground" aria-label="${BRAND.name}" dir="ltr" lang="en">${artSprite('sunmark-logo', 300, 'title-logo')}</h1></section>
    <section class="council-play" aria-label="انتخاب سفر">${entryInstall(app)}
    ${button(`<span><strong>${resume ? 'ادامهٔ سفر' : 'بازی با ربات‌ها'}</strong><small>${resume ? 'بازگشت به جزیرهٔ ذخیره‌شده' : 'بازی آفلاین با میترا، اَشی و آرمیتی'}</small></span>`, 'play', { className: 'button button--primary council-start', disabled: app.updating })}
    ${button(`<span><strong>آموزش بازی</strong></span>`, 'tutorial', { className: 'button council-practice', disabled: app.updating })}
    ${button(`<span><strong>بازی آنلاین</strong></span>`, 'online', { className: 'button council-practice', disabled: app.updating || !online })}
    ${button(`<span><strong>${identity ? escape(name) : 'ورود / ساخت حساب'}</strong><small>${identity ? escape(rankLabel(accountProgress)) : 'سفرت را نگه دار؛ با دوستان رقابت کن'}</small></span>`, identity ? profileAction : 'account', { className: 'button council-practice council-account', disabled: app.updating })}
    ${!online ? '<p class="footnote">بازی آنلاین در این نسخه در دسترس نیست.</p>' : ''}
    <div class="title-utilities">${button('دعوت دوستان', 'share-game', { className: 'button title-invite' })}<details class="title-more"><summary>بیشتر</summary><nav class="council-navigation" aria-label="دفتر سفر">${button(`${icon('profile', 22)} پیشرفت آفلاین`, profileAction, { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('achievement', 22)} نشان‌ها`, server ? 'hub:online-achievements' : 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('treasure', 22)} گنجینه`, cosmeticAction, { className: 'button button--quiet', disabled: app.updating })}</nav>
    <footer class="council-meta">${identity ? button('مدیریت حساب', 'account', { className: 'button button--quiet' }) : ''}${identity && online ? button('پاداش دعوت‌ها', 'hub:referrals', { className: 'button button--quiet' }) : ''}${button('نصب و وضعیت برنامه', 'open-app', { className: 'button button--quiet' })}<p>${identity ? 'با دوستانت جزیره را بساز.' : 'بازی با ربات‌ها و آموزش، بدون حساب هم در دسترس‌اند.'}</p>${button('آمار و حریم خصوصی', 'analytics-settings', { className: 'button button--quiet' })}</footer></details></div></section>
    ${store ? storageNotice(store) : ''}${menuStatus(app, session)}<p class="footnote">آمار بازی آفلاین و مشخصات فنی برای بهبود بازی، پس از اتصال همگام می‌شوند.</p></div>`;
}
