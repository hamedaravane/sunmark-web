import { BUILD_TYPES, type BuildType } from '../core/building';
import { type BuildOption } from '../core/queries';
import { getBuildOption } from './matchState';
import { RESOURCE_TYPES, type ResourceType } from '../core/types';
import { escape, number, button } from './components';
import { FA } from './messages.fa';
import type { MatchSession } from './matchSession';

export const BUILD_LABELS: Record<BuildType, string> = {
    road: 'راه',
    settlement: 'آبادی',
    city: 'شهر',
};
export const BUILD_PURPOSE: Record<BuildType, string> = {
    road: 'بدون امتیاز؛ گسترش شبکه برای رسیدن به محل آبادی تازه',
    settlement: '۱ امتیاز؛ دریافت منابع از زمین‌های مجاور با تاس',
    city: '۲ امتیاز به‌جای ۱؛ تولید دوبرابر از همان زمین‌ها',
};

export function missingLabel(missing: BuildOption['missing']): string {
    return (
        RESOURCE_TYPES.filter((r) => missing[r] > 0)
            .map((r) => `${number(missing[r])} ${FA.resources[r]}`)
            .join('، ') || 'هیچ'
    );
}

export function locationReason(option: BuildOption): string {
    if (option.reason === 'road-supply' || option.reason === 'game-finished')
        return FA.errors[option.reason];
    if (option.legalTargetIds.length) return `${number(option.legalTargetIds.length)} محل مجاز`;
    return {
        road: 'راه خالیِ متصل به شبکه ندارید؛ ساختمان حریف ادامهٔ راه را قطع می‌کند.',
        settlement:
            'تقاطع خالیِ متصل به راه با فاصلهٔ مجاز ندارید؛ برای رسیدن به محل تازه، راه را گسترش دهید.',
        city: 'آبادی‌ای برای ارتقا ندارید؛ شهر فقط جای آبادی خودتان ساخته می‌شود.',
    }[option.type];
}

/** Resource names and explicit column labels also work without color or icons. */
export function buildInventory(option: BuildOption, hand: Record<ResourceType, number>): string {
    return `<div class="build-inventory" role="table" aria-label="هزینه و دارایی ${BUILD_LABELS[option.type]}"><div role="row"><span role="columnheader">منبع</span><span role="columnheader">هزینه</span><span role="columnheader">داری</span><span role="columnheader">کمبود</span></div>${RESOURCE_TYPES.filter(
        (r) => option.cost[r],
    )
        .map(
            (r) =>
                `<div role="row"><span role="rowheader">${FA.resources[r]}</span><span role="cell">${number(option.cost[r])}</span><span role="cell">${number(hand[r])}</span><span role="cell" class="${option.missing[r] ? 'availability' : ''}">${number(option.missing[r])}</span></div>`,
        )
        .join('')}</div>`;
}

export function goalMarkup(
    session: MatchSession,
    hand = session.humanPlayer!.resources,
    comparison = false,
): string {
    const goal = session.buildGoal;
    if (!goal || !session.state) return '';
    const player = session.humanPlayer!;
    const option = getBuildOption(session.state, goal, player.id, hand);
    const short = RESOURCE_TYPES.some((r) => option.missing[r]);
    const status =
        option.reason === 'road-supply' || option.reason === 'game-finished'
            ? locationReason(option)
            : short
              ? `${missingLabel(option.missing)} کم`
              : !option.legalTargetIds.length
                ? locationReason(option)
                : !session.isHumanTurn
                  ? 'منابع آماده · ساخت در نوبت تو'
                  : session.state.phase !== 'actions'
                    ? 'منابع آماده · پس از مراحل نوبت'
                    : 'آمادهٔ ساخت ✓';
    return `<section class="build-goal" aria-label="هدف انتخابی تو${comparison ? ' پس از معامله' : ''}"><span class="piece-symbol piece-symbol--${goal}" aria-hidden="true"></span><span><strong>${comparison ? 'پس از معامله' : 'هدف تو'}: ${BUILD_LABELS[goal]}</strong><small>${escape(status)}</small></span>${!comparison ? button('×', 'pin-build:clear', { className: 'icon-button', label: 'برداشتن هدف ساخت' }) : ''}</section>`;
}

/** Read-only comparison accounts for the payment as well as the resource received. */
export function tradeBuildFeedback(
    session: MatchSession,
    after: Record<ResourceType, number>,
): string {
    const state = session.state!;
    const human = session.humanPlayer!;
    if (RESOURCE_TYPES.some((r) => after[r] < 0)) return '';
    return `${goalMarkup(session, after, true)}<details class="trade-build-feedback"><summary>اثر معامله بر ساخت‌ها</summary><p class="footnote">کمبود قبل ← بعد؛ پرداخت معامله هم حساب شده است.</p>${BUILD_TYPES.map(
        (type) => {
            const before = getBuildOption(state, type, human.id);
            const next = getBuildOption(state, type, human.id, after);
            return `<p><strong>${BUILD_LABELS[type]}</strong> • کمبود قبل: ${missingLabel(before.missing)}؛ بعد: ${missingLabel(next.missing)}<br><span class="muted">${escape(locationReason(next))}${next.reason === null ? ' • پس از معامله قابل ساخت' : ''}${!session.isHumanTurn ? ' • ساخت در نوبت خودتان' : ''}</span></p>`;
        },
    ).join('')}</details>`;
}
