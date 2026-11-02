import { DIALOGUES, type DialogueId } from '../narrative/dialogues.fa';
import { characterById } from './characters';
import { button, escape, number } from './components';
import type { MatchSession } from './matchSession';
import type { SheetContent } from './bottomSheet';

export function rivalDialogueContent(session: MatchSession): SheetContent {
    const view = session.rivals!.view(session.tutorial.enabled, session.rivalCharacters);
    if (!view)
        return { title: 'هم‌نشینان جزیره', body: '', footer: button('بازگشت', 'close-sheet') };
    const speaker = characterById(view.beat.speaker);
    const name = speaker?.name ?? 'آناهیتا';
    return {
        title: name,
        key: `rival-${view.id}-${view.position}`,
        narrator: {
            portrait: speaker ? `${speaker.id}-portrait` : 'anahita-explaining',
            key: `rival-${view.id}-${view.position}`,
            role: speaker?.title ?? 'همراه سفر',
        },
        focusAction: 'rival-next',
        body: `<article class="narrator-dialogue" aria-label="گفت‌وگو با ${escape(name)}"><div class="narrator-copy"><p class="eyebrow">${escape(view.title)} · ${number(view.position)} از ${number(view.total)}</p><p>${escape(view.beat.text)}</p></div>${view.canReply ? `<p class="footnote">پاسخ تو (اختیاری)</p><div class="rival-replies">${button('چالش را می‌پذیرم', 'rival-reply:bold', { className: 'button' })}${button('از روشت بگو', 'rival-reply:curious', { className: 'button' })}</div>` : ''}</article>`,
        footer: `${button(view.last ? 'برگردیم به جزیره' : 'ادامهٔ گفت‌وگو', 'rival-next', { className: 'button button--primary full-width' })}${button('خاموش‌کردن گفت‌وگوی رقبا', 'rival-mute', { className: 'button button--quiet full-width' })}<p class="footnote">بستن پنجره فقط این گفت‌وگو را رد می‌کند. گفت‌وگوهای گذشته و تنظیم رقبا در منوی بازی ← بررسی بازی ← هم‌نشینان جزیره‌اند.</p>`,
    };
}

export function rivalJournal(session?: MatchSession): string {
    if (!session?.state || !session.rivals || session.practice || session.online) return '';
    return `${button(`گفت‌وگوی خودکار رقبا: ${session.rivals.enabled ? 'روشن' : 'خاموش'}`, 'rival-toggle', { className: 'button full-width', pressed: session.rivals.enabled })}<p class="footnote">این تنظیم از آموزش آناهیتا جداست. بازپخش گفت‌وگو منابع و نوبت را تغییر نمی‌دهد.</p><h3>گفت‌وگوهای گذشته</h3>${session.rivals.completed.length ? session.rivals.completed.map((id: DialogueId) => button(escape(DIALOGUES[id].title), `rival-replay:${id}`, { className: 'button full-width' })).join('') : '<p class="footnote">با پیشرفت این سفر، گفت‌وگوها اینجا ثبت می‌شوند.</p>'}`;
}
