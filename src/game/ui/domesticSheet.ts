import { tradeBuildFeedback } from './buildFeedback';
import { getPlayerSummary } from './matchState';
import { previewTrade } from '../core/tradePreview';
import { bundleSize } from '../core/domesticTrade';
import { RESOURCE_TYPES } from '../core/types';
import type { ResourceBundle, TradeOffer } from '../core/domesticTrade';
import {
    button,
    color,
    escape,
    number,
    playerAvatar,
    resourceIcon,
    resourceValue,
} from './components';
import { matchAvatar, matchBot } from './headerModel';
import { FA } from './messages.fa';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';

export function tradeTabs(session: MatchSession, domestic: boolean): string {
    return `<nav class="trade-tabs" aria-label="روش معامله">${button('بازیکن‌ها', 'open:domestic', { pressed: domestic, className: 'button', disabled: session.state?.phase !== 'actions' })}${button('بانک و بندر', 'open:trade', { pressed: !domestic, className: 'button', disabled: !session.isHumanTurn })}</nav>`;
}
function bundle(bundle: ResourceBundle): string {
    const items = RESOURCE_TYPES.filter((r) => bundle[r]).map(
        (r) =>
            `<span class="deal-item">${resourceValue(r, bundle[r])}<span>${FA.resources[r]}</span></span>`,
    );
    return items.join('') || '<span class="muted">هنوز انتخاب نشده</span>';
}
function terms(offer: TradeOffer, humanId: string) {
    return {
        give: offer.from === humanId ? offer.give : offer.want,
        want: offer.from === humanId ? offer.want : offer.give,
    };
}
function summary(give: ResourceBundle, want: ResourceBundle): string {
    return `<section class="deal-summary" aria-label="جزئیات از دید شما"><div><h3>تو می‌دی</h3><div class="deal-bundle">${bundle(give)}</div></div><div><h3>تو می‌گیری</h3><div class="deal-bundle">${bundle(want)}</div></div></section>`;
}
function inventory(session: MatchSession): string {
    const hand = session.humanPlayer!.resources;
    return `<p class="deal-hand-title">دارایی تو</p><div class="deal-hand">${RESOURCE_TYPES.map((r) => `<div class="deal-hand-item">${resourceValue(r, hand[r])}<span>${FA.resources[r]}</span></div>`).join('')}</div>`;
}
function shortage(value: ResourceBundle): string {
    return (
        RESOURCE_TYPES.filter((r) => value[r] > 0)
            .map((r) => `${number(value[r])} ${FA.resources[r]}`)
            .join(' + ') || 'هیچ؛ منابع کامل می‌شه'
    );
}
function paymentWarning(session: MatchSession, give: ResourceBundle): string {
    const { paymentMissing } = previewTrade(session.humanPlayer!.resources, give);
    return bundleSize(paymentMissing)
        ? `<p class="availability" role="status">برای پرداخت این پیشنهاد کم داری: ${shortage(paymentMissing)}. می‌تونی مقدارها رو در پیشنهاد متقابل عوض کنی.</p>`
        : '';
}
const statuses = {
    open: 'در انتظار پاسخ',
    accepted: 'پذیرفته شد؛ هنوز انجام نشده',
    rejected: 'رد شد',
    countered: 'با پیشنهاد تازه جایگزین شد',
    withdrawn: 'لغو شد',
    completed: 'معامله انجام شد',
    expired: 'دیگر معتبر نیست',
} as const;
const reasons = {
    useful: 'این منابع برای برنامه‌م خوبه؛ موافقم.',
    'protecting-plan': 'این منابع رو برای ساخت بعدیم نگه می‌دارم.',
    'better-price': 'با این شرایط معامله می‌کنم؛ نظرت چیه؟',
    leader: 'الان نمی‌خوام به پیشتاز جزیره کمک کنم.',
    unavailable: 'این پیشنهاد به کارم نمیاد؛ یه ترکیب دیگه امتحان کن.',
} as const;

