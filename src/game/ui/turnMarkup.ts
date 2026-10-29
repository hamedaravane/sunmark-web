import { remoteState } from './matchState';
import { BUILD_TYPES } from '../core/building';
import { getBuildOption } from './matchState';
import { resolutionActor } from './matchState';
import { isSetup } from './matchState';
import { RESOURCE_TYPES } from '../core/types';
import { PRACTICE_TASKS } from '../tutorial/practice';
import { button, diceFace, escape, number, tradeIcon } from './components';
import { actionEmblem, developmentBack } from './developmentMarkup';
import { goalMarkup, BUILD_LABELS, missingLabel } from './buildFeedback';
import { costRow } from './sheets';
import { transitionReceipt, turnSurface } from './turnSurface';
import type { MatchSession } from './matchSession';

export function heroDice(session: MatchSession): string {
    const state = session.state!;
    if (!turnSurface(state, session.humanPlayer!.id, !!session.practice).hero) return '';
    return button(
        `<span class="hero-dice" aria-hidden="true">${diceFace(3)}${diceFace(5)}</span><span class="roll-caption">${state.phase === 'setup-roll' ? 'تاس آغازین' : 'تاس بریز'}</span>`,
        'roll-dice',
        {
            className: 'roll-object',
            label:
                state.phase === 'setup-roll'
                    ? 'ریختن دو تاس برای تعیین آغازکننده؛ بدون تولید منابع'
                    : 'ریختن دو تاس در نوبت تو',
        },
    );
}

/** Factual possibilities only: never chooses a route or a strategy for the player. */
export function actionGuidance(session: MatchSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    if (!session.isHumanTurn)
        return `منتظر ${state.players[state.activePlayerIndex].name} · منابع نمایش‌داده‌شده، مال توست`;
    const options = BUILD_TYPES.map((type) => getBuildOption(state, type, human.id));
    const ready = options.filter((o) => o.reason === null);
    if (ready.length) return `قابل ساخت: ${ready.map((o) => BUILD_LABELS[o.type]).join('، ')}`;
    const short = options.find(
        (o) =>
            o.legalTargetIds.length && RESOURCE_TYPES.reduce((n, r) => n + o.missing[r], 0) === 1,
    );
    if (short) return `برای ${BUILD_LABELS[short.type]}، ${missingLabel(short.missing)} کم داری`;
    const held = turnSurface(state, human.id).readyCards;
    if (held) return `${number(held)} کارت توسعه آمادهٔ بازی داری`;
    return 'ساخت آماده نیست؛ کمبود و محل مجاز را با چکش ببین';
}

export function turnStatus(session: MatchSession, showReceipt = true): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const surface = turnSurface(state, human.id, !!session.practice);
    if (surface.hero) return '';
    let text = session.error || '';
    if (!text && state.phase === 'discard')
        text =
            resolutionActor(state) === human.id
                ? `۷ · ${number(state.robberResolution!.discards[human.id])} منبع انتخاب کن`
                : '۷ · منتظر انتخاب منابع حریف';
    if (!text && state.phase === 'steal')
        text = session.isHumanTurn
            ? 'یک حریف مجاور را انتخاب کن'
            : 'حریف، دزدی اهریمن را کامل می‌کند';
    if (!text && state.phase === 'robber')
        text = session.isHumanTurn
            ? 'اهریمن را به خانه‌ای متفاوت ببر'
            : 'حریف، اهریمن را جابه‌جا می‌کند';
    if (!text && state.phase === 'road-building')
        text = `${remoteState(state) ? '' : number(state.roadBuilding!.remaining) + ' '}راه رایگان · محل را ببین و تأیید کن`;
    if (!text && session.placement)
        text = isSetup(state)
            ? 'جانمایی آغازین · آبادی و راه رایگان‌اند'
            : 'محل روشن را انتخاب کن؛ سپس تأیید کن';
    if (
        session.placement &&
        session.placement.kind !== 'robber' &&
        !isSetup(state) &&
        state.phase !== 'road-building'
    )
        return `<div class="placement-guidance"><p class="turn-receipt">${escape(text)}</p>${costRow(getBuildOption(state, session.placement.kind))}</div>`;
    if (!text && session.practice) text = PRACTICE_TASKS[session.practice.stage];
    if (!text && session.saveStatus === 'unavailable')
        return button('ذخیره در دسترس نیست؛ جزئیات', 'open-app', {
            className: 'button context-button storage-warning',
        });
    if (
        !text &&
        !session.practice &&
        !session.tutorial.enabled &&
        !session.preferences.snapshot.introduced &&
        !session.buildGoal
    )
        return button('راهنمای تاس، ساخت و کارت‌ها', 'open:experience-guide', {
            className: 'button context-button',
        });
    if (!text && session.buildGoal && state.phase === 'actions') return goalMarkup(session);
    if (!text && state.phase === 'finished') text = 'بازی تمام شد · نتیجه و نقشه را ببین';
    if (!text)
        text =
            (showReceipt && transitionReceipt(session.transition, human.id)) ||
            actionGuidance(session);
    return `<p class="turn-receipt${session.error ? ' availability' : ''}">${escape(text)}</p>`;
}

