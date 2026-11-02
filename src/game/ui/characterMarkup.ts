import { CHARACTERS, characterById } from './characters';
import { artSprite, button, diceFace, escape, playerAvatar } from './components';
import type { SheetContent } from './bottomSheet';
import type { MatchSession } from './matchSession';
import { rivalJournal } from './rivalDialogueMarkup';
import { turnReport } from './turnReport';

export function characterDescription(id: string): string {
    const character = characterById(id);
    return character
        ? `<section class="character-description"><p>${character.title}</p><p class="footnote">${character.strategy}</p><p>«${character.greeting}»</p></section>`
        : '';
}

export function characterGallery(session?: MatchSession): SheetContent {
    return {
        title: 'هم‌نشینان جزیره',
        key: 'character-gallery',
        body: `<p class="sheet-intro">سه رقیب هوش مصنوعی، سه شیوهٔ بازی. قوانین، هزینه‌ها و شانس تاس برای همه یکسان است.</p><div class="character-gallery">${CHARACTERS.map((character) => `<article class="character-card"><div class="rival-detail-heading">${playerAvatar(character.id)}<h3>${character.name}</h3><span class="bot-label">هوش مصنوعی</span></div><div class="character-showcase"><div class="character-portrait-stage">${artSprite(`${character.id}-portrait`, 132, 'character-portrait')}<span class="portrait-anchor" aria-hidden="true"></span></div>${characterDescription(character.id)}</div></article>`).join('')}</div><p class="footnote">آناهیتا در مسیر یادگیری همراه توست؛ این سه شخصیت برای پیروزی با تو رقابت می‌کنند.</p>${rivalJournal(session)}`,
        footer: button('بازگشت', 'close-sheet', { className: 'button button--primary full-width' }),
    };
}

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