export function domesticContent(session: MatchSession): SheetContent {
    const state = session.state!;
    const human = session.humanPlayer!;
    const market = session.trading;
    const tabs = tradeTabs(session, true);
    const context = inventory(session);
    const rules = `<details class="deal-rules"><summary>قانون‌های معامله</summary><p class="footnote">بعد از تاس و حل‌شدن اهریمن، هر معامله باید با صاحب نوبت باشه. هر دو طرف منابع موجود رو هم‌زمان عوض می‌کنن؛ هدیه، قرض، وعدهٔ پرداخت و مبادلهٔ یک نوع منبع در دو طرف مجاز نیست. نسبت و تعداد منابع توافقیه؛ تعداد معامله‌ها محدود نیست. کارت توسعه و خدمات قابل معامله نیستند. دست بازیکن‌ها پنهانه؛ پیشنهاد ممکنه قابل پرداخت نباشه، اما می‌شه مقدارها رو با پیشنهاد متقابل عوض کرد.</p></details>`;
    const review = market.reviewId === null ? undefined : market.table.find(market.reviewId);
    if (review?.status === 'accepted') {
        const own = terms(review, human.id);
        const partner = state.players.find(
            (p) => p.id === (review.from === human.id ? review.to : review.from),
        )!;
        const error = market.errorFor(review);
        const balances = RESOURCE_TYPES.filter((r) => own.give[r] || own.want[r])
            .map(
                (r) =>
                    `<div><dt>${FA.resources[r]}</dt><dd>${number(human.resources[r])} ← ${number(human.resources[r] - own.give[r] + own.want[r])}</dd></div>`,
            )
            .join('');
        return {
            context,
            title: 'تأیید نهایی معامله',
            key: `trade-review-${review.id}`,
            focusAction: error ? `deal-withdraw:${review.id}` : `deal-finish:${review.id}`,
            body: `${tabs}<p class="sheet-intro">با ${escape(partner.name)} • هر دو طرف با همین پیشنهاد موافقید. هنوز هیچ منبعی جابه‌جا نشده.</p>${summary(own.give, own.want)}${paymentWarning(session, own.give)}<h3>دارایی تو قبل ← بعد</h3><dl class="detail-list">${balances}</dl>${!error ? tradeBuildFeedback(session, previewTrade(human.resources, own.give, own.want).after) : ''}${error ? '<p class="availability">یکی از طرف‌ها دیگر منابع کافی نداره؛ این پیشنهاد رو لغو کن و دوباره بساز.</p>' : ''}`,
            footer: `${button('تأیید نهایی و جابه‌جایی منابع', `deal-finish:${review.id}`, { className: 'button button--primary full-width', disabled: !!error })}${button('لغو این معامله', `deal-withdraw:${review.id}`, { className: 'button full-width' })}`,
        };
    }
    if (market.composing) {
        const active = state.players[state.activePlayerIndex];
        const targets = market.targets
            .map((id) => {
                const p = state.players.find((p) => p.id === id)!;
                return button(
                    `${playerAvatar(
                        matchAvatar(state, p.id, human.id),
                    )}<span>${escape(p.name)} <span class="bot-label">${matchBot(state, p.id, human.id) ? 'ربات' : 'بازیکن'} • ${number(getPlayerSummary(state, p.id).resources)} کارت</span></span>`,
                    `deal-target:${id}`,
                    {
                        className: 'deal-target',
                        pressed: market.target === id,
                        ownerColor: p.color,
                    },
                );
            })
            .join('');
        const all = session.isHumanTurn
            ? !session.online
                ? button('همهٔ ربات‌ها', 'deal-target:all', {
                      className: 'deal-target',
                      pressed: market.target === null,
                  })
                : ''
            : '';
        const editor = RESOURCE_TYPES.map((r) => {
            const control = (side: 'give' | 'want') => {
                const label = side === 'give' ? 'می‌دی' : 'می‌گیری';
                const opposite = side === 'give' ? market.want[r] : market.give[r];
                const max = side === 'give' ? human.resources[r] : Number.MAX_SAFE_INTEGER;
                return `<div class="deal-counter" role="group" aria-label="${FA.resources[r]} که ${label}">${button('−', `deal-adjust:${side}:${r}:-1`, { className: 'icon-button', disabled: !market[side][r], label: `کم‌کردن ${FA.resources[r]} که ${label}` })}<span aria-label="${number(market[side][r])} ${FA.resources[r]} که ${label}">${number(market[side][r])}</span>${button('+', `deal-adjust:${side}:${r}:1`, { className: 'icon-button', disabled: !!opposite || market[side][r] >= max, label: `اضافه‌کردن ${FA.resources[r]} که ${label}` })}</div>`;
            };
            return `<div class="deal-editor-row"><span class="deal-resource">${resourceIcon(r)}<span>${FA.resources[r]}</span><small>داری: ${number(human.resources[r])}</small></span>${control('give')}${control('want')}</div>`;
        }).join('');
        return {
            context,
            key: 'trade-compose',
            title: market.parentId ? 'پیشنهاد متقابل تو' : 'معامله با بازیکن‌ها',
            body: `${tabs}${rules}<p class="sheet-intro">${session.isHumanTurn ? (session.online ? 'طرف معامله را انتخاب کن؛ منابع فقط پس از تأیید نهایی جابه‌جا می‌شوند.' : 'پیشنهادت رو به یک ربات یا هر سه بفرست؛ انتخاب نهایی با توئه.') : `نوبت ${escape(active.name)} است؛ فقط با همین بازیکن می‌تونی معامله کنی.`}</p><div class="deal-targets" role="group" aria-label="طرف معامله">${all}${targets}</div><p class="footnote">منابع و تعدادها رو انتخاب کن. یک منبع نمی‌تونه در هر دو طرف معامله باشه؛ نسبت معامله توافقیه.</p><div class="deal-editor-head"><span>منبع</span><span>تو می‌دی</span><span>تو می‌گیری</span></div>${editor}${paymentWarning(session, market.give)}${tradeBuildFeedback(session, previewTrade(human.resources, market.give, market.want).after)}<p class="availability" role="status">${escape(market.draftError ?? 'پیشنهاد آمادهٔ ارساله؛ هنوز چیزی جابه‌جا نمی‌شه.')}</p>`,
            footer: `${summary(market.give, market.want)}${button(market.parentId ? 'ارسال پیشنهاد متقابل' : 'ارسال پیشنهاد', 'deal-send', { className: 'button button--primary full-width', disabled: !!market.draftError })}`,
        };
    }
    const visible = market.table.offers.filter((o) => o.from === human.id || o.to === human.id);
    const hasLive = visible.some((o) => o.status === 'open' || o.status === 'accepted');
    const weight = (o: TradeOffer) =>
        o.status === 'accepted'
            ? 4
            : o.status === 'open'
              ? 3
              : o.status === 'completed'
                ? hasLive
                    ? 2
                    : 5
                : 0;
    const offers = [...visible].sort((a, b) => weight(b) - weight(a) || b.id - a.id).slice(0, 8);
    const cards = offers
        .map((o) => {
            const own = terms(o, human.id);
            const partner = state.players.find(
                (p) => p.id === (o.from === human.id ? o.to : o.from),
            )!;
            const incoming = o.from !== human.id;
            const live = o.status === 'open' || o.status === 'accepted';
            const actions =
                o.status === 'accepted'
                    ? button('بررسی و تأیید نهایی', `deal-review:${o.id}`, {
                          className: 'button button--primary full-width',
                      })
                    : o.status === 'open' && incoming
                      ? `${button('قبول و بررسی نهایی', `deal-accept:${o.id}`, { className: 'button button--primary full-width', disabled: !!market.errorFor(o) })}${button('پیشنهاد متقابل', `deal-counter:${o.id}`, { className: 'button full-width' })}${button('رد پیشنهاد', `deal-reject:${o.id}`, { className: 'button full-width' })}`
                      : '';
            return `<article class="deal-offer ${o.status === 'completed' ? 'deal-receipt' : ''}" aria-label="پیشنهاد ${number(o.id)}؛ ${statuses[o.status]}"><div class="rival-detail-heading" style="--owner:${color(partner.color)}">${playerAvatar(
                matchAvatar(state, partner.id, human.id),
            )}<h3>${o.parentId ? 'پیشنهاد متقابل' : incoming ? 'پیشنهاد' : 'پیشنهاد تو به'} ${escape(partner.name)}</h3></div><p class="deal-status" role="status">${statuses[o.status]}</p>${o.reason ? `<p class="sheet-intro">${escape(reasons[o.reason])}</p>` : ''}${summary(own.give, own.want)}${live ? paymentWarning(session, own.give) : ''}${o.status === 'open' && incoming && market.errorFor(o) ? '<p class="availability">این پیشنهاد الان قابل انجام نیست؛ قبول‌کردن غیرفعاله. می‌تونی ردش کنی یا پیشنهاد متقابل بدی.</p>' : ''}<div class="deal-actions">${actions}${live && !(incoming && o.status === 'open') ? button(incoming ? 'بستن این پیشنهاد' : 'پس‌گرفتن پیشنهاد', `deal-withdraw:${o.id}`, { className: 'button button--quiet full-width' }) : ''}</div></article>`;
        })
        .join('');
    return {
        context,
        title: 'میز مذاکره',
        key: 'trade-conversation',
        body: `${tabs}${market.message ? `<p class="sheet-intro" role="status">${escape(market.message)}</p>` : ''}${cards || '<p>پیشنهاد بازی وجود نداره؛ یک پیشنهاد تازه بساز.</p>'}${rules}<p class="footnote">${session.online ? 'بستن پنجره پیشنهادهای آنلاین را لغو نمی‌کند؛' : 'بستن پنجره یا رفتن به بانک، پیشنهادهای باز تو رو می‌بنده؛'} هیچ منبعی بدون تأیید نهایی جابه‌جا نمی‌شه.</p>`,
        footer: `${button('ساخت پیشنهاد تازه', 'deal-new', { className: 'button button--primary full-width', disabled: !market.allowed })}`,
    };
}
