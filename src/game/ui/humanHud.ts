import { isSetup } from './matchState';
import { button, diceFace, escape, number, playerAvatar, resourceIcon } from './components';
import { RESOURCE_TYPES } from '../core/types';
import { FA } from './messages.fa';
import { PHASE_LABELS } from './sheets';
import type { MatchSession } from './matchSession';
import { headerPlayers } from './headerModel';

/** The human captain keeps their identity and private score; opponents use public seals. */
export function humanHeader(session: MatchSession): string {
    const state = session.state!,
        human = session.humanPlayer!;
    const standings = headerPlayers(state, human.id);
    const active =
        standings.find((p) => p.id === state.winnerId) ?? standings[state.activePlayerIndex];
    const phase = session.practice
        ? 'تمرین · بدون حرکت رقبا'
        : state.phase === 'finished'
          ? 'پایان بازی'
          : PHASE_LABELS[state.phase];
    const roll = state.phase === 'setup-roll' ? state.setup?.lastRoll?.dice : state.lastRoll;
    const dice = roll
        ? `<div class="dice-result" role="img" aria-label="آخرین تاس: ${number(roll[0])} و ${number(roll[1])}؛ مجموع ${number(roll[0] + roll[1])}"><span class="dice-pair">${diceFace(roll[0])}${diceFace(roll[1])}</span><span class="dice-total">${number(roll[0] + roll[1])}</span></div>`
        : '<span class="dice-placeholder" aria-hidden="true"></span>';
    const own = standings.find((p) => p.human)!;
    const turnLabel =
        state.phase === 'finished'
            ? `${escape(active.name)} برنده شد`
            : active.human
              ? 'نوبت توست!'
              : `نوبت ${escape(active.name)}`;
    const heading = button(
        `${playerAvatar(own.avatar)}<span class="turn-heading"><strong><bdi>${escape(own.name)}</bdi></strong><span class="phase-label">${turnLabel}</span></span><span class="captain-score human-score"><span class="score-symbol" aria-hidden="true"></span><bdi dir="ltr">${number(own.score)}<small> / ${number(state.victoryTarget)}</small></bdi></span>`,
        `player:${own.id}`,
        {
            className: `header-active${own.active ? ' is-active' : ''}`,
            ownerColor: own.color,
            label: `${own.name}، تو؛ ${number(own.score)} از ${number(state.victoryTarget)} امتیاز؛ ${phase}؛ جزئیات بازیکن`,
        },
    );
    const opponents = standings.filter((p) => !p.human);
    const chips = opponents
        .map((p) =>
            button(
                `${playerAvatar(p.avatar)}<span class="opponent-copy"><span class="seat-name"><bdi>${escape(p.name)}</bdi></span><span class="seat-score"><bdi dir="ltr">${number(p.score)} <small>/ ${number(state.victoryTarget)}</small></bdi>${p.active ? '<small class="seat-turn">در حال بازی</small>' : ''}</span></span>`,
                `player:${p.id}`,
                {
                    className: `seat-chip${p.active ? ' is-active' : ''}`,
                    ownerColor: p.color,
                    pressed: session.sheet?.kind === 'player' && session.sheet.id === p.id,
                    label: `${p.name}، ${p.bot ? 'ربات' : 'بازیکن'}؛ ${number(p.score)} از ${number(state.victoryTarget)} امتیاز${p.active ? '؛ در حال بازی' : ''}؛ جزئیات بازیکن`,
                },
            ).replace(
                '<button ',
                `<button data-score="${p.score}" data-target="${state.victoryTarget}" `,
            ),
        )
        .join('');
    return `<div class="header-personal">${heading}${dice}${button('<span class="menu-gear" aria-hidden="true"></span><small>منو</small>', 'open:help', { className: 'header-menu', label: 'منوی توقف بازی' })}</div><div class="header-seats" style="--seat-count:${opponents.length}" role="group" aria-label="حریفان؛ ${escape(phase)}${isSetup(state) ? '' : ` · دور ${number(state.turn)}`}؛ هدف ${number(state.victoryTarget)} امتیاز">${chips}</div>`;
}

/** Passive production changes this inventory even on an opponent's roll. */
export function humanHand(session: MatchSession): string {
    const human = session.humanPlayer!;
    return (
        '<h2 class="hand-caption">منابع تو</h2>' +
        RESOURCE_TYPES.map(
            (r) =>
                `<div class="hand-resource" data-resource="${r}" aria-label="${FA.resources[r]} ${number(human.resources[r])}">${resourceIcon(r)}<span class="resource-count">${number(human.resources[r])}</span><span class="resource-label">${FA.resources[r]}</span></div>`,
        ).join('')
    );
}
