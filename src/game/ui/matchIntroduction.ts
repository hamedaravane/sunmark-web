import type { SheetContent } from './bottomSheet';
import { artSprite, button, color, escape, number, playerAvatar } from './components';
import { avatarForSeat } from './playerIdentity';
import type { MatchSession } from './matchSession';

export function introductionContent(session: MatchSession, ready: boolean): SheetContent {
    const state = session.state!;
    const humanSeat = state.players.findIndex((p) => p.id === session.humanPlayer!.id);
    const preferences = session.preferences.snapshot;
    const colorNames: Record<number, string> = {
        0x438bff: 'آبی',
        0xff526e: 'سرخ',
        0x26d4e8: 'فیروزه‌ای',
        0xc16bff: 'بنفش',
    };
    return {
        title: 'همراهان این رقابت',
        key: 'match-introduction',
        focusAction: 'enter-match',
        body: `<div class="match-introduction">
            ${artSprite('rosette', 46, 'intro-emblem')}
            <p class="eyebrow">یک جزیره؛ ${number(state.players.length)} رقیب</p>
            <h3>داستان این بازی با شما آغاز می‌شود</h3>
            <p class="footnote">رنگ مُهر هر بازیکن، رنگ راه‌ها و آبادی‌های اوست.</p>
            <ol class="intro-participants">${state.players
                .map(
                    (
                        player,
                        seat,
                    ) => `<li class="intro-participant" style="--owner:${color(player.color)}">
                ${playerAvatar(avatarForSeat(seat, humanSeat))}
                <div><b dir="auto">${escape(player.name)}</b><small>${seat === humanSeat ? 'شما' : 'رقیب ربات'} • ${colorNames[player.color] ?? color(player.color)}</small></div>
                <span class="owner-badge" aria-label="رنگ بازیکن ${color(player.color)}"></span>
            </li>`,
                )
                .join('')}</ol>
            <p class="footnote" role="status">${ready ? `نخستین بازیکن با تاس مشخص می‌شود؛ مقصد، ${number(state.victoryTarget)} امتیاز.` : 'در حال آماده‌سازی جزیره و جلوه‌ها…'}</p>
        </div>`,
        footer:
            `<div class="intro-preferences">${button(`صدا: ${preferences.sound ? 'روشن' : 'خاموش'}`, 'experience:sound', { pressed: preferences.sound })}${button(`لرزش: ${preferences.haptics ? 'روشن' : 'خاموش'}`, 'experience:haptics', { pressed: preferences.haptics, disabled: typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function' })}</div>` +
            button('ورود به جزیره', 'enter-match', {
                className: 'button button--primary full-width',
                disabled: !ready,
            }),
    };
}
