import type { GameSession } from './session';

/** Reading time belongs to the completed event, not an animation or a guessed future command. */
export function botTurnDelay(session: GameSession): number {
    const transition = session.transition;
    if (!transition || transition.after !== session.state) return 1600;
    switch (transition.action.kind) {
        case 'roll':
            return transition.production.length ? 4200 : 3200;
        case 'setup-roll':
            return 2800;
        case 'build':
        case 'setup':
            return 3000;
        case 'trade':
        case 'domestic-trade':
            return 3400;
        case 'end-turn':
            return 1800;
        default:
            return 2800;
    }
}

/** Turn pacing is independent of Phaser and animation completion. */
export class BotTurnRunner {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;
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
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        if (this.disposed || !this.available() || this.session.botPaused || !this.session.botReady)
            return;
        const state = this.session.state!;
        this.timer = setTimeout(
            () => {
                this.timer = null;
                if (!this.disposed && this.available()) this.session.advanceBot(state);
                this.refresh();
            },
            (this.delay ?? botTurnDelay(this.session)) *
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
