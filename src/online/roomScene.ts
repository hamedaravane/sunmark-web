import { CANVAS, Scene, type GameObjects } from 'phaser';
import { configureDisplayCamera, textDensity } from '../game/rendering/display';
import { createSharpText } from '../game/rendering/sharpText';
import { drawSurface, drawDie, type Material } from '../game/ui/graphicsTheme';
import { drawPlayerAvatar } from '../game/ui/playerAvatarArt';
import { assetUrl, TEXTURE_FILES } from '../game/assets';
export class RoomScene extends Scene {
    private objects: GameObjects.GameObject[] = [];

    private pressed: Element | null = null;
    private dirty = true;

    private observer: ResizeObserver | null = null;
    constructor(private readonly root: HTMLElement) {
        super('OnlineRooms');
    }
    preload() {
        this.load.image('online-palace', assetUrl(TEXTURE_FILES.menuBackground));
    }
    create() {
        void document.fonts.ready.then(() => this.invalidate());
        this.observer = new ResizeObserver(() => this.invalidate());
        this.observer.observe(this.root);
        this.root.addEventListener('scroll', this.onScroll, true);
        this.root.addEventListener('input', this.onScroll);
        this.root.addEventListener('focusin', this.onScroll);
        this.root.addEventListener('focusout', this.onScroll);
        this.scale.on('resize', this.onScroll);
        const press = (event: Event) => {
            this.pressed = event.target instanceof Element ? event.target.closest('button') : null;
            this.invalidate();
        };
        const release = () => {
            this.pressed = null;
            this.invalidate();
        };
        this.root.addEventListener('pointerdown', press);
        window.addEventListener('pointerup', release);
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            this.root.removeEventListener('pointerdown', press);
            window.removeEventListener('pointerup', release);
            this.observer?.disconnect();
            this.root.removeEventListener('scroll', this.onScroll, true);
            this.root.removeEventListener('input', this.onScroll);
            this.root.removeEventListener('focusin', this.onScroll);
            this.root.removeEventListener('focusout', this.onScroll);
            this.scale.off('resize', this.onScroll);
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
    }
    private onScroll = () => this.invalidate();
    invalidate() {
        this.dirty = true;
    }
    update() {
        if (this.dirty) {
            this.dirty = false;
            this.paint();
        }
    }
    private keep<T extends GameObjects.GameObject>(item: T): T {
        this.objects.push(item);
        return item;
    }
    private text(value: string, x: number, y: number, width: number, size = 15, color = '#fff4dc') {
        return this.keep(
            createSharpText(this, x, y, value, {
                fontFamily: 'Vazirmatn',
                fontSize: size,
                color,
                rtl: true,
                padding: { x: 2, y: 2 },
            })
                .setOrigin(0.5)
                .setWordWrapWidth(Math.max(1, width) * textDensity(this)),
        );
    }

    private paint() {
        this.objects.forEach((object) => object.destroy());
        this.objects = [];
        const root = this.game.canvas.getBoundingClientRect();
        const width = root.width,
            height = root.height;
        if (!width || !height) return;
        configureDisplayCamera(this);
        this.cameras.main.setBackgroundColor('#111b3b');
        if (this.textures.exists('online-palace')) {
            const image = this.keep(this.add.image(width / 2, height / 2, 'online-palace'));
            image.setScale(Math.max(width / image.width, height / image.height));
            this.keep(this.add.graphics()).fillStyle(0x111b3b, 0.7).fillRect(0, 0, width, height);
        }
        // Every scroll region owns one clipped paint container. Phaser 4 WebGL
        // requires external mask filters; GeometryMask only works in Canvas.
        const layers = new Map<Element, GameObjects.Container>();
        const layerFor = (node: HTMLElement) => {
            const scroll = node.closest('.online-panel');
            if (!scroll) return null;
            let layer = layers.get(scroll);
            if (!layer) {
                layer = this.keep(this.add.container(0, 0));
                const rect = scroll.getBoundingClientRect();
                const shape = this.keep(this.make.graphics({}, false));
                shape
                    .fillStyle(0xffffff)
                    .fillRect(rect.left - root.left, rect.top - root.top, rect.width, rect.height);
                if (this.renderer.type === CANVAS) {
                    const mask = shape.createGeometryMask();
                    layer.setMask(mask);
                    layer.once('destroy', () => mask.destroy());
                } else {
                    layer.enableFilters();
                    layer.filters!.external.addMask(shape);
                }
                layers.set(scroll, layer);
            }
            return layer;
        };
        for (const node of this.root.querySelectorAll<HTMLElement>(
            '[data-paint], [data-surface], [data-avatar], [data-resource], [data-die]',
        )) {
            const rect = node.getBoundingClientRect();
            if (!rect.width || !rect.height) continue;
            const box = {
                x: rect.left - root.left,
                y: rect.top - root.top,
                width: rect.width,
                height: rect.height,
            };
            const layer = layerFor(node);
            const attach = <T extends GameObjects.GameObject>(object: T) => {
                if (layer) layer.add(object);
                return object;
            };
            const graphics = attach(this.keep(this.add.graphics()));
            const isButton = node instanceof HTMLButtonElement;
            const isInput = node instanceof HTMLInputElement;
            if (node.dataset.surface || isButton || isInput) {
                const material =
                    node.dataset.surface ??
                    (isButton ? (node.dataset.tone ?? 'turquoise') : 'inset');
                drawSurface(graphics, box, material as Material, {
                    disabled: isButton && node.disabled,
                    pressed: this.pressed === node,
                    radius: 14,
                    quiet: !isButton,
                });
            }
            if (node.dataset.avatar)
                drawPlayerAvatar(
                    graphics,
                    box,
                    node.dataset.avatar === 'atlas' ? 'atlas' : 'human',
                    parseInt(node.dataset.owner ?? 'ffcf75', 16),
                );

            if (node.dataset.die) drawDie(graphics, box, Number(node.dataset.die));
            if (!node.hasAttribute('data-paint') || (isInput && node === document.activeElement))
                continue;
            const style = getComputedStyle(node);
            const dark =
                node.closest('[data-surface="honey"]') !== null || node.dataset.tone === 'honey';
            attach(
                this.text(
                    isInput ? node.value : (node.textContent ?? ''),
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                    box.width - 8,
                    parseFloat(style.fontSize) || 14,
                    isButton && node.disabled ? '#a5afbd' : dark ? '#3c2b24' : '#fff4dc',
                ),
            );
            if (node === document.activeElement)
                graphics
                    .lineStyle(2, 0xffcf75)
                    .strokeRoundedRect(box.x - 2, box.y - 2, box.width + 4, box.height + 4, 14);
        }
    }
}
