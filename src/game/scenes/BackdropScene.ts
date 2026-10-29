import { Scene, type GameObjects } from 'phaser';
import { TEXTURE_FILES, assetUrl } from '../assets';
import type { MatchSession } from '../ui/matchSession';
import type { Motion } from '../ui/motion';
import { ProceduralOcean } from '../rendering/ProceduralOcean';
import { configureDisplayCamera } from '../rendering/display';

/** Background and board use separate cameras in the same Phaser game/context. */
export class BackdropScene extends Scene {
    private image: GameObjects.Image;
    private shade: GameObjects.Graphics;
    private ocean: ProceduralOcean;
    constructor(
        private session: MatchSession,
        private motion: Motion,
    ) {
        super('BackdropScene');
    }
    preload(): void {
        this.load.image('ui-palace', assetUrl(TEXTURE_FILES.menuBackground));
    }
    create(): void {
        this.ocean = new ProceduralOcean(this);
        this.image = this.add.image(0, 0, 'ui-palace').setOrigin(0.5);
        this.shade = this.add.graphics();
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
        this.image.setVisible(!this.session.state).setPosition(width / 2, height / 2);
        this.image.setScale(Math.max(width / this.image.width, height / this.image.height));
        this.shade.clear().fillStyle(0x08192d, 0.32);
        if (!this.session.state) this.shade.fillRect(0, 0, width, height);
    }

    update(_time: number, delta: number): void {
        this.ocean?.update(
            delta,
            this.motion.visible && !this.motion.reduced && !this.session.sheet,
        );
    }
}
