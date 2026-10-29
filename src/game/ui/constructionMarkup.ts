import { BUILD_TYPES } from '../core/building';
import { getBuildOption } from './matchState';
import { RESOURCE_TYPES, type ResourceType } from '../core/types';
import {
    BUILD_LABELS,
    BUILD_PURPOSE,
    buildInventory,
    locationReason,
    missingLabel,
    goalMarkup,
} from './buildFeedback';
import { button, escape, number, resourceIcon } from './components';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';
import { FA } from './messages.fa';

export function resourceCost(
    cost: Partial<Record<ResourceType, number>>,
    hand: Record<ResourceType, number>,
): string {
    return `<div class="visual-cost">${RESOURCE_TYPES.filter((r) => cost[r])
        .map((r) => {
            const required = cost[r]!;
            const short = Math.max(0, required - hand[r]);
            return `<span class="cost-token${short ? ' is-short' : ''}" role="img" aria-label="${FA.resources[r]}؛ هزینه ${number(required)}؛ داری ${number(hand[r])}${short ? `؛ ${number(short)} کم` : '؛ کافی'}">${resourceIcon(r)}<span><bdi dir="ltr">${number(hand[r])} / ${number(required)}</bdi><small>${short ? `${number(short)} کم` : '✓'}</small></span></span>`;
        })
        .join('')}</div>`;
}

export function constructionSheet(session: MatchSession): SheetContent {
    const state = session.state!;
    const human = session.humanPlayer!;
    const roadsRemaining =
        15 - Object.values(state.board.edges).filter((e) => e.road?.ownerId === human.id).length;
    return {
        title: 'ساخت‌وساز',
        key: 'construction',
        body: `<p class="cost-legend">دارایی / هزینه · ✓ کافی · «کم» نیاز باقی‌مانده</p>${goalMarkup(session)}<div class="construction-list">${BUILD_TYPES.map(
            (type) => {
                const option = getBuildOption(state, type, human.id);
                const practiceBlocked = !!session.practice && session.practice.stage !== type;
                const reason = !session.isHumanTurn
                    ? 'برنامه‌ریزی · ساخت در نوبت خودتان'
                    : option.reason === 'wrong-phase'
                      ? 'پس از تاس و پایان مراحل اجباری'
                      : option.reason === 'road-supply'
                        ? FA.errors['road-supply']
                        : option.reason === 'game-finished'
                          ? FA.errors['game-finished']
                          : !option.legalTargetIds.length
                            ? locationReason(option)
                            : RESOURCE_TYPES.some((r) => option.missing[r])
                              ? `${missingLabel(option.missing)} کم`
                              : `${number(option.legalTargetIds.length)} محل مجاز · آماده`;
                return `<article class="build-card construction-card" data-build-kind="${type}"><div class="construction-heading"><span class="piece-symbol piece-symbol--${type}" aria-hidden="true"></span><h3>${BUILD_LABELS[type]}</h3><span class="construction-points">${type === 'road' ? `${number(roadsRemaining)} قطعه باقی` : type === 'city' ? '+۱ ارتقا · مجموع ۲' : '+۱ امتیاز'}</span></div>${resourceCost(option.cost, human.resources)}<p class="availability">${practiceBlocked ? 'در این قدم تمرین، سازهٔ دیگری می‌سازیم.' : escape(reason)}</p><div class="construction-actions">${button('انتخاب محل', `build:${type}`, { className: 'button button--primary', disabled: !!option.reason || practiceBlocked, label: `${BUILD_LABELS[type]}؛ ${reason}؛ انتخاب محل` })}${button(session.buildGoal === type ? '✓ هدف تو' : 'هدف من', `pin-build:${type}`, { className: 'button button--quiet', pressed: session.buildGoal === type, disabled: !!session.practice })}</div><details><summary>جزئیات ${BUILD_LABELS[type]}</summary><p>${BUILD_PURPOSE[type]}</p>${buildInventory(option, human.resources)}<p>${escape(locationReason(option))}</p>${
                    session.isHumanTurn && state.phase === 'actions'
                        ? RESOURCE_TYPES.filter((r) => option.missing[r])
                              .map((r) =>
                                  button(
                                      `${resourceIcon(r)}تهیهٔ ${FA.resources[r]}`,
                                      `trade-for:${r}`,
                                      { className: 'button shortage-trade' },
                                  ),
                              )
                              .join('')
                        : ''
                }</details></article>`;
            },
        ).join('')}</div>`,
        footer: '<p class="footnote">محل را ببین و تأیید کن؛ تا آن لحظه هیچ منبعی خرج نمی‌شود.</p>',
    };
}
