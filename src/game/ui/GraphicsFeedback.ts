import { ICON_TEXTURE } from '../../ui/icons';
import type { Scene, GameObjects } from 'phaser';
import { MOTION, type Motion } from './motion';
import { UI_FONT_FAMILY } from './typography';
import { drawSurface, drawDie, UI_INK, type UiBox } from './graphicsTheme';
import { emblemIcon } from '../../ui/icons';
import { iconImage } from '../rendering/iconAtlas';
import { createSharpText } from '../rendering/sharpText';

export class GraphicsFeedback {
    private effects: GameObjects.Container;
    private diceDestination: HTMLElement | null = null;
    constructor(
        private scene: Scene,
        private parent: HTMLElement,
        private motion: Motion,
        private invalidate: () => void = () => {},
    ) {
        this.effects = scene.add.container();
    }
    private get origin() {
        const box = this.parent.getBoundingClientRect();
        return { x: box.left, y: box.top };
    }
    private box(element: Element): UiBox {
        const rect = element.getBoundingClientRect();
        return {
            x: rect.left - this.origin.x,
            y: rect.top - this.origin.y,
            width: rect.width,
            height: rect.height,
        };
    }
    /** All transient feedback is Phaser-owned; none of it submits a game action. */
    clear(): void {
        if (!this.effects) return;
        for (const child of this.effects.list) this.scene.tweens.killTweensOf(child);
        this.effects.removeAll(true);
        if (this.diceDestination) {
            this.diceDestination = null;
            this.invalidate();
        }
    }
    hides(element: HTMLElement): boolean {
        return this.diceDestination === element;
    }
    /** Actual committed values only. A moving clone never becomes an input target. */
    diceRoll(
        source: UiBox,
        destination: HTMLElement | null,
        values: readonly [number, number],
    ): void {
        if (
            !destination ||
            !this.effects ||
            this.motion.reduced ||
            !this.motion.visible ||
            source.width < 1
        )
            return;
        const end = this.box(destination);
        if (end.width < 1 || end.height < 1) return;
        const width = source.width,
            height = source.height;
        const face = Math.min((width - 10) / 2, height);
        const dice = this.scene.add.container(
            source.x - this.origin.x + width / 2,
            source.y - this.origin.y + height / 2,
        );
        const g = this.scene.add.graphics();
        drawDie(g, { x: -face - 5, y: -height / 2, width: face, height }, values[0]);
        drawDie(g, { x: 5, y: -height / 2, width: face, height }, values[1]);
        dice.add(g);
        this.effects.add(dice);
        this.diceDestination = destination;
        this.invalidate();
        dice.setScale(0.94).setAngle(-3);
        this.scene.tweens.add({
            targets: dice,
            scale: 1,
            angle: 0,
            duration: this.motion.duration(150),
            ease: 'Cubic.Out',
        });
        this.scene.tweens.add({
            targets: dice,
            x: end.x + end.width / 2,
            y: end.y + end.height / 2,
            scaleX: end.width / width,
            scaleY: end.height / height,
            delay: this.motion.duration(230),
            duration: this.motion.duration(280),
            ease: 'Cubic.InOut',
            onComplete: () => {
                dice.destroy();
                this.diceDestination = null;
                this.invalidate();
            },
        });
    }
    cardReveal(element: HTMLElement | null, kind: string): void {
        if (!element || !this.effects || this.motion.reduced || !this.motion.visible) return;
        const box = this.box(element);
        const card = this.scene.add.container(box.x + box.width / 2, box.y + box.height / 2);
        const g = this.scene.add.graphics();
        drawSurface(g, { x: -29, y: -38, width: 58, height: 76 }, 'amethyst', { flat: true });
        const emblem = iconImage(this.scene, 'cards', 0, 0, 44);
        card.add([g, emblem]);
        this.effects.add(card);
        this.scene.tweens.add({
            targets: card,
            scaleX: 0.08,
            duration: this.motion.duration(120),
            onComplete: () => {
                g.clear();
                drawSurface(g, { x: -29, y: -38, width: 58, height: 76 }, 'lapis', {
                    flat: true,
                    quiet: true,
                    accent: UI_INK.gold,
                });
                emblem.setTexture(ICON_TEXTURE, emblemIcon(kind));
                this.scene.tweens.add({
                    targets: card,
                    scaleX: 1,
                    alpha: 0,
                    y: card.y - 5,
                    duration: this.motion.duration(230),
                    onComplete: () => card.destroy(),
                });
            },
        });
    }
    pulse(element: HTMLElement | null, color = UI_INK.gold): void {
        if (!element || !this.effects || !this.motion.visible) return;
        const box = this.box(element);
        const ring = this.scene.add
            .graphics()
            .lineStyle(2, color, 0.9)
            .strokeRoundedRect(box.x, box.y, box.width, box.height, 13);
        this.effects.add(ring);
        this.scene.tweens.add({
            targets: ring,
            alpha: 0,
            duration: this.motion.duration(MOTION.board),
            onComplete: () => ring.destroy(),
        });
    }
    /** A finite sunburst announces your turn around the captain's crest. */
    turnStart(element: HTMLElement | null, owner: number): void {
        if (!element || !this.effects || this.motion.reduced || !this.motion.visible) return;
        const b = this.box(element);
        const cx = b.x + b.width / 2,
            cy = b.y + b.height / 2;
        const rays = this.scene.add.graphics();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const inner = b.width * 0.55,
                outer = inner + (i % 2 ? 4 : 7);
            rays.lineStyle(2, i % 2 ? owner : UI_INK.gold, 0.9).lineBetween(
                cx + Math.cos(angle) * inner,
                cy + Math.sin(angle) * inner,
                cx + Math.cos(angle) * outer,
                cy + Math.sin(angle) * outer,
            );
        }
        this.effects.add(rays);
        this.scene.tweens.add({
            targets: rays,
            alpha: 0,
            delay: this.motion.duration(180),
            duration: this.motion.duration(520),
            onComplete: () => rays.destroy(),
        });
        this.pulse(element, UI_INK.gold);
    }
    resourceChange(element: HTMLElement | null, spent: boolean): void {
        if (!element || !this.motion.visible) return;
        const box = this.box(element);
        const wash = this.scene.add
            .graphics()
            .fillStyle(spent ? 0xe9ad81 : 0xb4d5b6, 0.2)
            .fillRoundedRect(box.x + 2, box.y + 2, box.width - 4, box.height - 4, 5);
        this.effects.add(wash);
        this.scene.tweens.add({
            targets: wash,
            alpha: 0,
            duration: this.motion.reduced ? 260 : this.motion.duration(320),
            onComplete: () => wash.destroy(),
        });
    }
    delta(element: HTMLElement | null, value: string, spent: boolean): void {
        if (!element || !this.effects || !this.motion.visible) return;
        const box = this.box(element);
        const text = createSharpText(this.scene, box.x + box.width / 2, box.y + 6, value, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: 17,
            color: spent ? '#ffc3a1' : '#ffe6a1',
            stroke: '#0b2035',
            strokeThickness: 5,
        }).setOrigin(0.5);
        this.effects.add(text);
        this.scene.tweens.add({
            targets: text,
            y: this.motion.reduced ? text.y : text.y - 22,
            alpha: 0,
            delay: this.motion.duration(600),
            duration: this.motion.reduced ? 500 : this.motion.duration(500),
            onComplete: () => text.destroy(),
        });
    }
    fly(
        source: { x: number; y: number },
        destination: HTMLElement,
        resource: string,
        amount: string,
        owner: number,
        delay: number,
    ): void {
        if (!this.effects || this.motion.reduced || !this.motion.visible) return;
        const end = this.box(destination);
        const flight = this.scene.add.container(source.x - this.origin.x, source.y - this.origin.y);
        const g = this.scene.add.graphics();
        drawSurface(g, { x: -19, y: -19, width: 38, height: 38 }, 'inset', {
            accent: owner,
            radius: 12,
        });
        const icon = this.scene.add.image(0, -1, ICON_TEXTURE, resource);
        icon.setScale(28 / Math.max(icon.width, icon.height));
        const text = createSharpText(this.scene, 12, 10, amount, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: 12,
            color: '#fff3d6',
            stroke: '#10243c',
            strokeThickness: 3,
        }).setOrigin(0.5);
        flight.add([g, icon, text]);
        this.effects.add(flight);
        flight.setAlpha(0).setScale(0.7);
        this.scene.tweens.add({
            targets: flight,
            x: end.x + end.width / 2,
            y: end.y + end.height / 2,
            alpha: { from: 1, to: 0 },
            scale: 0.5,
            delay: this.motion.duration(delay),
            duration: this.motion.duration(MOTION.flight),
            ease: 'Cubic.easeInOut',
            onComplete: () => flight.destroy(),
        });
    }
    victory(): void {
        const emblem = this.parent.querySelector<HTMLElement>('.victory-art [data-icon="ranked"]');
        if (!emblem || this.motion.reduced || !this.motion.visible || !this.effects) return;
        const box = this.box(emblem);
        const sparkle = this.scene.add.container();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            sparkle.add(
                iconImage(
                    this.scene,
                    'score',
                    box.x + box.width / 2 + Math.cos(angle) * 65,
                    box.y + box.height / 2 + Math.sin(angle) * 58,
                    i % 2 ? 6 : 10,
                ),
            );
        }
        this.effects.add(sparkle);
        this.scene.tweens.add({
            targets: sparkle,
            alpha: 0,
            delay: this.motion.duration(180),
            duration: this.motion.duration(650),
            onComplete: () => sparkle.destroy(),
        });
        const glint = this.scene.add
            .image(box.x + box.width * 0.65, box.y + 12, 'ui-glint', 'crop')
            .setDisplaySize(64, 64)
            .setAlpha(0.65);
        this.effects.add(glint);
        this.scene.tweens.add({
            targets: glint,
            alpha: 0,
            angle: 12,
            duration: this.motion.duration(650),
            onComplete: () => glint.destroy(),
        });
    }
}