export function primaryAction(session: MatchSession) {
    const state = session.state!,
        human = session.humanPlayer!;
    const surface = turnSurface(state, human.id, !!session.practice);
    const mandatory = ['discard', 'robber', 'steal', 'road-building'].includes(state.phase);
    if (mandatory && resolutionActor(state) !== human.id) return null;
    if (surface.hero || (!surface.ownTurn && !mandatory && state.phase !== 'finished')) return null;
    if (surface.canDeclare)
        return {
            label: 'اعلام پیروزی',
            description: 'اعلام پیروزی؛ دست‌کم ۱۰ امتیاز داری',
            action: 'declare-victory',
            disabled: false,
        };
    const placement = session.placement;
    if (placement) {
        const label =
            placement.kind === 'robber' ? 'تأیید اهریمن' : `تأیید ${BUILD_LABELS[placement.kind]}`;
        return {
            label,
            description: `${label}؛ ${placement.targetId ? 'محل انتخاب شده' : 'ابتدا محل را انتخاب کن'}`,
            action: 'primary',
            disabled: !placement.targetId,
        };
    }
    const label =
        state.phase === 'discard'
            ? 'انتخاب منابع'
            : state.phase === 'steal'
              ? 'انتخاب حریف'
              : state.phase === 'finished'
                ? 'نتیجهٔ بازی'
                : session.practice
                  ? (
                        {
                            roll: 'تاس',
                            road: 'ساخت راه',
                            trade: 'گرفتن پشم',
                            settlement: 'ساخت آبادی',
                            complete: 'پایان تمرین',
                        } as const
                    )[session.practice.stage]
                  : 'پایان نوبت';
    return { label, description: label, action: 'primary', disabled: false };
}

/** One workspace, one primary decision. Native targets never move with feedback. */
export function actionDock(session: MatchSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const surface = turnSurface(state, human.id, !!session.practice);
    const primary = primaryAction(session);
    const placement = session.placement;
    let tools: string;
    if (placement) {
        const required =
            placement.kind === 'robber' || isSetup(state) || state.phase === 'road-building';
        tools = `<div class="dock-selection">${button(`<span>محل‌ها</span><small>${number(session.targets.length)} محل مجاز</small>`, 'open:targets', { className: 'button dock-targets', disabled: !session.targets.length, pressed: session.sheet?.kind === 'targets', label: `انتخاب از ${number(session.targets.length)} محل مجاز؛ فهرست قابل دسترس` })}${button(required ? 'پاک‌کردن' : 'لغو', 'cancel-placement', { className: 'button dock-cancel', disabled: required && !placement.targetId, label: required ? 'پاک‌کردن انتخاب؛ این مرحله همچنان باید کامل شود' : 'لغو ساخت؛ هیچ منبعی خرج نمی‌شود' })}</div>`;
    } else if (surface.hero) {
        const card = surface.readyCards
            ? button(
                  `${developmentBack(22)}<span>پیش از تاس<small>${number(surface.readyCards)} کارت آماده</small></span>`,
                  'open:development',
                  { className: 'button pre-roll-card' },
              )
            : '';
        const warning = session.error
            ? `<p class="dock-idle">${escape(session.error)}</p>`
            : session.saveStatus === 'unavailable'
              ? button('ذخیره در دسترس نیست؛ جزئیات', 'open-app', {
                    className: 'button context-button',
                })
              : !session.preferences.snapshot.introduced &&
                  !session.practice &&
                  !session.tutorial.enabled
                ? button('راهنمای رابط', 'open:experience-guide', {
                      className: 'button context-button',
                  })
                : '';
        tools = `<div class="dock-roll-options">${card}${warning || (!card ? '<p class="dock-idle dock-roll-hint">نوبت تو · تاس‌ها آماده‌اند</p>' : '')}</div>`;
    } else if (
        !isSetup(state) &&
        !['discard', 'robber', 'steal', 'road-building', 'finished'].includes(state.phase)
    ) {
        const ready = BUILD_TYPES.filter(
            (kind) =>
                !getBuildOption(state, kind, human.id).reason &&
                (!session.practice || session.practice.stage === kind),
        ).length;
        tools = `<div class="dock-tools" role="group" aria-label="ابزارهای نوبت">${button(`${actionEmblem('hammer', 30)}<span>ساخت${ready ? ` ${number(ready)}` : ''}</span>`, 'open:build', { className: 'button dock-button dock-build', pressed: session.sheet?.kind === 'build' })}${button(`${tradeIcon(30)}<span>معامله</span>`, session.practice ? 'open:trade' : 'open:domestic', { className: 'button dock-button dock-trade', pressed: ['trade', 'domestic'].includes(session.sheet?.kind ?? ''), disabled: !surface.actions || (!!session.practice && session.practice.stage !== 'trade') })}${button(`${developmentBack(26)}<span>توسعه</span>`, 'open:development', { className: 'button dock-button dock-cards', pressed: session.sheet?.kind === 'development', label: `توسعه؛ ${number(state.development?.hands[human.id].length ?? 0)} کارت در دست تو`, disabled: !!session.practice })}</div>`;
    } else
        tools = `<p class="dock-idle">${state.phase === 'finished' ? 'جزیرهٔ نهایی' : state.phase === 'discard' ? 'دورریختن پس از ۷' : state.phase === 'steal' ? 'انتخاب حریف' : 'آغاز جزیره'}</p>`;
    return `${tools}${primary ? button(`<span>${escape(primary.label)}</span><span class="dock-action-mark" aria-hidden="true">${placement || surface.canDeclare ? '✓' : '↶'}</span>`, primary.action, { className: `button dock-primary${state.phase === 'actions' && !placement && !surface.canDeclare ? ' is-end-turn' : ''}`, label: primary.description, disabled: primary.disabled }) : surface.hero ? '' : '<p class="dock-waiting">منتظر نوبت تو…</p>'}`;
}
