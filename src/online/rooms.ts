import type { OnlineClient } from './client';
import type { Drafts } from './model';
import { label, button, input } from './components';
export function roomMarkup(client: OnlineClient, draft: Drafts) {
    const snapshot = client.snapshot;
    const busy = client.busy || !!client.pending;
    let body = '';
    if (!client.session) {
        body =
            `<section class="online-welcome" data-surface="lapis">${label('سان‌مارک · دور یک میز', 'small')}${label('با دوستانت یک امپراتوری بساز', 'h2')}${label('یک اتاق خصوصی، چهار بازیکن و همان جزیره آشنا. با دوستان بازی کن یا جای خالی را به ربات‌ها بسپار.')}</section>` +
            input('نام شما در بازی', 'name', draft.name, 'text', '24') +
            button('ورود به تالار بازی', 'guest', busy || !draft.name.trim()) +
            label('نام و اتاق‌های شما در همین مرورگر حفظ می‌شوند.', 'small');
    } else if (!snapshot) {
        body = label(`درود ${client.session.name}`, 'h2');
        if (draft.screen === 'home') {
            body +=
                label('دوستانت را به جزیره دعوت کن؛ یا با کد آن‌ها به بازی بپیوند.') +
                `<section class="online-card" data-surface="lapis">${label('میز خودت را بچین', 'h3')}${label('اتاق خصوصی بساز، دوستان را دعوت کن و ربات‌ها را انتخاب کن.')}${button('ساخت اتاق', 'screen:create')}</section>` +
                `<section class="online-card" data-surface="inset">${label('دوستان منتظر تو هستند؟', 'h3')}${button('پیوستن با کد دعوت', 'screen:join')}</section>` +
                label('اتاق‌های من', 'h3') +
                (client.matches.length
                    ? client.matches
                          .map((m) =>
                              button(
                                  `${m.name} · ${m.status === 'finished' ? 'نتیجه بازی' : m.status === 'lobby' ? 'بازگشت به اتاق' : 'ادامه بازی'}`,
                                  `open:${m.id}`,
                                  busy,
                              ),
                          )
                          .join('')
                    : label('هنوز اتاقی نداری. اولین بازی را بساز.', 'small'));
        } else if (draft.screen === 'create') {
            body +=
                label('اتاق تازه', 'h3') +
                label(
                    'یک نام برای میز دوستانه‌تان انتخاب کن. پس از ساخت، پیوند دعوت را می‌فرستی.',
                ) +
                input('نام اتاق', 'lobby', draft.lobby) +
                button('ساخت و ورود به اتاق', 'create', busy || !draft.lobby.trim()) +
                button('بازگشت به تالار', 'screen:home');
        } else {
            body +=
                label('دعوت به بازی', 'h3') +
                label('کد دعوت دوستت را اینجا وارد کن.') +
                input('کد دعوت', 'code', draft.code, 'text', '12') +
                button('پیوستن به اتاق', 'join', busy || !draft.code.trim()) +
                button('بازگشت به تالار', 'screen:home');
        }
    } else if (snapshot.status === 'lobby') {
        const ready = snapshot.seats.filter((seat) => seat.occupied && seat.ready).length;
        body =
            label(snapshot.name, 'h2') +
            `<section class="online-invite" data-surface="lapis">${label('دوستانت را دعوت کن', 'h3')}${label(snapshot.code, 'h2')}${button('کپی پیوند دعوت', 'invite')}${label('با یک مرورگر یا پروفایل جدا وارد شوید تا هر نفر هویت خودش را داشته باشد.', 'small')}</section>` +
            label(`آماده برای سفر · ${ready.toLocaleString('fa-IR')} از ۴`, 'h3') +
            `<div class="online-seats">${snapshot.seats.map((seat, index) => `<section class="online-seat" data-surface="${seat.ready ? 'emerald' : 'inset'}"><span data-avatar="${seat.bot ? 'atlas' : 'human'}" data-owner="${['438bff', 'ff526e', '26d7cb', 'ffbd53'][index]}" aria-hidden="true"></span><div>${label(seat.occupied ? `${seat.name}${seat.isYou ? ' · شما' : ''}` : 'جای دوستت خالی است', 'h3')}${label(!seat.occupied ? 'دعوت کن یا ربات اضافه کن' : seat.bot ? 'ربات · آماده بازی' : seat.ready ? 'آماده بازی' : 'منتظر اعلام آمادگی', 'small')}</div>${snapshot.host && index > 0 && (!seat.occupied || seat.bot) ? button(seat.bot ? 'حذف ربات' : 'افزودن ربات', `bot:${index}:${!seat.bot}`, busy) : ''}</section>`).join('')}</div>` +
            label(
                snapshot.host
                    ? 'وقتی هر چهار صندلی آماده باشند، می‌توانی بازی را آغاز کنی.'
                    : 'آمادگی خودت را اعلام کن؛ میزبان بازی را آغاز می‌کند.',
            ) +
            button(
                snapshot.seats.find((seat) => seat.isYou)?.ready ? 'لغو آمادگی' : 'آماده‌ام',
                'ready',
                busy,
            ) +
            (snapshot.host ? button('آغاز سفر', 'start', busy || ready !== 4) : '');
    }
    return body;
}
