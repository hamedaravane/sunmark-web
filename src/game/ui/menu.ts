import { icon } from '../../ui/icons';
import { CHARACTERS } from './characters';
import { playerIdentity } from '../../account/identity';
import { onlineProgression, rankLabel } from '../../account/progression';
import type { AppPlatform } from '../../pwa/app';
import { menuStatus } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { BADGES, SEALS, experience, metric } from '../progression/progression';
import { artSprite, button, escape, number, playerAvatar } from './components';
import type { MatchSession } from './matchSession';
import { experienceBar, rewardMarkup, storageNotice } from './progressionMarkup';
export function menuContent(app: AppPlatform, session: MatchSession): string {
    const store = session.progression,
        local = store?.snapshot;
    const server = onlineProgression(),
        identity = playerIdentity();
    const profile = server ?? local;
    const profileAction = server ? 'hub:online-profile' : 'hub:profile';
    const cosmeticAction = server ? 'hub:online-cosmetics' : 'hub:cosmetics';
    const seal = SEALS.find((s) => s.id === (server?.equippedSeal ?? local?.equipped)) ?? SEALS[0];
    const name = identity?.name ?? local?.name ?? 'بازیکن';
    const online = import.meta.env.VITE_ONLINE_ENABLED !== 'false';
    const resume = session.savedMatch && session.savedMatch.state.phase !== 'finished';
    const next = local ? BADGES.find((badge) => !local.badges.includes(badge.id)) : undefined;
    return `<div class="player-hub"><header class="hub-brand"><div class="hub-brand-name">${artSprite('rosette', 34)}<div><h1 dir="ltr" lang="en">${BRAND.name}</h1><span>${BRAND.persianName} · خانهٔ بازیکن</span></div></div>${button('<span class="menu-gear" aria-hidden="true"></span>', 'open-app', { className: 'icon-button', label: 'نصب، به‌روزرسانی و وضعیت بازی', disabled: app.updating })}</header>
        ${profile ? `<section class="hub-player" aria-label="پیشرفت بازیکن"><div class="hub-player-top">${button(`${playerAvatar('human')}<span><strong dir="auto">${escape(name)}</strong><small>${server ? 'حساب آنلاین' : 'پیشرفت آفلاین'} · سطح ${number(server?.level ?? experience(profile.xp).level)}</small></span>`, profileAction, { className: 'hub-identity', ownerColor: seal.color, disabled: app.updating, label: `پروفایل ${name}` })}${button(`<span class="hub-coin" aria-hidden="true"></span><span>${number(profile.coins)}<small>${server ? 'سکهٔ آنلاین' : 'سکهٔ آفلاین'}</small></span>`, cosmeticAction, { className: 'hub-wallet', disabled: app.updating, label: `${number(profile.coins)} سکه؛ گنجینه مهرها` })}</div>${experienceBar(profile)}${button(`<span>رتبهٔ رقابتی</span><strong>${escape(rankLabel(server))}</strong>`, 'hub:competitive', { className: 'hub-rating', disabled: app.updating })}</section>` : ''}
        <section class="hub-play" aria-label="انتخاب بازی"><div class="hub-section-heading"><h2>جزیرهٔ بعدی منتظر توست</h2><span>حالت بازی را انتخاب کن</span></div>
        <div class="hub-modes">${button(`${icon('ranked', 32)}<span><strong>رقابت آنلاین</strong><small>چهار بازیکن · رتبه‌بندی</small></span>`, 'hub:competitive', { className: 'hub-mode hub-mode--ranked', disabled: app.updating || !online })}${button(`${icon('friends', 32)}<span><strong>اتاق خصوصی</strong><small>${online ? 'با دعوت دوستان' : 'در این نسخه غیرفعال'}</small></span>`, 'online', { className: 'hub-mode hub-mode--friends', disabled: app.updating || !online })}${button(`${icon('offline', 32)}<span><strong>${resume ? 'ادامهٔ بازی آفلاین' : 'بازی آفلاین'}</strong><small>${resume ? 'سفر ذخیره‌شدهٔ تو' : 'میترا، اَشی و سپنتا آرمیتی'}</small></span>`, 'play', { className: 'hub-mode hub-mode--offline', disabled: app.updating })}${button(`${icon('practice', 32)}<span><strong>تمرین و آموزش</strong><small>با بازی‌کردن یاد بگیر</small></span>`, 'tutorial', { className: 'hub-mode hub-mode--practice', disabled: app.updating })}</div>
        ${button(`<span class="hub-rivals">${CHARACTERS.map((character) => playerAvatar(character.id)).join('')}</span><span>هم‌نشینان جزیره<small>سه رقیب؛ سه شیوهٔ بازی</small></span>`, 'open:characters', { className: 'button button--quiet full-width hub-characters', disabled: app.updating })}
        ${next && local ? `<section class="hub-next"><div class="row-between"><h3>گام بعدی آفلاین: ${next.name}</h3><span>${number(Math.min(next.goal, metric(local, next.metric)))} از ${number(next.goal)}</span></div><p>${next.description}</p><div class="row-between"><small>${number(next.xp)} تجربه و ${number(next.coins)} سکهٔ آفلاین</small>${button('مسیر آفلاین', 'hub:achievements', { className: 'button button--quiet', disabled: app.updating })}</div></section>` : ''}
        </section><aside class="hub-sidebar" aria-label="حساب و پیشرفت">        ${button(identity ? `حساب ${escape(identity.name)}` : 'ساخت حساب / ورود', 'account', { className: 'button full-width', disabled: app.updating })}<nav class="hub-navigation" aria-label="خانهٔ بازیکن">${button(`${icon('profile', 22)} پروفایل`, profileAction, { disabled: app.updating })}${button(`${icon('achievement', 22)} نشان‌ها`, server ? 'hub:online-achievements' : 'hub:achievements', { disabled: app.updating })}${button(`${icon('treasure', 22)} گنجینه`, cosmeticAction, { disabled: app.updating })}</nav>${online ? button(`${icon('friends', 22)} دعوت دوستان و پاداش`, 'hub:referrals', { className: 'button button--quiet full-width', disabled: app.updating }) : ''}
        </aside>
        ${local?.lastReward ? rewardMarkup(local.lastReward, local) : ''}<p class="hub-local-note">${server ? 'حساب آنلاین همگام است · پیشرفت آفلاین جداست' : 'پیشرفت آفلاین روی همین دستگاه ذخیره می‌شود'}</p>${store ? storageNotice(store) : ''}${menuStatus(app, session)}</div>`;
}
