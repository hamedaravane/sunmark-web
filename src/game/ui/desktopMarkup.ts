import { button, escape, number } from './components';
import { PHASE_LABELS } from './sheets';
import type { MatchSession } from './matchSession';

/** Public turn context only. Private inventory stays in the human hand projection. */
export function desktopTurnHeading(session: MatchSession): string {
    const state = session.state!;
    const actor = state.players[state.activePlayerIndex];
    const title =
        state.phase === 'finished'
            ? 'پایان بازی'
            : actor.id === session.humanPlayer!.id
              ? 'نوبت تو'
              : `نوبت ${actor.name}`;
    const round = state.turn > 0 ? `دور ${number(state.turn)} · ` : '';
    return `<h2>${escape(title)}</h2><p>${round}${escape(PHASE_LABELS[state.phase])}</p>`;
}

export function desktopShortcuts(): string {
    return `<nav class="desktop-shortcuts" aria-label="بررسی و رویدادهای بازی">${button('بررسی بازی', 'open:review', { className: 'button button--quiet' })}${button('رویدادها', 'open:history', { className: 'button button--quiet' })}</nav>`;
}
