import { cinematicWorld, cinematicCast } from './cinematicMenu';
import { icon } from '../../ui/icons';
import { playerIdentity } from '../../account/identity';
import { onlineProgression, rankLabel } from '../../account/progression';
import type { AppPlatform } from '../../pwa/app';
import { menuStatus, entryInstall } from '../../pwa/markup';
import { button, escape } from './components';
import type { MatchSession } from './matchSession';
import { resumeSummary } from './journey';
import { storageNotice } from './progressionMarkup';
export function menuContent(app: AppPlatform, session: MatchSession): string {
    const store = session.progression,
        local = store?.snapshot;
    const accountProgress = onlineProgression();
    const identity = playerIdentity();
    const server = identity ? accountProgress : null;
    const profileAction = server ? 'hub:online-profile' : 'hub:profile';
    const cosmeticAction = server ? 'hub:online-cosmetics' : 'hub:cosmetics';

    const name = identity?.name ?? local?.name ?? 'بازیکن';
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const resume = session.savedMatch && session.savedMatch.state.phase !== 'finished';
    const beginner = !resume && !local?.badges.includes('practice');
    return `${cinematicWorld()}<div class="council-home cinematic-home" role="region" aria-label="خانهٔ بازیکن">
    <header class="council-brand">${button('<span class="menu-gear" aria-hidden="true"></span><span>تنظیمات</span>', 'open:experience', { className: 'button title-settings', label: 'تنظیمات بازی', disabled: app.updating })}</header>
    ${cinematicCast()}
    <section class="council-play" aria-label="انتخاب سفر">
    ${button(`<span><strong>${resume ? 'ادامهٔ سفر' : beginner ? 'با بازی یاد بگیر' : 'بازی با ربات‌ها'}</strong><small>${resume ? escape(resumeSummary(session.savedMatch!)) : beginner ? 'منابع بگیر، بساز، به ۱۰ امتیاز برس · بدون حساب' : 'رقابت تا ۱۰ امتیاز با میترا، اَشی و آرمیتی'}</small></span>`, beginner ? 'tutorial' : 'play', { className: 'button button--primary council-start', disabled: app.updating })}
    ${button(`<span><strong>${beginner ? 'قوانین را بلدم؛ بازی کنیم' : 'با بازی یاد بگیر'}</strong><small>${beginner ? 'مستقیم به بازی کامل با ربات‌ها' : 'از تاس و منابع تا ساخت اولین آبادی'}</small></span>`, beginner ? 'play' : 'tutorial', { className: 'button council-practice', disabled: app.updating })}
    ${button(`<span><strong>بازی با دوست</strong><small>تو و یک دوست؛ دو جای دیگر با ربات</small></span>`, 'online', { className: 'button council-practice', disabled: app.updating || !online })}
    ${button(`<span><strong>${identity ? escape(name) : 'ورود / ساخت حساب'}</strong><small>${identity ? escape(rankLabel(accountProgress)) : 'پیشرفتت را بازیابی کن؛ با دوستان بازی کن'}</small></span>`, identity ? profileAction : 'account', { className: 'button council-practice council-account', disabled: app.updating })}
    ${!online ? '<p class="footnote">بازی آنلاین در این نسخه در دسترس نیست.</p>' : ''}
    ${entryInstall(app)}<div class="title-utilities">${button('دعوت دوستان', 'share-game', { className: 'button title-invite' })}<details class="title-more"><summary>بیشتر</summary><nav class="council-navigation" aria-label="دفتر سفر">${button(`${icon('profile', 22)} پیشرفت آفلاین`, 'hub:profile', { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('achievement', 22)} نشان‌ها`, server ? 'hub:online-achievements' : 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('treasure', 22)} ${server ? 'گنجینه آنلاین' : 'گنجینه آفلاین'}`, cosmeticAction, { className: 'button button--quiet', disabled: app.updating })}${server ? button('گنجینه آفلاین', 'hub:cosmetics', { className: 'button button--quiet', disabled: app.updating }) : ''}</nav>
    <footer class="council-meta">${identity ? button('مدیریت حساب', 'account', { className: 'button button--quiet' }) : ''}${identity && online ? button('پاداش دعوت‌ها', 'hub:referrals', { className: 'button button--quiet' }) : ''}${button('نصب و وضعیت برنامه', 'open-app', { className: 'button button--quiet' })}<p>${identity ? 'با دوستانت جزیره را بساز.' : 'بازی با ربات‌ها و آموزش، بدون حساب هم در دسترس‌اند.'}</p>${button('آمار و حریم خصوصی', 'analytics-settings', { className: 'button button--quiet' })}<p>آمار بازی آفلاین و مشخصات فنی برای بهبود بازی، پس از اتصال همگام می‌شوند.</p></footer></details></div>${store ? storageNotice(store) : ''}${menuStatus(app, session)}</section></div>`;
}
