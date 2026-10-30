import { DEVELOPMENT_LABELS, cardAvailability } from './developmentMarkup';
import { heroDice, actionDock, turnStatus } from './turnMarkup';
import { turnSurface } from './turnSurface';
import type { UiBox } from './graphicsTheme';
import type { PresentedTransition as MatchTransition } from './transitions';
import type { MatchState } from './matchState';
import { EXPERIENCE_DEFAULTS, type ExperienceOption } from './experiencePreferences';
import { LESSONS, type LessonId } from '../tutorial/lessons.fa';
import { BUILD_TYPES } from '../core/building';
import { RESOURCE_TYPES, type ResourceType, type TradeRatio } from '../core/types';
import { BottomSheet, type SheetContent } from './bottomSheet';
import { number, button, escape } from './components';
import { sheetContent } from './sheets';
import { matchGeometry } from './matchGeometry';
import { responsiveLayout, responsiveProperties } from './responsiveLayout';
import { desktopShortcuts, desktopTurnHeading } from './desktopMarkup';
import { type MatchSession } from './matchSession';
import type { AppPlatform } from '../../pwa/app';
import { appContent, updateContent } from '../../pwa/markup';
import { applyUpdate } from '../../pwa/updateFlow';
import { menuContent } from './menu';
import { humanHeader, humanHand } from './humanHud';
import { introductionContent } from './matchIntroduction';

export class GameHud {
    readonly boardViewport: HTMLElement;
    private sheet: BottomSheet;
    private unsubscribe: () => void;
    private unsubscribePlatform: () => void;
    private rollOrigin: { state: MatchState; box: UiBox } | null = null;
    private lastNotice = '';
    private lastAnnouncedTransition = 0;
    private receiptId = 0;
    private receiptActive = false;
    private receiptTimer: ReturnType<typeof setTimeout> | null = null;
    private sizeObserver: ResizeObserver;
    private lastPrimaryAt = -Infinity;
    private lastTradeReviewAt = -Infinity;
    private matchPrepared = false;
    private markup = new Map<string, string>();

