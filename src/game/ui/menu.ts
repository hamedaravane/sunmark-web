import type { AppPlatform } from '../../pwa/app';
import { menuStatus } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { BADGES, experience, metric } from '../progression/progression';
import { artSprite, button, escape, number, playerAvatar } from './components';
import { actionEmblem } from './developmentMarkup';
import type { MatchSession } from './matchSession';
import { experienceBar, rewardMarkup, storageNotice } from './progressionMarkup';

export function menuContent(app: AppPlatform, session: MatchSession): string {
    const store = session.progression;
    const profile = store?.snapshot;
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const resume = session.savedMatch && session.savedMatch.state.phase !== 'finished';
    const next = profile ? BADGES.find((badge) => !profile.badges.includes(badge.id)) : undefined;
    return `<div class="player-hub"><header class="hub-brand"><div class="hub-brand-name">${artSprite('rosette', 34)}<div><h1 dir="ltr" lang="en">${BRAND.name}</h1><span>${BRAND.persianName} · خانهٔ بازیکن</span></div></div>${button('<span class="menu-gear" aria-hidden="true"></span>', 'open-app', { className: 'icon-button', label: 'نصب، به‌روزرسانی و وضعیت بازی', disabled: app.updating })}</header>
        ${profile && store ? `<section class="hub-player" aria-label="پیشرفت بازیکن"><div class="hub-player-top">${button(`${playerAvatar('human')}<span><strong dir="auto">${escape(profile.name)}</strong><small>${escape(store.seal.name)} · سطح ${number(experience(profile.xp).level)}</small></span>`, 'hub:profile', { className: 'hub-identity', ownerColor: store.seal.color, disabled: app.updating, label: `پروفایل ${profile.name}` })}${button(`<span class="hub-coin" aria-hidden="true"></span><span>${number(profile.coins)}<small>سکه</small></span>`, 'hub:cosmetics', { className: 'hub-wallet', disabled: app.updating, label: `${number(profile.coins)} سکه؛ گنجینه مهرها` })}</div>${experienceBar(profile)}${button('<span>رتبهٔ رقابتی</span><strong>بدون رتبه <small>به‌زودی</small></strong>', 'hub:competitive', { className: 'hub-rating', disabled: app.updating })}</section>` : ''}
        <div class="hub-section-heading"><h2>جزیرهٔ بعدی منتظر توست</h2><span>حالت بازی را انتخاب کن</span></div>
        <div class="hub-modes">${button(`${actionEmblem('victory-point', 30)}<span><strong>رقابت آنلاین</strong><small>مسابقه و رتبه‌بندی</small></span><span class="hub-tag">به‌زودی</span>`, 'hub:competitive', { className: 'hub-mode hub-mode--ranked', disabled: app.updating })}${button(`${actionEmblem('road-building', 30)}<span><strong>اتاق خصوصی</strong><small>${online ? 'با دعوت دوستان' : 'در این نسخه غیرفعال'}</small></span>`, 'online', { className: 'hub-mode hub-mode--friends', disabled: app.updating || !online })}${button(`${actionEmblem('road', 30)}<span><strong>${resume ? 'ادامهٔ بازی آفلاین' : 'بازی آفلاین'}</strong><small>${resume ? 'سفر ذخیره‌شدهٔ تو' : 'در برابر سه ربات'}</small></span>`, 'play', { className: 'hub-mode hub-mode--offline', disabled: app.updating })}${button(`${actionEmblem('year-of-plenty', 30)}<span><strong>تمرین و آموزش</strong><small>با بازی‌کردن یاد بگیر</small></span>`, 'tutorial', { className: 'hub-mode hub-mode--practice', disabled: app.updating })}</div>
        ${next && profile ? `<section class="hub-next"><div class="row-between"><h3>گام بعدی: ${next.name}</h3><span>${number(Math.min(next.goal, metric(profile, next.metric)))} از ${number(next.goal)}</span></div><p>${next.description}</p><div class="row-between"><small>${number(next.xp)} تجربه + ${number(next.coins)} سکه</small>${button('مسیر سفر', 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}</div></section>` : profile ? '<p class="hub-all-earned">همهٔ نشان‌ها را گرفته‌ای؛ ماجراجویی ادامه دارد.</p>' : ''}
        <nav class="hub-navigation" aria-label="خانهٔ بازیکن">${button('پروفایل', 'hub:profile', { disabled: app.updating })}${button(`نشان‌ها${profile ? ` · ${number(profile.badges.length)}` : ''}`, 'hub:achievements', { disabled: app.updating })}${button('گنجینه', 'hub:cosmetics', { disabled: app.updating })}</nav>
        ${profile?.lastReward ? rewardMarkup(profile.lastReward, profile) : ''}<p class="hub-local-note">پیشرفت روی همین دستگاه ذخیره می‌شود · سکه‌ها برای ظاهر پروفایل‌اند</p>${store ? storageNotice(store) : ''}${menuStatus(app, session)}</div>`;
}
