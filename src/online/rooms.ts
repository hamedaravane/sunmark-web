import type { OnlineClient } from './client';
import type { Drafts } from './model';
import { label, button, input } from './components';
import { onlineProgression, rankLabel } from '../account/progression';
export function roomMarkup(client: OnlineClient, draft: Drafts) {
    const snapshot = client.snapshot;
    const busy = client.busy || !!client.pending;
    let body = '';
    if (!client.session) {
        body =
            label('یک هویت برای همه سفرها', 'h2') +
            label('برای بازی آنلاین وارد حسابت شو یا یک حساب تازه بساز.') +
            button('ساخت حساب / ورود', 'account', client.busy);
    } else if (!snapshot) {
        body = label(`درود ${client.session.name}`, 'h2');
        if (client.matchmaking?.state === 'waiting') {
            body += `<section class="online-welcome" data-surface="lapis">${label(client.matchmakingMode === 'ranked' ? 'در جست‌وجوی حریف هم‌رتبه…' : 'در جست‌وجوی هم‌سفر…', 'h2')}${label(`${client.matchmaking.count.toLocaleString('fa-IR')} از ۴ بازیکن آماده‌اند`, 'h3')}<div class="queue-seats">${Array.from({ length: 4 }, (_, i) => `<div data-surface="${i < client.matchmaking!.count ? 'turquoise' : 'inset'}"><span data-avatar="human" data-owner="58726e" aria-hidden="true"></span>${label(i < client.matchmaking!.count ? 'آماده' : 'منتظر', 'small')}</div>`).join('')}</div>${label('با پیدا شدن چهار بازیکن، سفر خودکار شروع می‌شود. این صفحه را باز نگه دار.')}${button('لغو جست‌وجو', 'cancel-search', busy)}</section>`;
        } else if (draft.screen === 'join') {
            body +=
                label('دوستان منتظر تو هستند', 'h3') +
                label('کد پنج‌رقمی اتاق را وارد کن.') +
                input('کد اتاق', 'code', draft.code, 'text', draft.code.length > 5 ? '12' : '5') +
                button(
                    'پیوستن به دوستان',
                    'join',
                    busy || !/^(?:[0-9]{5}|[a-f0-9]{12})$/i.test(draft.code),
                ) +
                button('بازگشت', 'screen:home');
        } else {
            body += `<div class="online-mode-grid"><section class="online-card" data-surface="amethyst">${label('رقابت رتبه‌بندی‌شده', 'h2')}${label(rankLabel(onlineProgression()), 'h3')}${label('چهار بازیکن واقعی؛ نتیجهٔ بازی روی رتبه اثر دارد. نوبت‌ها زمان‌سنج ندارند.')}${button('پیدا کردن رقابت', 'ranked', busy)}</section><section class="online-card" data-surface="lapis">${label('بازی سریع دوستانه', 'h2')}${label('هم‌سفرها را پیدا می‌کنیم؛ بازی با چهار بازیکن خودکار شروع می‌شود. بدون تغییر رتبه.')}${button('پیدا کردن بازی', 'quick', busy)}</section><section class="online-card" data-surface="inset">${label('بازی خصوصی', 'h2')}${label('یک جزیره فقط برای تو و دوستانت.')}${button('ساخت بازی خصوصی', 'create', busy)}${button('پیوستن با کد', 'screen:join', busy)}</section></div>`;
            if (client.matches.length)
                body +=
                    label('ادامه سفرها', 'h3') +
                    client.matches
                        .map((m) =>
                            button(
                                `${m.name} · ${m.status === 'finished' ? 'نتیجه' : 'ادامه'}`,
                                `open:${m.id}`,
                                busy,
                            ),
                        )
                        .join('');
        }
    } else if (snapshot.status === 'lobby') {
        const ready = snapshot.seats.filter((seat) => seat.occupied && seat.ready).length;
        body =
            label(snapshot.name, 'h2') +
            `<div class="online-lobby"><section class="online-invite" data-surface="lapis">${label('دوستانت را دعوت کن', 'h3')}${label(snapshot.code, 'h2')}${button('کپی پیوند دعوت', 'invite')}${label('دوستانت با این کد کوتاه یا پیوند دعوت وارد می‌شوند.', 'small')}</section>` +
            '<section class="online-roster">' +
            label(`آماده برای سفر · ${ready.toLocaleString('fa-IR')} از ۴`, 'h3') +
            `<div class="online-seats">${snapshot.seats.map((seat, index) => `<section class="online-seat" data-surface="${seat.ready ? 'emerald' : 'inset'}"><span data-avatar="${seat.bot ? 'atlas' : 'human'}" data-owner="${['438bff', 'ff526e', '26d7cb', 'ffbd53'][index]}" aria-hidden="true"></span><div>${label(seat.occupied ? `${seat.name}${seat.isYou ? ' · شما' : ''}` : 'جای دوستت خالی است', 'h3')}${label(!seat.occupied ? 'دعوت کن یا ربات اضافه کن' : seat.bot ? 'ربات · آماده بازی' : seat.ready ? 'آماده بازی' : 'منتظر اعلام آمادگی', 'small')}</div>${snapshot.host && index > 0 && (!seat.occupied || seat.bot) ? button(seat.bot ? 'حذف ربات' : 'افزودن ربات', `bot:${index}:${!seat.bot}`, busy) : ''}</section>`).join('')}</div>` +
            label(
                snapshot.host
                    ? 'وقتی هر چهار صندلی پر شوند، بازی را آغاز کن.'
                    : 'همه آماده‌اند؛ میزبان بازی را آغاز می‌کند.',
            ) +
            (snapshot.host ? button('آغاز سفر', 'start', busy || ready !== 4) : '') +
            '</section></div>';
    }
    return body;
}
