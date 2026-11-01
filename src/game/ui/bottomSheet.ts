import { icon } from '../../ui/icons';
import { artSprite, button, escape } from './components';
import type { Material } from './graphicsTheme';
import { ART, type ArtName } from '../assets';

export interface SheetContent {
    title: string;
    tone?: Material;
    body: string;
    /** Persistent context painted outside the scrolling body mask. */
    context?: string;
    narrator?: { portrait: ArtName; key: string };
    footer?: string;
    key?: string;
    focusAction?: string;
    /** Keep a native edit session intact when unrelated platform state changes. */
    preserveInput?: boolean;
}

/** Native modal provides focus trapping and makes the covered interface inert. */
export class BottomSheet {
    private dialog = document.createElement('dialog');
    private openerAction: string | undefined;

    constructor(
        private parent: HTMLElement,
        onClose: () => void,
    ) {
        this.dialog.className = 'bottom-sheet';
        this.dialog.setAttribute('aria-labelledby', 'sheet-title');
        parent.append(this.dialog);
        this.dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            onClose();
        });
        this.dialog.addEventListener('click', (event) => {
            const bounds = this.dialog.getBoundingClientRect();
            if (
                event.target === this.dialog &&
                (event.clientY < bounds.top ||
                    event.clientY > bounds.bottom ||
                    event.clientX < bounds.left ||
                    event.clientX > bounds.right)
            )
                onClose();
        });
    }

    render(content: SheetContent | null, openerAction?: string): void {
        if (!content) {
            if (this.dialog.open) {
                this.dialog.close();
                const opener = [...this.parent.querySelectorAll<HTMLElement>('[data-action]')].find(
                    (el) =>
                        el.dataset.action === this.openerAction &&
                        !el.closest('dialog, [hidden]') &&
                        !el.matches(':disabled'),
                );
                const fallback =
                    this.parent.querySelector<HTMLElement>(
                        '.match-screen:not([hidden]) .roll-object:not([disabled]), .match-screen:not([hidden]) .dock-targets:not([disabled]), .match-screen:not([hidden]) .dock-primary:not([disabled])',
                    ) ??
                    this.parent.querySelector<HTMLElement>(
                        '.match-screen:not([hidden]) .match-bar button:not([disabled]), .main-menu:not([hidden]) button:not([disabled])',
                    );
                (opener ?? fallback)?.focus({ preventScroll: true });
            }
            return;
        }
        const wasOpen = this.dialog.open;
        if (wasOpen && content.preserveInput && this.dialog.querySelector('input')) return;
        const activeInput =
            document.activeElement instanceof HTMLInputElement ? document.activeElement : null;
        const selection = activeInput
            ? ([activeInput.selectionStart, activeInput.selectionEnd] as const)
            : null;
        const focusAction = wasOpen
            ? (document.activeElement as HTMLElement | null)?.dataset.action
            : undefined;
        const contentChanged = !!content.key && this.dialog.dataset.contentKey !== content.key;
        this.dialog.dataset.contentKey = content.key ?? '';
        this.dialog.dataset.tone = content.tone ?? 'lapis';
        this.dialog.classList.toggle('introduction-sheet', content.key === 'match-introduction');
        const narrationChanged =
            !!content.narrator && this.dialog.dataset.narration !== content.narrator.key;
        const scrollTop = this.dialog.querySelector('.sheet-body')?.scrollTop ?? 0;
        if (!wasOpen)
            this.openerAction =
                openerAction ?? (document.activeElement as HTMLElement | null)?.dataset.action;
        const portrait = content.narrator?.portrait;
        this.dialog.classList.toggle('narrator-sheet', !!portrait);
        this.dialog.dataset.portrait = portrait ?? '';
        this.dialog.dataset.narration = content.narrator?.key ?? '';
        const header = `<header class="sheet-header${portrait ? ' narrator-heading' : ''}"><h2 id="sheet-title">${icon(portrait ? 'practice' : 'sun', 22)}${escape(content.title)}${portrait ? '<span class="narrator-role">همراه سفر</span>' : ''}</h2>${button('×', 'close-sheet', { className: 'icon-button', label: 'بستن پنجره' })}</header>`;
        const expandedBody = content.body.replace(
            /<summary(?:\s[^>]*)?>/g,
            (opening) =>
                `${opening}<span class="disclosure-closed">${icon('expand', 16)}</span><span class="disclosure-open">${icon('collapse', 16)}</span>`,
        );
        const body = `<div class="sheet-body">${expandedBody}</div>`;
        if (portrait) {
            const [, , width, height] = ART[portrait].frame;
            this.dialog.innerHTML = `<div class="narrator-stage" aria-hidden="true" style="--portrait-ratio:${width / height}">${artSprite(portrait, 320, 'narrator-hero')}</div><section class="narrator-panel">${header}${body}<footer class="narrator-footer">${content.footer ?? ''}</footer></section>`;
        } else
            this.dialog.innerHTML = `${header}${content.context ? `<section class="sheet-context" aria-label="دارایی تو">${content.context}</section>` : ''}${body}${content.footer ? `<footer class="sheet-footer">${content.footer}</footer>` : ''}`;
        const nameInput = this.dialog.querySelector<HTMLInputElement>('#player-name');
        const preferred = [...this.dialog.querySelectorAll<HTMLElement>('[data-action]')].find(
            (el) => el.dataset.action === content.focusAction && !el.matches(':disabled'),
        );
        if (!wasOpen) {
            this.dialog.showModal();
            (
                preferred ??
                nameInput ??
                this.dialog.querySelector<HTMLElement>('[data-action="tutorial-next"]')
            )?.focus({ preventScroll: true });
        }
        if (wasOpen) {
            const restored = [...this.dialog.querySelectorAll<HTMLElement>('[data-action]')].find(
                (el) => el.dataset.action === focusAction && !el.matches(':disabled'),
            );
            (narrationChanged
                ? this.dialog.querySelector<HTMLElement>('[data-action="tutorial-next"]')
                : (restored ??
                  preferred ??
                  nameInput ??
                  this.dialog.querySelector<HTMLElement>('button'))
            )?.focus({
                preventScroll: true,
            });
            this.dialog.querySelector('.sheet-body')!.scrollTop =
                narrationChanged || contentChanged ? 0 : scrollTop;
            if (nameInput && selection && selection[0] !== null && selection[1] !== null)
                nameInput.setSelectionRange(selection[0], selection[1]);
        }
    }
    destroy(): void {
        this.dialog.close();
        this.dialog.remove();
    }
}
