import { getPlayerSummary } from './matchState';
import { resourceCount } from '../core/robber';
import { RESOURCE_TYPES } from '../core/types';
import { developmentSheet } from './developmentMarkup';
import { button, escape, number, resourceIcon } from './components';
import { FA } from './messages.fa';
import type { MatchSession } from './matchSession';
import type { SheetContent } from './bottomSheet';

export { DEVELOPMENT_LABELS } from './developmentMarkup';
export function advancedSheet(session: MatchSession): SheetContent | null {
    const state = session.state!;
    const human = session.humanPlayer!;
    if (session.sheet?.kind === 'discard') {
        const required = state.robberResolution?.discards[human.id] ?? 0;
        const selected = resourceCount(session.discardDraft);
        return {
            title: 'تاس ۷؛ انتخاب منابع دورریختنی',
            body: `<p>بیش از ۷ منبع داری؛ دقیقاً ${number(required)} کارت (نصف دارایی، رو به پایین) را خودت انتخاب کن. کارت‌های توسعه شمرده نمی‌شوند. تا همه انتخاب نکنند، جابه‌جایی اهریمن و کارهای عادی ممکن نیست.</p><p role="status">انتخاب‌شده: ${number(selected)} از ${number(required)}</p>${RESOURCE_TYPES.map((r) => `<div class="deal-editor-row"><span class="deal-resource">${resourceIcon(r)}${FA.resources[r]} • داری ${number(human.resources[r])}</span><div class="deal-counter">${button('−', `discard-adjust:${r}:-1`, { className: 'icon-button', disabled: !session.discardDraft[r], label: `کم‌کردن ${FA.resources[r]}` })}<span>${number(session.discardDraft[r])}</span>${button('+', `discard-adjust:${r}:1`, { className: 'icon-button', disabled: session.discardDraft[r] >= human.resources[r] || selected >= required, label: `دورریختن ${FA.resources[r]}` })}</div></div>`).join('')}${session.error ? `<p class="availability">${escape(session.error)}</p>` : ''}`,
            footer: `${button('تأیید دورریختن منابع', 'confirm-discard', { className: 'button button--primary full-width', disabled: selected !== required })}${button('توقف بازی', 'open:help', { className: 'button full-width' })}`,
        };
    }
    if (session.sheet?.kind === 'steal')
        return {
            title: 'انتخاب حریف کنار اهریمن',
            body: `<p>از یک حریف مجاور که منبع دارد، یک کارت تصادفی می‌گیری. نوع کارت را خودت انتخاب نمی‌کنی؛ تعداد شهر یا آبادی حریف شانس اضافه‌ای به او نمی‌دهد.</p>${(
                state.robberResolution?.victims ?? []
            )
                .map((id) => {
                    const p = state.players.find((p) => p.id === id)!;
                    return button(
                        `${escape(p.name)} • ${number(getPlayerSummary(state, p.id).resources)} کارت منبع`,
                        `steal:${id}`,
                        { className: 'button full-width' },
                    );
                })
                .join('')}`,
            footer: button('توقف بازی', 'open:help', { className: 'button full-width' }),
        };
    return session.sheet?.kind === 'development' ? developmentSheet(session) : null;
}
