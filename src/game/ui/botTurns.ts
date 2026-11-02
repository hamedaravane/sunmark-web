import type { GameSession } from './session';

/** Reading time belongs to the completed event, not an animation or a guessed future command. */
export function botTurnDelay(session: GameSession): number {
    const transition = session.transition;
    if (!transition || transition.after !== session.state) return 650;
    switch (transition.action.kind) {
        case 'roll':
            return transition.production.length ? 1200 : 950;
        case 'setup-roll':
            return 650;
        case 'build':
        case 'setup':
            return 900;
        case 'trade':
        case 'domestic-trade':
            return 1000;
        case 'end-turn':
            return 500;
        default:
            return 650;
    }
}

/** Turn pacing is independent of Phaser and animation completion. */
export class BotTurnRunner {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;
    private scheduledState: GameSession['state'] = null;
    private scheduledDialogue = false;
    private scheduledQuick = false;
    private unsubscribe: () => void;

    constructor(
        private session: GameSession,
        private available: () => boolean = () => true,
        private delay?: number,
    ) {
        this.unsubscribe = session.subscribe(this.refresh);
        this.refresh();
    }

    refresh = (): void => {
        const dialogue = this.session.rivalReady;
        if (
            this.disposed ||
            !this.available() ||
            (this.session.botPaused && !dialogue) ||
            (!dialogue && !this.session.botReady)
        ) {
            if (this.timer !== null) clearTimeout(this.timer);
            this.timer = null;
            this.scheduledState = null;
            return;
        }
        const quick = this.session.preferences.snapshot.quick;
        if (
            this.timer !== null &&
            this.scheduledState === this.session.state &&
            this.scheduledDialogue === dialogue &&
            this.scheduledQuick === quick
        )
            return;
        if (this.timer !== null) clearTimeout(this.timer);
        this.scheduledState = this.session.state;
        this.scheduledDialogue = dialogue;
        this.scheduledQuick = quick;
        const state = this.session.state!;
        this.timer = setTimeout(
            () => {
                this.timer = null;
                if (!this.disposed && this.available()) {
                    if (dialogue) this.session.presentRival(state);
                    else this.session.advanceBot(state);
                }
                this.refresh();
            },
            (this.delay ??
                (dialogue ? (this.session.transition ? 1100 : 0) : botTurnDelay(this.session))) *
                (this.session.preferences.snapshot.quick ? 0.55 : 1),
        );
    };

    destroy(): void {
        this.disposed = true;
        this.unsubscribe();
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
    }
}
