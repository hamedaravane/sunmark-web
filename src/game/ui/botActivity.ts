import type { MatchSession } from './matchSession';
import { characterForSeat } from './characters';
import { artSprite, escape, number, button } from './components';
import { getPlayerSummary, resolutionActor } from './matchState';
import { turnReport } from './turnReport';

/** Public, confirmed local receipts only. The board owns its own unchanged viewport. */
export function botActivity(session: MatchSession): string {
    const state = session.state,
        human = session.humanPlayer;
    if (!state || !human || session.online || session.practice || state.phase === 'finished')
        return '';
    const actorId = resolutionActor(state);
    if (actorId === human.id || session.placement || session.sheet) return '';
    const seat = state.players.findIndex((p) => p.id === actorId);
    const character = characterForSeat(
        seat,
        state.players.findIndex((p) => p.id === human.id),
    );
    const actor = state.players[seat];
    if (!character || !actor) return '';
    const transition = session.transition;
    const previousActor =
        transition &&
        (transition.action.kind === 'discard'
            ? transition.action.playerId
            : transition.before.players[transition.before.activePlayerIndex].id);
    const report =
        transition?.after === state && previousActor === actorId
            ? turnReport(transition, human.id)
            : null;
    const phase: Record<string, string> = {
        roll: 'آمادهٔ تاس',
        'setup-roll': 'تاس تعیین آغازکننده',
        'setup-settlement': 'جانمایی آبادی',
        'setup-road': 'جانمایی راه',
        actions: 'در حال انجام نوبت',
        discard: 'انتخاب منابع دورریختنی',
        robber: 'جابه‌جایی اهریمن',
        steal: 'انتخاب حریف اهریمن',
        'road-building': 'ساخت راه رایگان',
    };
    return `<div class="bot-activity-card" aria-label="فعالیت ${escape(actor.name)}">${artSprite(`${character.id}-portrait`, 72, 'bot-activity-portrait')}<div class="bot-activity-copy"><div class="bot-activity-heading"><strong>${escape(actor.name)}</strong><small>${number(getPlayerSummary(state, actor.id).score)} امتیاز عمومی</small></div>${button(escape(report?.headline ?? phase[state.phase] ?? 'نوبت رقیب'), 'open:turn-review', { className: 'button bot-activity-report', label: 'بازبینی آخرین حرکت و جزئیات عمومی', disabled: !report })}</div><span class="portrait-anchor" aria-hidden="true"></span></div>`;
}
