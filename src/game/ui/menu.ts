import { playerIdentity } from '../../account/identity';
import type { AppPlatform } from '../../pwa/app';
import { menuStatus } from '../../pwa/markup';
import { BRAND } from '../../brand';
import { artSprite, button, escape } from './components';
import { actionEmblem } from './developmentMarkup';
import type { MatchSession } from './matchSession';

export function menuContent(app: AppPlatform, session: MatchSession): string {
    return `<div class="menu-crown" aria-hidden="true">${artSprite('rosette', 76, 'menu-emblem')}</div>
        <p class="eyebrow">${BRAND.persianName} · سرزمین فرصت‌ها</p><h1 dir="ltr" lang="en">${BRAND.name}</h1>
        <p class="menu-invitation">جزیره‌ای تازه. هزار راه برای پیروزی.</p>
        <div class="menu-adventure" aria-label="تاس بریز، بساز، به ده امتیاز برس"><span>${actionEmblem('road', 32)}<small>راه بساز</small></span><span>${actionEmblem('year-of-plenty', 32)}<small>منابع بگیر</small></span><span>${actionEmblem('victory-point', 32)}<small>۱۰ امتیاز</small></span></div>
        <div class="menu-actions">${button(playerIdentity()?.name ? `حساب ${escape(playerIdentity()?.name ?? '')}` : 'ساخت حساب / ورود', 'account', { className: 'button full-width' })}${import.meta.env.VITE_ONLINE_ENABLED === 'false' ? '' : button('بازی آنلاین', 'online', { className: 'button button--primary full-width', disabled: app.updating })}${button('<span class="menu-play-mark" aria-hidden="true"></span><span>بازی<small>سفر به جزیره</small></span>', 'play', { className: 'button button--primary menu-play full-width', disabled: app.updating })}${button(`${actionEmblem('road-building', 26)}<span>آموزش<small>با بازی‌کردن یاد بگیر</small></span>`, 'tutorial', { className: 'button button--tutorial full-width', disabled: app.updating })}</div>
        <p class="footnote">با آبادی، شهر و کارت‌ها به ۱۰ امتیاز برس.<br>آموزش، بازی ذخیره‌شده‌ات را تغییر نمی‌دهد.</p>${menuStatus(app, session)}`;
}
