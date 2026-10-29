import { viewerResources } from './matchState';
import type { MatchState } from './matchState';
import type { GameScene } from '../scenes/GameScene';
import { RESOURCE_TYPES, type ResourceType } from '../core/types';
import { number } from './components';
import type { Motion } from './motion';
import type { Placement, Sheet } from './session';
import type { MatchSession } from './matchSession';
import type { PresentedTransition as MatchTransition } from './transitions';
import type { InterfaceScene } from './InterfaceScene';
import { getVictoryPoints } from './matchState';
import { GameAudio } from './GameAudio';
import type { UiBox } from './graphicsTheme';

/** Bridges confirmed state to bounded Phaser effects; never submits a command. */
export class GameFeedback {
    private audio: GameAudio;
    private unsubscribe: () => void;
    private unsubscribeLayout: () => void;
    private unsubscribeMotion: () => void;
    private lastTransition: MatchTransition | null;
    private lastState: MatchState | null;
    private lastSheet: Sheet | null;
    private lastPlacement: Placement | null;
    private lastError: string | null;
    private lastGive: ResourceType | null;
    private lastReceive: ResourceType | null;
    private lastCard: string | null;
    private cancelOnScroll = () => this.clear();

    constructor(
        private parent: HTMLElement,
        private session: MatchSession,
        private board: GameScene,
        private ui: InterfaceScene,
        motion: Motion,
        private rollOrigin: (transition: MatchTransition) => UiBox | null = () => null,
    ) {
        this.audio = new GameAudio(parent, session.preferences, motion);
        this.lastTransition = session.transition;
        this.lastState = session.state;
        this.lastSheet = session.sheet;
        this.lastPlacement = session.placement;
        this.lastError = session.error;
        this.lastGive = session.give;
        this.lastReceive = session.receive;
        this.lastCard = session.selectedDevelopmentId;
        parent.addEventListener('scroll', this.cancelOnScroll, true);
        this.unsubscribe = session.subscribe(() => this.update());
        this.unsubscribeLayout = board.subscribeLayout(() => this.clear());
        this.unsubscribeMotion = motion.subscribe(() => this.clear());
    }
    private clear(): void {
        this.ui.feedback?.clear();
        this.board.clearEffects();
    }
    private query(selector: string): HTMLElement | null {
        return this.parent.querySelector<HTMLElement>(selector);
    }
    private update(): void {
        const state = this.session.state;
        if (!state) this.audio.stop();
        if (
            state !== this.lastState ||
            this.session.sheet !== this.lastSheet ||
            this.session.selectedDevelopmentId !== this.lastCard
        )
            this.clear();
        const transition = this.session.transition;
        if (transition !== this.lastTransition) {
            this.lastTransition = transition;
            if (transition && transition.after === state) this.play(transition);
        }
        if (this.session.placement?.targetId && this.session.placement !== this.lastPlacement)
            this.ui.feedback?.pulse(this.query('.dock-primary'));
        if (this.session.error && this.session.error !== this.lastError)
            this.ui.feedback?.pulse(
                this.query('dialog[open] .availability') ?? this.query('.context-line'),
                0xffb595,
            );
        if (this.session.give !== this.lastGive)
            this.ui.feedback?.pulse(
                this.query('dialog[open] [data-action^="trade:give:"][aria-pressed="true"]'),
            );
        if (this.session.receive !== this.lastReceive)
            this.ui.feedback?.pulse(
                this.query('dialog[open] [data-action^="trade:receive:"][aria-pressed="true"]'),
            );
        this.lastState = state;
        this.lastSheet = this.session.sheet;
        this.lastPlacement = this.session.placement;
        this.lastError = this.session.error;
        this.lastGive = this.session.give;
        this.lastReceive = this.session.receive;
        this.lastCard = this.session.selectedDevelopmentId;
    }
    private play(transition: MatchTransition): void {
        const { action, before, after } = transition;
        const active = after.players[after.activePlayerIndex];
        const humanId = this.session.humanPlayer!.id;
        const human = viewerResources(after, humanId);
        const previousHuman = viewerResources(before, humanId);
        this.audio.play(transition, humanId);
        for (const resource of RESOURCE_TYPES) {
            const delta = human[resource] - previousHuman[resource];
            if (delta) {
                this.ui.feedback?.resourceChange(
                    this.query(`.hand-resource[data-resource="${resource}"]`),
                    delta < 0,
                );
                this.ui.feedback?.delta(
                    this.query(`.hand-resource[data-resource="${resource}"]`),
                    `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))}`,
                    delta < 0,
                );
            }
        }
        if (
            (action.kind === 'roll' || action.kind === 'setup-roll') &&
            before.players[before.activePlayerIndex].id === humanId
        ) {
            const origin = this.rollOrigin(transition);
            const values = action.kind === 'roll' ? after.lastRoll : after.setup?.lastRoll?.dice;
            if (origin && values && !this.session.sheet)
                this.ui.feedback?.diceRoll(origin, this.query('.dice-pair'), values);
            else this.ui.feedback?.pulse(this.query('.dice-result'));
        }
        if (action.kind === 'roll') {
            if (!this.session.sheet)
                transition.production
                    .filter((grant) => grant.playerId === humanId)
                    .slice(0, 6)
                    .forEach((grant, index) => {
                        const source = this.board.tileAnchor(grant.tileId);
                        const target =
                            grant.playerId === humanId
                                ? this.query(
                                      `.hand-resource[data-resource="${grant.resource}"] .resource-icon`,
                                  )
                                : null;
                        const owner = after.players.find(({ id }) => id === grant.playerId)!;
                        if (source && target)
                            this.ui.feedback?.fly(
                                source,
                                target,
                                grant.resource,
                                number(grant.amount),
                                owner.color,
                                200 + index * 30,
                            );
                    });
        }
        const pointDelta = getVictoryPoints(after, humanId) - getVictoryPoints(before, humanId);
        if (pointDelta) {
            this.ui.feedback?.pulse(this.query('.human-score'));
            this.ui.feedback?.delta(
                this.query('.human-score'),
                `${pointDelta > 0 ? '+' : '−'}${number(Math.abs(pointDelta))}`,
                pointDelta < 0,
            );
        }
        if (
            action.kind === 'buy-development' &&
            before.players[before.activePlayerIndex].id === humanId &&
            this.session.sheet?.kind === 'development'
        ) {
            const old = new Set(before.development!.hands[humanId].map((c) => c.id));
            const card = after.development!.hands[humanId].find((c) => !old.has(c.id));
            if (card)
                this.ui.feedback?.cardReveal(
                    this.query(
                        `.development-feature[data-development-id="${card.id}"] .action-emblem`,
                    ),
                    card.kind,
                );
        }
        if (action.kind === 'end-turn' && this.session.isHumanTurn)
            this.ui.feedback?.turnStart(this.query('.header-active .player-avatar'), active.color);
        if (after.phase === 'finished') this.ui.feedback?.victory();
        if (!this.session.sheet) this.board.playTransition(transition);
    }
    destroy(): void {
        this.parent.removeEventListener('scroll', this.cancelOnScroll, true);
        this.audio.destroy();
        this.unsubscribe();
        this.unsubscribeLayout();
        this.unsubscribeMotion();
        this.clear();
    }
}
