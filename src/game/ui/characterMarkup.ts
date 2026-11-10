import { CHARACTERS } from './characters';
import { button, diceFace, escape } from './components';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';
import { turnReport } from './turnReport';

export function turnReviewContent(session: MatchSession): SheetContent {
    const report = turnReport(session.transition, session.humanPlayer!.id);
    const transition = session.transition;
    const speaker = CHARACTERS.find(
        (character) => character.name === report?.conversation[0]?.speaker,
    );
    const dice =
        transition?.action.kind === 'roll'
            ? transition.after.lastRoll
            : transition?.action.kind === 'setup-roll'
              ? transition.after.setup?.lastRoll?.dice
              : null;
    return {
        title: 'بازبینی حرکت',
        narrator: speaker
            ? {
                  portrait: `${speaker.id}-portrait`,
                  key: `reaction-${transition?.id}`,
                  role: `${speaker.name} · رقیب هوش مصنوعی`,
              }
            : undefined,
        key: `turn-review-${session.transition?.id ?? 'saved'}`,
        body: report
            ? `<h3>${escape(report.headline)}</h3>${dice ? `<div class="turn-review-dice" aria-hidden="true">${diceFace(dice[0])}${diceFace(dice[1])}</div>` : ''}<ul class="help-list">${report.details.map((line) => `<li>${escape(line)}</li>`).join('')}</ul>${report.conversation
                  .filter((line) => line.speaker !== 'آناهیتا' || session.tutorial.enabled)
                  .map(
                      (line) =>
                          `<blockquote class="character-dialogue"><b>${escape(line.speaker)}</b><p>${escape(line.text)}</p></blockquote>`,
                  )
                  .join('')}`
            : '<p>حرکت‌های ثبت‌شده را در رویدادهای بازی ببین.</p>',
        footer:
            button('رویدادهای بازی', 'open:history', { className: 'button full-width' }) +
            button('بازگشت به جزیره', 'close-sheet', {
                className: 'button button--primary full-width',
            }),
    };
}

export function botControls(session: MatchSession): string {
    if (
        session.online ||
        session.practice ||
        !session.setBotPaused ||
        session.state?.phase === 'finished'
    )
        return '';
    return `<div class="bot-controls">${button(session.botPaused ? 'ادامهٔ خودکار' : 'مکث رقبا', 'bot-pause', { className: 'button', pressed: !!session.botPaused })}${session.botPaused ? button('یک حرکت', 'bot-step', { className: 'button', label: 'انجام یک حرکت قانونی رقیب؛ سپس مکث', disabled: !!session.sheet || (session.isHumanTurn && !['discard', 'steal'].includes(session.state?.phase ?? '')) }) : button('بازبینی حرکت', 'open:turn-review', { className: 'button', disabled: !session.transition })}</div>`;
}
