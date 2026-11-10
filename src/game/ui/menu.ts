import { icon } from '../../ui/icons';
import { playerIdentity } from '../../account/identity';
import { onlineProgression, rankLabel } from '../../account/progression';
import type { AppPlatform } from '../../pwa/app';
import { menuStatus } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { BADGES, SEALS, experience, metric } from '../progression/progression';
import { artSprite, button, escape, number, playerAvatar } from './components';
import type { MatchSession } from './matchSession';
import { rewardMarkup, storageNotice } from './progressionMarkup';
export function menuContent(app: AppPlatform, session: MatchSession): string {
    const store = session.progression,
        local = store?.snapshot;
    const accountProgress = onlineProgression();
    const server = local ? null : accountProgress,
        identity = playerIdentity();
    const profile = server ?? local;
    const profileAction = server ? 'hub:online-profile' : 'hub:profile';
    const cosmeticAction = server ? 'hub:online-cosmetics' : 'hub:cosmetics';
    const seal = SEALS.find((s) => s.id === (server?.equippedSeal ?? local?.equipped)) ?? SEALS[0];
    const name = identity?.name ?? local?.name ?? 'بازیکن';
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const resume = session.savedMatch && session.savedMatch.state.phase !== 'finished';
    const next = local ? BADGES.find((badge) => !local.badges.includes(badge.id)) : undefined;
    const xp = experience(profile?.xp ?? 0);
    const currentXP = server?.levelXP ?? xp.current,
        nextXP = server?.nextLevelXP ?? xp.required;
    return `<div class="council-home" role="region" aria-label="خانهٔ بازیکن">
    <header class="council-brand"><div class="council-wordmark">${artSprite('rosette', 32)}<div><h1 dir="ltr" lang="en">${BRAND.name}</h1><small>${BRAND.persianName} · شورای خورشید</small></div></div>${button('<span class="menu-gear" aria-hidden="true"></span>', 'open:experience', { className: 'icon-button', label: 'تنظیمات بازی', disabled: app.updating })}</header>
    <section class="council-hero" aria-label="هم‌نشینان جزیره"><div class="council-hero-copy"><h2>جزیره‌ات را بساز</h2><p>سه رقیب؛ یک جزیره؛ ده امتیاز تا پیروزی.</p></div><div class="council-cast" aria-hidden="true">${(['ashi', 'spenta-armaiti', 'mithra'] as const).map((id) => artSprite(`${id}-portrait`, 180, `council-figure council-figure--${id}`)).join('')}</div></section>
    <section class="council-play" aria-label="انتخاب سفر">
    <div class="council-identity">${button(`${playerAvatar('human')}<span><strong dir="auto">${escape(name)}</strong><small>سطح ${number(server?.level ?? experience(profile?.xp ?? 0).level)} · ${server ? 'حساب آنلاین' : 'پیشرفت آفلاین'}</small><span class="hub-progress council-identity-progress" role="progressbar" aria-label="تجربه تا سطح بعد" aria-valuemin="0" aria-valuemax="${nextXP}" aria-valuenow="${currentXP}" data-progress="${currentXP / nextXP}"></span></span>`, profileAction, { className: 'button button--quiet', ownerColor: seal.color, disabled: app.updating, label: `پروفایل ${name}` })}${button(`${icon('coins', 20)} ${number(profile?.coins ?? 0)}`, cosmeticAction, { className: 'button button--quiet council-wallet', label: 'سکه‌ها و گنجینه', disabled: app.updating })}</div>

    <h2 class="council-lead">${resume ? 'سفرت منتظر توست' : 'پیمان تازه‌ای ببند'}</h2><p class="council-lead">راه‌ها را گسترش بده، سنجیده معامله کن و جزیره را به نام خودت رقم بزن.</p>
    ${button(`${icon('offline', 28)}<span><strong>${resume ? 'ادامهٔ سفر' : 'شروع سفر'}</strong><small>${resume ? 'بازگشت به جزیرهٔ ذخیره‌شده' : 'بازی آفلاین با میترا، اَشی و آرمیتی'}</small></span>`, 'play', { className: 'button button--primary council-start', disabled: app.updating })}
    ${button(`${icon('practice', 24)}<span><strong>تمرین و آموزش</strong><small>با راهنمای آناهیتا، در بازی یاد بگیر</small></span>`, 'tutorial', { className: 'button council-practice', disabled: app.updating })}
    <div class="council-online">${button(`${icon('ranked', 22)}<span>رقابت آنلاین<small>${escape(rankLabel(accountProgress))}</small></span>`, 'hub:competitive', { className: 'button button--quiet', disabled: app.updating || !online })}${button(`${icon('friends', 22)} با دوستان`, 'online', { className: 'button button--quiet', disabled: app.updating || !online })}</div>
    ${!online ? '<p class="footnote">رقابت آنلاین در این نسخهٔ آفلاین در دسترس نیست.</p>' : ''}
    ${next && local ? `<section class="council-route"><h3>گام بعدی: ${escape(next.name)}</h3><p>${escape(next.description)} · ${number(Math.min(next.goal, metric(local, next.metric)))} از ${number(next.goal)}</p>${button('مسیر پیشرفت', 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}</section>` : ''}
    </section>
    <nav class="council-navigation" aria-label="دفتر سفر">${button(`${icon('profile', 22)} پروفایل`, profileAction, { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('achievement', 22)} نشان‌ها`, server ? 'hub:online-achievements' : 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}${button(`${icon('treasure', 22)} گنجینه`, cosmeticAction, { className: 'button button--quiet', disabled: app.updating })}</nav>
    <footer class="council-meta">${button('نصب و وضعیت برنامه', 'open-app', { className: 'button button--quiet', disabled: app.updating })}${button(identity ? `حساب ${escape(identity.name)}` : 'ساخت حساب / ورود', 'account', { className: 'button button--quiet', disabled: app.updating })}${accountProgress ? button('دارایی آنلاین', 'hub:online-profile', { className: 'button button--quiet', disabled: app.updating }) : ''}${online ? button('دعوت دوستان و پاداش', 'hub:referrals', { className: 'button button--quiet', disabled: app.updating }) : ''}<p>${store?.synchronization.syncedAt ? 'پیشرفت سفر با سرور همگام شده است.' : 'پیشرفت سفر محفوظ است؛ پس از اتصال همگام می‌شود.'}</p></footer>
    ${local?.lastReward ? rewardMarkup(local.lastReward, local) : ''}${store ? storageNotice(store) : ''}${menuStatus(app, session)}<p class="footnote">آمار بازی آفلاین و مشخصات فنی برای بهبود بازی، پس از اتصال همگام می‌شوند.</p>${button('آمار و حریم خصوصی', 'analytics-settings', { className: 'button button--quiet' })}</div>`;
}
