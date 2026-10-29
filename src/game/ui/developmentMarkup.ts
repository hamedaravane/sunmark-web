import { developmentDeckCount } from './matchState';
import { developmentBuyError } from './matchState';
import { developmentPlayError } from './matchState';
import { DEVELOPMENT_COST } from '../core/developmentDeck';
import { getVictoryPoints } from './matchState';
import { RESOURCE_TYPES, type DevelopmentCard, type DevelopmentKind } from '../core/types';
import { button, number, resourceIcon } from './components';
import { resourceCost } from './constructionMarkup';
import { FA } from './messages.fa';
import type { MatchSession } from './matchSession';
import type { SheetContent } from './bottomSheet';

export const DEVELOPMENT_LABELS: Record<DevelopmentKind, string> = {
    knight: 'شوالیه',
    'victory-point': 'امتیاز مخفی',
    'road-building': 'راه‌سازی',
    monopoly: 'انحصار',
    'year-of-plenty': 'سال فراوانی',
};
export const DEVELOPMENT_DESCRIPTIONS: Record<DevelopmentKind, string> = {
    knight: 'اهریمن را جابه‌جا کن و از یک حریف مجاور یک منبع تصادفی بگیر؛ دورریختن ندارد.',
    'victory-point':
        'یک امتیاز برای تو؛ تا اعلام پیروزی برای حریف‌ها مخفی می‌ماند. کارت تازه هم حساب می‌شود.',
    'road-building': 'دو راه رایگان با اتصال معمول بساز؛ اگر قطعه یا محل کافی نمانده باشد، یک راه.',
    monopoly: 'یک منبع انتخاب کن؛ همهٔ کارت‌های آن نوع را از تمام حریف‌ها می‌گیری.',
    'year-of-plenty': 'دو منبع از بانک انتخاب کن؛ یکسان یا متفاوت.',
};
export const actionEmblem = (kind: string, size = 32) =>
    `<span class="action-emblem" data-emblem="${kind}" style="width:${size}px;height:${size}px" aria-hidden="true"></span>`;
export const developmentBack = (size = 36) =>
    `<span class="development-back" style="width:${size}px;height:${Math.round(size * 1.3)}px" aria-hidden="true"></span>`;
export function cardAvailability(session: MatchSession, card: DevelopmentCard): string {
    if (card.kind === 'victory-point') return 'امتیاز مخفی';
    if (!session.isHumanTurn)
        return card.boughtOnRound >= session.state!.turn ? '◷ نوبت بعدِ تو' : 'در نوبت تو';
    const error = developmentPlayError(session.state!, card.id);
    return error === 'card-too-new'
        ? '◷ نوبت بعد'
        : error === 'card-already-played'
          ? 'این نوبت کارت بازی کرده‌ای'
          : error
            ? FA.errors[error]
            : '✓ آماده';
}
export function developmentSheet(session: MatchSession): SheetContent {
    const state = session.state!,
        human = session.humanPlayer!;
    const cards = state.development?.hands[human.id] ?? [];
    const selected = cards.find((c) => c.id === session.selectedDevelopmentId);
    const error = !session.isHumanTurn ? 'wrong-phase' : developmentBuyError(state);
    const playError = selected
        ? !session.isHumanTurn
            ? 'wrong-phase'
            : developmentPlayError(state, selected.id)
        : null;
    const resourcePicker = (i: 0 | 1) =>
        `<section class="card-resource-choice"><h3>انتخاب ${number(i + 1)}</h3><div class="resource-selector">${RESOURCE_TYPES.map((r) => button(`${resourceIcon(r)}<span>${FA.resources[r]}</span>`, `development-resource:${i}:${r}`, { className: 'resource-choice', pressed: session.developmentResources[i] === r })).join('')}</div></section>`;
    const declaration =
        !session.practice &&
        session.isHumanTurn &&
        ['roll', 'actions'].includes(state.phase) &&
        getVictoryPoints(state, human.id) >= state.victoryTarget;
    return {
        focusAction: selected
            ? `development-select:${selected.id}`
            : cards[0]
              ? `development-select:${cards[0].id}`
              : undefined,
        title: 'کارت‌های تو',
        key: `development:${selected?.id ?? 'hand'}`,
        body: `${selected ? `<section class="development-feature" data-development-id="${selected.id}">${actionEmblem(selected.kind, 56)}<div><h3>${DEVELOPMENT_LABELS[selected.kind]}</h3><p class="card-status">${cardAvailability(session, selected)}</p></div><p>${DEVELOPMENT_DESCRIPTIONS[selected.kind]}</p>${selected.kind === 'monopoly' || selected.kind === 'year-of-plenty' ? resourcePicker(0) : ''}${selected.kind === 'year-of-plenty' ? resourcePicker(1) : ''}</section>` : '<p class="sheet-intro">یک کارت را برای دیدن اثر و زمان بازی انتخاب کن.</p>'}<div class="development-hand" role="group" aria-label="دست مخفی تو">${cards.length ? cards.map((c) => button(`${actionEmblem(c.kind, 38)}<strong>${DEVELOPMENT_LABELS[c.kind]}</strong><small>${cardAvailability(session, c)}</small>`, `development-select:${c.id}`, { className: 'development-card', pressed: c.id === selected?.id, label: `${DEVELOPMENT_LABELS[c.kind]}؛ ${cardAvailability(session, c)}؛ انتخاب کارت` })).join('') : '<p class="muted">هنوز کارتی نخریده‌ای.</p>'}</div><section class="development-purchase"><div class="purchase-heading">${developmentBack(34)}<span><h3>خرید یک کارت مخفی</h3><small>${number(developmentDeckCount(state))} کارت در دسته</small></span></div><p class="cost-legend">دارایی / هزینه</p>${resourceCost(DEVELOPMENT_COST, human.resources)}${error ? `<p class="availability">${FA.errors[error]}</p>` : '<p class="muted">هر بار یک کارت؛ تا منابع داری می‌توانی دوباره بخری.</p>'}${button('خرید یک کارت', 'buy-development', { className: 'button full-width', disabled: !!error || !!session.practice })}</section><p class="footnote">امتیاز مخفی حریف‌ها نمایش داده نمی‌شود.</p>${button('قوانین و زمان بازی کارت‌ها', 'open:development-rules', { className: 'button button--quiet full-width' })}`,
        footer: declaration
            ? button('اعلام پیروزی و نمایش امتیازهای مخفی', 'declare-victory', {
                  className: 'button button--primary full-width',
              })
            : selected && selected.kind !== 'victory-point'
              ? button('بازی‌کردن کارت انتخابی', 'play-development', {
                    className: 'button button--primary full-width',
                    disabled: !!playError || !!session.practice,
                })
              : button('بازگشت به جزیره', 'close-sheet', {
                    className: 'button button--quiet full-width',
                }),
    };
}
