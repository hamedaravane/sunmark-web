import { Scene } from 'phaser';
import type { MatchSession } from '../ui/matchSession';
import type { Motion } from '../ui/motion';
import { ProceduralOcean } from '../rendering/ProceduralOcean';
import { configureDisplayCamera } from '../rendering/display';

/** Background and board use separate cameras in the same Phaser game/context. */
export class BackdropScene extends Scene {
    private ocean: ProceduralOcean;
    constructor(
        private session: MatchSession,
        private motion: Motion,
    ) {
        super('BackdropScene');
    }
    create(): void {
        this.ocean = new ProceduralOcean(this);
        const unsubscribe = this.session.subscribe(() => this.renderBackground());
        this.scale.on('resize', this.renderBackground, this);
        const dispose = () => {
            unsubscribe();
            this.ocean.destroy();
            this.scale.off('resize', this.renderBackground, this);
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
        this.renderBackground();
    }
    private renderBackground(): void {
        const { width, height } = configureDisplayCamera(this);
        this.ocean.resize(width, height);
        this.ocean.setActive(!!this.session.state);
    }

    update(_time: number, delta: number): void {
        this.ocean?.update(
            delta,
            this.motion.visible && !this.motion.reduced && !this.session.sheet,
        );
    }
}