    constructor(
        private parent: HTMLElement,
        private session: MatchSession,
        private app: AppPlatform,
    ) {
        parent.className = 'game-app is-menu';
        parent.innerHTML = `<section class="main-menu" aria-label="آغاز بازی"><div class="menu-panel"></div></section>
            <section class="match-screen" aria-label="صفحه بازی" hidden>
                <header class="match-bar"></header>
                <div class="match-controls">
                    <header class="command-heading"></header><div class="board-roll"></div><div class="context-line"></div>
                    <section class="resource-hand" aria-label="منابع شما"></section><section class="action-dock" aria-label="کنترل‌های نوبت"></section>${desktopShortcuts()}<div class="bottom-space"></div>
                </div>
                <div class="board-viewport"><div class="board-stage"><div class="board-canvas" aria-hidden="true"></div><p class="board-loading">در حال آماده‌سازی جزیره…</p></div></div>
            </section><div class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div>`;
        this.boardViewport = parent.querySelector('.board-canvas')!;
        this.sheet = new BottomSheet(parent, () => session.closeSheet());
        parent.addEventListener('click', this.onClick);
        parent.addEventListener('input', this.onInput);
        document.addEventListener('selectionchange', this.syncNameInput);
        document.addEventListener('keydown', this.onKeyDown);
        this.unsubscribe = session.subscribe(() => this.render());
        this.unsubscribePlatform = app.subscribe(() => this.render());
        this.sizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.height <= 0) continue;
                if (entry.target === parent) {
                    parent.classList.toggle('is-compact', entry.contentRect.height < 720);
                    const layout = responsiveLayout(
                        entry.contentRect.width,
                        entry.contentRect.height,
                    );
                    const match = this.part('.match-screen');
                    match.classList.toggle('is-wide', layout.wide);
                    match.classList.toggle('is-desktop', layout.desktop);
                    parent.classList.toggle('is-desktop', layout.desktop);
                    for (const [key, value] of Object.entries(responsiveProperties(layout))) {
                        match.style.setProperty(key, value);
                        parent.style.setProperty(key, value);
                    }
                } else {
                    const geometry = matchGeometry(
                        entry.contentRect.width,
                        entry.contentRect.height,
                        this.part('.match-screen').classList.contains('is-wide'),
                        this.part('.match-screen').classList.contains('is-desktop'),
                    );
                    this.part('.match-screen').classList.toggle(
                        'dice-on-ledge',
                        geometry.diceOnLedge,
                    );
                    this.part('.board-roll').style.setProperty(
                        '--die-size',
                        `${geometry.dieSize}px`,
                    );
                }
            }
        });
        this.sizeObserver.observe(parent);
        this.sizeObserver.observe(this.part('.board-stage'));
        this.render();
        if (!app.installed && !session.online) session.openSheet({ kind: 'app' });
    }

    boardReady(): void {
        this.matchPrepared = true;
        this.part('.board-loading').hidden = true;
        this.render();
        if (this.session.sheet?.kind === 'introduction')
            this.parent
                .querySelector<HTMLElement>('[data-action="enter-match"]')
                ?.focus({ preventScroll: true });
    }
    private part(selector: string): HTMLElement {
        return this.parent.querySelector(selector)!;
    }
    private updatePart(selector: string, markup: string): void {
        if (this.markup.get(selector) === markup) return;
        this.part(selector).innerHTML = markup;
        this.markup.set(selector, markup);
    }

    private render(): void {
        const state = this.session.state;
        const focusAction = (document.activeElement as HTMLElement | null)?.dataset.action;
        this.parent.classList.toggle('is-menu', !state);
        this.part('.main-menu').hidden = state !== null;
        this.part('.match-screen').hidden = state === null;
        this.updatePart('.menu-panel', menuContent(this.app, this.session));
        if (!state) {
            this.sheet.render(this.content(), focusAction);
            if (focusAction && !this.session.sheet) this.restoreFocus(focusAction);
            return;
        }
        const human = this.session.humanPlayer!;
        const surface = turnSurface(state, human.id, !!this.session.practice);
        this.updatePart('.match-bar', humanHeader(this.session));
        this.updatePart('.command-heading', desktopTurnHeading(this.session));
        this.part('.match-screen').classList.toggle('is-awaiting-roll', surface.hero);
        this.updatePart('.board-roll', heroDice(this.session));
        const receiptId = this.session.transition?.id ?? 0;
        if (receiptId !== this.receiptId) {
            if (this.receiptTimer) clearTimeout(this.receiptTimer);
            this.receiptId = receiptId;
            this.receiptActive = receiptId !== 0;
            if (this.receiptActive)
                this.receiptTimer = setTimeout(() => {
                    this.receiptTimer = null;
                    this.receiptActive = false;
                    if (this.session.state === state)
                        this.updatePart('.context-line', turnStatus(this.session, false));
                }, 2800);
        }
        this.updatePart('.context-line', turnStatus(this.session, this.receiptActive));
        const online = this.session.online;
        this.parent.classList.toggle('is-online', !!online);
        const status = this.parent.querySelector<HTMLElement>('.online-match-status');
        status?.remove();
        if (online && (online.pending || !online.connected || this.session.error)) {
            const status = document.createElement('div');
            status.className = 'online-match-status';
            status.setAttribute('role', 'status');
            status.textContent = online.pending
                ? 'نتیجه حرکت در انتظار پاسخ است.'
                : this.session.error || 'در حال اتصال دوباره به بازی…';
            if (online.pending) {
                const retry = document.createElement('button');
                retry.dataset.action = 'online-retry';
                retry.className = 'button';
                retry.textContent = 'پیگیری همان حرکت';
                retry.disabled = online.busy;
                status.append(retry);
            }
            this.part('.match-controls').append(status);
        }
        this.updatePart('.resource-hand', humanHand(this.session));
        this.part('.resource-hand').setAttribute('aria-label', `منابع ${human.name}`);
        this.updatePart('.action-dock', actionDock(this.session));
        if (focusAction && !this.session.sheet) this.restoreFocus(focusAction);
        const transitionId = this.session.transition?.id ?? 0;
        if (
            this.session.notice !== this.lastNotice ||
            transitionId !== this.lastAnnouncedTransition
        ) {
            let announcement = this.session.notice;
            const transition = this.session.transition;
            if (
                transition?.action.kind === 'buy-development' &&
                transition.before.players[transition.before.activePlayerIndex].id === human.id
            ) {
                const cards = state.development?.hands[human.id] ?? [];
                const card = cards[cards.length - 1];
                if (card)
                    announcement = `${DEVELOPMENT_LABELS[card.kind]}؛ ${cardAvailability(this.session, card)}؛ اکنون ${number(cards.length)} کارت داری.`;
            }
            this.part('.sr-only[role="status"]').textContent = announcement;
            this.lastNotice = this.session.notice;
            this.lastAnnouncedTransition = transitionId;
        }
        this.sheet.render(this.content(), focusAction);
        for (const button of this.parent.querySelectorAll<HTMLButtonElement>(
            'button[data-network-disabled]',
        )) {
            button.disabled = false;
            delete button.dataset.networkDisabled;
        }
        if (online?.busy || online?.pending) {
            for (const button of this.parent.querySelectorAll<HTMLButtonElement>(
                'button[data-action]',
            )) {
                const action = button.dataset.action?.split(':')[0] ?? '';
                if (
                    !button.disabled &&
                    [
                        'primary',
                        'roll-dice',
                        'build',
                        'confirm-trade',
                        'buy-development',
                        'play-development',
                        'declare-victory',
                        'confirm-discard',
                        'steal',
                        'confirm-end-turn',
                        'deal-send',
                        'deal-accept',
                        'deal-reject',
                        'deal-finish',
                        'deal-withdraw',
                    ].includes(action)
                ) {
                    button.disabled = true;
                    button.dataset.networkDisabled = 'true';
                }
            }
        }
    }
    private restoreFocus(action: string): void {
        const preserved = [...this.parent.querySelectorAll<HTMLElement>('[data-action]')].find(
            (el) =>
                el.dataset.action === action && !el.closest('dialog') && !el.matches(':disabled'),
        );
        const fallback =
            action === 'roll-dice'
                ? this.parent.querySelector<HTMLElement>('.action-dock button:not(:disabled)')
                : null;
        (preserved ?? fallback)?.focus({ preventScroll: true });
    }

    consumeRollOrigin(transition: MatchTransition): UiBox | null {
        const origin = this.rollOrigin;
        this.rollOrigin = null;
        return origin?.state === transition.before ? origin.box : null;
    }

    private content(): SheetContent | null {
        if (!this.session.sheet) return null;
        if (this.session.sheet.kind === 'update') return updateContent(this.app, this.session);
        if (this.session.sheet.kind === 'app') return appContent(this.app, this.session);
        if (this.session.sheet.kind === 'introduction')
            return introductionContent(this.session, this.matchPrepared);
        const content = sheetContent(this.session, this.app.updateReady);
        const kind = this.session.sheet.kind;
        content.tone =
            kind === 'build'
                ? 'coral'
                : ['trade', 'domestic', 'port', 'ports'].includes(kind)
                  ? 'turquoise'
                  : kind.startsWith('development')
                    ? 'amethyst'
                    : kind === 'results'
                      ? 'emerald'
                      : 'lapis';
        const online = this.session.online;
        if (online?.pending) {
            content.footer = `<p class="availability" role="status">نتیجه حرکت قبلی هنوز قطعی نیست.</p>${button('پیگیری همان حرکت', 'online-retry', { className: 'button button--primary full-width', disabled: online.busy })}${content.footer ?? ''}`;
        } else if (online && this.session.error) {
            content.context = `${content.context ?? ''}<p class="availability" role="alert">${escape(this.session.error)}</p>`;
        }
        return content;
    }

    private onClick = (event: MouseEvent): void => {
        const target = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
        if (!target || target.disabled) return;
        if (this.app.updating) return;
        const [action, value, resource] = target.dataset.action!.split(':');
        const targetId = target.dataset.action!.slice(action.length + 1);
        if (
            action === 'enter-match' &&
            this.matchPrepared &&
            this.session.sheet?.kind === 'introduction'
        )
            this.session.closeSheet();
        if (action === 'online-retry') this.session.online?.retry();
        if (action === 'account')
            this.parent.dispatchEvent(new CustomEvent('sunmark:account', { bubbles: true }));
        if (action === 'online')
            this.parent.dispatchEvent(new CustomEvent('sunmark:online', { bubbles: true }));
        if (action === 'play' || action === 'tutorial')
            this.session.requestPlay(action === 'tutorial');
        if (action === 'resume-match') this.session.resumeSaved();
        if (action === 'restart-match') this.session.requestStart(4);
        if (action === 'confirm-new-match') this.session.confirmNewMatch();
        if (action === 'confirm-player-name') {
            const input = this.parent.querySelector<HTMLInputElement>('#player-name');
            if (input) this.session.playerNameDraft = input.value;
            this.session.confirmPlayerName();
        }
        if (action === 'open-app') this.session.openSheet({ kind: 'app' });
        if (action === 'app-install') void this.app.install();
        if (action === 'app-retry') this.app.retry();
        if (action === 'app-update') {
            void applyUpdate(this.app, this.session);
        }
        if (action === 'tutorial-next') this.session.continueTutorial();
        if (action === 'tutorial-pause') this.session.setTutorialEnabled(false);
        if (action === 'tutorial-resume') this.session.setTutorialEnabled(true);
        if (action === 'lesson' && Object.prototype.hasOwnProperty.call(LESSONS, value))
            this.session.replayLesson(value as LessonId);
        if (
            action === 'open' &&
            [
                'build',
                'development',
                'development-rules',
                'experience',
                'experience-guide',
                'trade',
                'domestic',
                'help',
                'rules',
                'review',
                'history',
                'targets',
                'inspect',
                'journal',
                'opponents',
            ].includes(value)
        )
            this.session.openSheet({
                kind: value as
                    | 'build'
                    | 'development'
                    | 'development-rules'
                    | 'experience'
                    | 'experience-guide'
                    | 'trade'
                    | 'domestic'
                    | 'help'
                    | 'rules'
                    | 'review'
                    | 'history'
                    | 'targets'
                    | 'inspect'
                    | 'journal'
                    | 'opponents',
            });
        if (
            action === 'inspect' &&
            this.session.state?.board.tiles.some((tile) => tile.id === targetId)
        )
            this.session.openSheet({ kind: 'tile', id: targetId });
        if (action === 'preview-target') this.session.chooseTargetFromSheet(targetId);
        if (action === 'port' && this.session.state?.board.ports.some((port) => port.id === value))
            this.session.openSheet({ kind: 'port', id: value });
        if (action === 'trade-port') this.session.tradeFromPort(value);
        if (action === 'trade-rate' && [2, 3, 4].includes(Number(value)))
            this.session.chooseTradeRatio(Number(value) as TradeRatio);
        if (action === 'player') this.session.openSheet({ kind: 'player', id: value });
        if (action === 'close-sheet' || action === 'resume-game') this.session.closeSheet();
        if (action === 'build' && BUILD_TYPES.some((type) => type === value))
            this.session.chooseBuild(value as (typeof BUILD_TYPES)[number]);
        if (
            action === 'trade' &&
            (value === 'give' || value === 'receive') &&
            RESOURCE_TYPES.some((r) => r === resource)
        )
            this.session.chooseTrade(value, resource as ResourceType);
        if (this.session.sheet?.kind === 'domestic') {
            const market = this.session.trading;
            if (
                action === 'deal-adjust' &&
                (value === 'give' || value === 'want') &&
                RESOURCE_TYPES.includes(resource as ResourceType)
            )
                market.adjust(
                    value,
                    resource as ResourceType,
                    Number(target.dataset.action!.split(':')[3]),
                );
            if (action === 'deal-target') market.selectTarget(value === 'all' ? null : value);
            if (action === 'deal-send') market.send();
            if (action === 'deal-new') market.edit();
            if (action === 'deal-counter') market.edit(Number(value));
            if (action === 'deal-accept') {
                this.lastTradeReviewAt = performance.now();
                market.respond(Number(value), true);
            }
            if (action === 'deal-reject') market.respond(Number(value), false);
            if (action === 'deal-review') {
                this.lastTradeReviewAt = performance.now();
                market.review(Number(value));
            }
            if (action === 'deal-withdraw') market.withdraw(Number(value));
            if (action === 'deal-finish' && performance.now() - this.lastTradeReviewAt >= 300)
                market.finish(Number(value));
        }
        if (
            action === 'pin-build' &&
            (value === 'clear' || BUILD_TYPES.includes(value as (typeof BUILD_TYPES)[number]))
        )
            this.session.setBuildGoal(
                value === 'clear' ? null : (value as (typeof BUILD_TYPES)[number]),
            );
        if (action === 'trade-for' && RESOURCE_TYPES.includes(value as ResourceType))
            this.session.tradeForResource(value as ResourceType);
        if (
            action === 'experience' &&
            Object.prototype.hasOwnProperty.call(EXPERIENCE_DEFAULTS, value) &&
            value !== 'introduced'
        )
            this.session.setExperienceOption(value as ExperienceOption);
        if (
            action === 'roll-dice' &&
            this.session.state &&
            !this.session.sheet &&
            turnSurface(this.session.state, this.session.humanPlayer!.id, !!this.session.practice)
                .hero
        ) {
            const rect = this.parent.querySelector('.hero-dice')!.getBoundingClientRect();
            this.rollOrigin = {
                state: this.session.state,
                box: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            };
            this.session.roll();
        }
        if (action === 'buy-development') this.session.buyCard();
        if (action === 'development-select') this.session.selectDevelopment(value);
        if (
            action === 'development-resource' &&
            ['0', '1'].includes(value) &&
            RESOURCE_TYPES.includes(resource as ResourceType)
        )
            this.session.chooseDevelopmentResource(
                Number(value) as 0 | 1,
                resource as ResourceType,
            );
        if (action === 'play-development') this.session.playCard();
        if (action === 'declare-victory') this.session.declareVictory();
        if (action === 'discard-adjust' && RESOURCE_TYPES.includes(value as ResourceType))
            this.session.adjustDiscard(value as ResourceType, Number(resource));
        if (action === 'confirm-discard') this.session.confirmDiscard();
        if (action === 'steal') this.session.stealFrom(value);
        if (action === 'confirm-trade') this.session.confirmTrade();
        if (action === 'confirm-end-turn') this.session.confirmEndTurn();
        if (action === 'primary') {
            // A rapid second tap must not hit End Turn just after Confirm Build.
            const now = performance.now();
            if (now - this.lastPrimaryAt >= 300) {
                this.lastPrimaryAt = now;
                this.session.primary();
            }
        }
        if (action === 'cancel-placement') this.session.cancelPlacement();
        if (action === 'new-game') {
            this.session.returnToMenu();
            if (this.app.updateReady) this.session.openSheet({ kind: 'update' });
        }
    };
    private onInput = (event: Event): void => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.dataset.action !== 'player-name') return;
        this.session.playerNameDraft = input.value;
        this.syncNameInput();
    };
    private syncNameInput = (): void => {
        const input = this.parent.querySelector<HTMLInputElement>('#player-name');
        const value = input?.parentElement?.querySelector<HTMLElement>('.name-entry-value');
        if (!input || !value) return;
        const text = input.value || 'اسمت رو بنویس…';
        if (value.textContent !== text) value.textContent = text;
        value.classList.toggle('is-empty', !input.value);
        value.scrollLeft = input.scrollLeft;
    };
    private onKeyDown = (event: KeyboardEvent): void => {
        if (
            event.key === 'Enter' &&
            !event.isComposing &&
            this.session.sheet?.kind === 'player-name' &&
            event.target instanceof HTMLInputElement &&
            !this.app.updating
        ) {
            event.preventDefault();
            this.session.playerNameDraft = event.target.value;
            this.session.confirmPlayerName();
        }
        if (event.key === 'Escape' && !this.session.sheet && this.session.placement)
            this.session.cancelPlacement();
    };
    destroy(): void {
        if (this.receiptTimer) clearTimeout(this.receiptTimer);
        this.unsubscribe();
        this.unsubscribePlatform();
        this.sizeObserver.disconnect();
        this.sheet.destroy();
        this.parent.removeEventListener('click', this.onClick);
        this.parent.removeEventListener('input', this.onInput);
        document.removeEventListener('selectionchange', this.syncNameInput);
        document.removeEventListener('keydown', this.onKeyDown);
    }
}
