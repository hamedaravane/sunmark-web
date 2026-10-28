import { CANVAS, Scene, type GameObjects } from 'phaser';
import { ART, assetUrl } from '../assets';
import { RESOURCE_TYPES } from '../core/types';
import type { GameSession } from './session';
import { MOTION, type Motion } from './motion';
import { UI_FONT_FAMILY } from './typography';
import { drawRosette, drawSurface, UI_INK, type UiBox } from './graphicsTheme';
import { drawComponent } from './graphicsComponents';
import { measureTextRuns, SemanticTextMetrics } from './semanticText';
import { fitText, textRunPosition } from './textGeometry';
import { GraphicsFeedback } from './GraphicsFeedback';
import { drawNarratorLight, drawNarratorPanel } from './narratorArt';
import { LESSONS } from '../tutorial/lessons.fa';
import { configureDisplayCamera } from '../rendering/display';
import { createSharpText, rasterTextStyle } from '../rendering/sharpText';

interface PaintLayer {
    container: GameObjects.Container;
    graphics: GameObjects.Graphics;
    objects: Map<string, GameObjects.Text | GameObjects.Image>;
    used: Set<string>;
}

/**
 * Draws every visible UI surface with Graphics and every label with Phaser Text.
 * The transparent DOM is a responsive layout/semantic input adapter, never a
 * screenshot or texture. It preserves browser Persian shaping, line breaks,
 * native modal focus, scrolling, and exact CSS-pixel hit areas.
 */
export class InterfaceScene extends Scene {
    private hud: PaintLayer;
    private panel: PaintLayer;
    private controlsGroup: GameObjects.Container;
    private controlsMaskShape: GameObjects.Graphics;
    private controlsMask: Phaser.Display.Masks.GeometryMask | undefined;
    private controlsFilter: Phaser.Filters.Mask | undefined;
    private roll: PaintLayer;
    private hints: PaintLayer;
    private dock: PaintLayer;
    private theatre: PaintLayer;
    private modal: PaintLayer;
    private content: PaintLayer;
    private maskShape: GameObjects.Graphics;
    private modalMask: Phaser.Display.Masks.GeometryMask | undefined;
    private dirty = true;
    private observer: MutationObserver;
    private resizeObserver: ResizeObserver;
    private nodeIds = new WeakMap<Node, number>();
    private fontMetrics = new SemanticTextMetrics();
    private nextNode = 0;
    private origin = { x: 0, y: 0 };
    private displayWidth = 390;
    private displayHeight = 844;
    private density = 1;
    private pressed: Element | null = null;
    private cleanup: Array<() => void> = [];
    private sheetOpenedAt = -Infinity;
    private hadSheet = false;
    private hadActionPhase = false;
    private dockOpenedAt = -Infinity;
    private rollKey = '';
    private hintKey = '';
    private rollAppearedAt = -Infinity;
    private hintAppearedAt = -Infinity;
    private narratorLoading = false;
    private unavailablePortraits = new Set<string>();
    private portraitExpression = '';
    private portraitChangedAt = -Infinity;
    private portraitRestY = 0;
    private portraitReady = false;
    private hadIntroduction = false;
    private matchEnteredAt = -Infinity;
    feedback: GraphicsFeedback | undefined;

    constructor(
        private parent: HTMLElement,
        private session: GameSession,
        private motion: Motion,
    ) {
        super('InterfaceScene');
    }
    preload(): void {
        for (const name of ['victory', 'corner', 'divider', 'rosette', 'glint'] as const)
            this.load.image(`ui-${name}`, assetUrl(ART[name].file));
    }
    create(): void {
        for (const name of ['victory', 'corner', 'divider', 'rosette', 'glint'] as const) {
            const [x, y, w, h] = ART[name].frame;
            this.textures.get(`ui-${name}`).add('crop', 0, x, y, w, h);
        }
        this.hud = this.layer();
        this.panel = this.layer();
        this.dock = this.layer();
        this.roll = this.layer();
        this.hints = this.layer();
        this.controlsGroup = this.add.container(0, 0, [
            this.panel.container,
            this.dock.container,
            this.roll.container,
            this.hints.container,
        ]);
        this.controlsMaskShape = this.make.graphics({}, false);
        if (this.renderer.type === CANVAS)
            this.controlsMask = this.controlsMaskShape.createGeometryMask();
        else {
            this.controlsGroup.enableFilters();
            this.controlsFilter = this.controlsGroup.filters!.external.addMask(
                this.controlsMaskShape,
            );
            this.controlsFilter.active = false;
        }
        this.theatre = this.layer();
        this.modal = this.layer();
        this.content = this.layer();
        this.maskShape = this.make.graphics({}, false);
        if (this.renderer.type === CANVAS) {
            this.modalMask = this.maskShape.createGeometryMask();
            this.content.container.setMask(this.modalMask);
        } else {
            // Phaser 4 geometry masks are Canvas-only. External filters share
            // the UI camera's coordinates with the measured scroll rectangle.
            this.content.container.enableFilters();
            this.content.container.filters!.external.addMask(this.maskShape);
        }
        this.feedback = new GraphicsFeedback(this, this.parent, this.motion, this.invalidate);
        this.parent.classList.add('graphics-ui');
        this.observer = new MutationObserver(this.invalidate);
        // Exclude the stage: Phaser attaches its hidden RTL text canvases there.
        this.observer.observe(this.parent, { attributes: true });
        for (const root of this.parent.querySelectorAll('.main-menu, .match-screen, dialog'))
            this.observer.observe(root, {
                subtree: true,
                childList: true,
                characterData: true,
                attributes: true,
            });
        this.resizeObserver = new ResizeObserver(this.invalidate);
        this.resizeObserver.observe(this.parent);
        for (const el of this.parent.querySelectorAll('.main-menu, .match-screen, dialog'))
            this.resizeObserver.observe(el);
        const listen = (name: string, handler: EventListener) => {
            this.parent.addEventListener(name, handler, true);
            this.cleanup.push(() => this.parent.removeEventListener(name, handler, true));
        };
        listen('scroll', this.invalidate);
        listen('focusin', this.invalidate);
        listen('focusout', this.invalidate);
        document.addEventListener('selectionchange', this.invalidate);
        this.cleanup.push(() => document.removeEventListener('selectionchange', this.invalidate));
        listen('toggle', this.invalidate);
        listen('keydown', (event) => {
            const key = (event as KeyboardEvent).key;
            if (key === ' ' || key === 'Enter') {
                this.pressed = (event.target as Element).closest('button:not(:disabled), summary');
                this.invalidate();
            }
        });
        listen('keyup', () => {
            this.pressed = null;
            this.invalidate();
        });
        listen('pointerdown', (event) => {
            this.pressed = (event.target as Element).closest('button:not(:disabled), summary');
            this.invalidate();
        });
        const release = () => {
            this.pressed = null;
            this.invalidate();
        };
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('blur', release);
        this.cleanup.push(() => {
            window.removeEventListener('pointerup', release);
            window.removeEventListener('pointercancel', release);
            window.removeEventListener('blur', release);
        });
        this.cleanup.push(
            this.session.subscribe(this.invalidate),
            this.motion.subscribe(() => {
                this.feedback?.clear();
                if (this.motion.reduced) this.sheetOpenedAt = -Infinity;
                if (this.motion.reduced || !this.motion.visible) {
                    this.portraitChangedAt = -Infinity;
                    this.rollAppearedAt = this.hintAppearedAt = -Infinity;
                }
                this.invalidate();
            }),
        );
        this.scale.on('resize', this.invalidate);
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            this.feedback?.clear();
            this.feedback = undefined;
            this.observer.disconnect();
            this.resizeObserver.disconnect();
            this.cleanup.forEach((fn) => fn());
            this.scale.off('resize', this.invalidate);
            this.modalMask?.destroy();
            this.maskShape.destroy();
            this.controlsMask?.destroy();
            this.controlsMaskShape.destroy();
            this.parent.classList.remove('graphics-ui');
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
        this.invalidate();
    }
    invalidate = (): void => {
        this.dirty = true;
    };

    update(time: number): void {
        if (!this.hud) return;
        // Sheet geometry stays aligned with its semantic hit regions throughout entrance.
        if (this.dirty) {
            this.dirty = false;
            this.paint(time);
        }
        if (this.hadSheet && time - this.sheetOpenedAt < this.motion.duration(MOTION.sheet)) {
            const progress = Math.min(
                1,
                (time - this.sheetOpenedAt) / this.motion.duration(MOTION.sheet),
            );
            const alpha = 0.45 + 0.55 * (1 - Math.pow(1 - progress, 3));
            this.modal.container.setAlpha(alpha);
            this.content.container.setAlpha(alpha);
        }
        this.animatePortrait(time);
        const entryDuration = this.motion.duration(MOTION.fast);
        this.hud.container.setAlpha(
            entryDuration
                ? 0.5 + 0.5 * Math.min(1, (time - this.matchEnteredAt) / entryDuration)
                : 1,
        );
        this.panel.container.setAlpha(this.hud.container.alpha);
        const dockDuration = this.motion.duration(150);
        this.dock.container.setAlpha(
            dockDuration
                ? Math.min(1, 0.3 + (0.7 * Math.max(0, time - this.dockOpenedAt)) / dockDuration)
                : 1,
        );
        for (const [layer, since] of [
            [this.roll, this.rollAppearedAt],
            [this.hints, this.hintAppearedAt],
        ] as const) {
            const duration = this.motion.duration(160);
            layer.container.setAlpha(
                duration ? Math.min(1, 0.4 + (0.6 * Math.max(0, time - since)) / duration) : 1,
            );
        }
    }
    private animatePortrait(time: number): void {
        if (!this.theatre) return;
        const progress = Math.max(
            0,
            Math.min(1, (time - this.portraitChangedAt) / Math.max(1, this.motion.duration(280))),
        );
        const eased = 1 - Math.pow(1 - progress, 3);
        for (const image of this.theatre.objects.values())
            image.setAlpha(eased).setY(this.portraitRestY + (1 - eased) * 12);
    }
    private layer(): PaintLayer {
        const container = this.add.container();
        const graphics = this.add.graphics();
        container.add(graphics);
        return { container, graphics, objects: new Map(), used: new Set() };
    }
    private begin(layer: PaintLayer): void {
        layer.graphics.clear();
        layer.used.clear();
    }
    private end(layer: PaintLayer): void {
        // Keep stable Text/Image instances; discard nodes removed by a HUD/sheet update.
        for (const [id, object] of layer.objects)
            if (!layer.used.has(id)) {
                object.destroy();
                layer.objects.delete(id);
            }
    }
    private key(node: Node, suffix = ''): string {
        if (!this.nodeIds.has(node)) this.nodeIds.set(node, ++this.nextNode);
        return `${this.nodeIds.get(node)}:${suffix}`;
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
    private paint(time: number): void {
        const display = configureDisplayCamera(this);
        this.displayWidth = display.width;
        this.displayHeight = display.height;
        this.density = Math.max(
            display.pixelWidth / display.width,
            display.pixelHeight / display.height,
        );
        this.loadNarrator();
        const origin = this.parent.getBoundingClientRect();
        this.origin = { x: origin.left, y: origin.top };
        for (const layer of [
            this.hud,
            this.panel,
            this.roll,
            this.hints,
            this.dock,
            this.theatre,
            this.modal,
            this.content,
        ])
            this.begin(layer);
        const menu = this.parent.querySelector<HTMLElement>('.main-menu')!;
        const match = this.parent.querySelector<HTMLElement>('.match-screen')!;
        this.paintTree(this.session.state ? match : menu, this.hud);
        const controls = match.querySelector<HTMLElement>('.match-controls')!;
        this.panel.container.setVisible(!!this.session.state);
        const clipsControls =
            !!this.session.state &&
            match.classList.contains('is-wide') &&
            controls.scrollHeight > controls.clientHeight + 1;
        const controlsBox = this.box(controls);
        if (clipsControls)
            this.controlsMaskShape
                .clear()
                .fillStyle(0xffffff)
                .fillRect(controlsBox.x, controlsBox.y, controlsBox.width, controlsBox.height);
        if (this.controlsFilter) this.controlsFilter.active = clipsControls;
        if (this.controlsMask) {
            if (clipsControls) this.controlsGroup.setMask(this.controlsMask);
            else this.controlsGroup.clearMask();
        }
        if (this.session.state) this.paintTree(controls, this.panel);
        const rollRoot = match.querySelector<HTMLElement>('.board-roll')!;
        const hintRoot = match.querySelector<HTMLElement>('.context-line')!;
        const rollKey = this.session.state
            ? `${this.session.state.turn}:${rollRoot.textContent}`
            : '';
        const hintKey = this.session.state ? (hintRoot.textContent ?? '') : '';
        if (rollKey !== this.rollKey) this.rollAppearedAt = time;
        if (hintKey !== this.hintKey) this.hintAppearedAt = time;
        this.rollKey = rollKey;
        this.hintKey = hintKey;
        this.roll.container.setVisible(!!this.session.state);
        this.hints.container.setVisible(!!this.session.state);
        if (this.session.state) {
            this.paintTree(rollRoot, this.roll);
            this.paintTree(hintRoot, this.hints);
        }
        this.dock.container.setVisible(!!this.session.state);
        if (this.session.state)
            this.paintTree(match.querySelector<HTMLElement>('.action-dock')!, this.dock);
        if (this.session.state && match.classList.contains('is-wide'))
            this.scrollIndicator(
                match.querySelector<HTMLElement>('.match-controls')!,
                this.hud.graphics,
            );
        const actionPhase = this.session.state?.phase === 'actions';
        if (actionPhase && !this.hadActionPhase)
            this.dockOpenedAt = this.motion.reduced ? -Infinity : time;
        this.hadActionPhase = actionPhase;
        const dialog = this.parent.querySelector<HTMLDialogElement>('dialog[open]');
        const introduction = dialog?.dataset.contentKey === 'match-introduction';
        if (this.hadIntroduction && !introduction)
            this.matchEnteredAt = this.motion.reduced || !this.motion.visible ? -Infinity : time;
        this.hadIntroduction = introduction;
        this.theatre.container.setVisible(!!dialog);
        this.modal.container.setVisible(!!dialog);
        this.content.container.setVisible(!!dialog);
        if (dialog) {
            if (!this.hadSheet) this.sheetOpenedAt = this.motion.reduced ? -Infinity : time;
            const box = this.box(dialog);
            const stage = dialog.querySelector<HTMLElement>('.narrator-stage');
            this.theatre.graphics
                .fillStyle(stage ? 0x101817 : 0x040e20, stage ? 0.65 : 0.78)
                .fillRect(0, 0, display.width, display.height);
            if (stage) {
                drawNarratorLight(this.theatre.graphics, this.box(stage));
                this.paintTree(stage, this.theatre);
                const hero = stage.querySelector<HTMLElement>('.narrator-hero')!;
                const heroBox = this.box(hero);
                this.portraitRestY = heroBox.y + heroBox.height / 2;
                const expression = hero.dataset.art!;
                const ready = this.textures.exists(`ui-${expression}`);
                if (expression !== this.portraitExpression || (ready && !this.portraitReady)) {
                    this.portraitExpression = expression;
                    this.portraitChangedAt =
                        this.motion.reduced || !this.motion.visible ? -Infinity : time;
                }
                this.portraitReady = ready;
                drawNarratorPanel(
                    this.modal.graphics,
                    this.box(dialog.querySelector('.narrator-panel')!),
                );
            } else {
                this.portraitExpression = '';
                drawSurface(this.modal.graphics, box, 'inset', {
                    radius: 24,
                    accent: UI_INK.gold,
                });
            }
            const header = dialog.querySelector<HTMLElement>('.sheet-header')!;
            this.paintTree(header, this.modal);
            const context = dialog.querySelector<HTMLElement>('.sheet-context');
            if (context) this.paintTree(context, this.modal);
            const body = dialog.querySelector<HTMLElement>('.sheet-body')!;
            const clip = this.box(body);
            this.maskShape
                .clear()
                .fillStyle(0xffffff)
                .fillRect(clip.x, clip.y, clip.width, clip.height);
            this.paintTree(body, this.content, clip);
            const footer = dialog.querySelector<HTMLElement>('.narrator-footer, .sheet-footer');
            if (footer) this.paintTree(footer, this.modal);
            this.scrollIndicator(body, this.modal.graphics);
            this.modal.container.setAlpha(1);
            this.content.container.setAlpha(1);
        } else this.portraitExpression = '';
        this.hadSheet = !!dialog;
        for (const layer of [
            this.hud,
            this.panel,
            this.roll,
            this.hints,
            this.dock,
            this.theatre,
            this.modal,
            this.content,
        ])
            this.end(layer);
    }
    private loadNarrator(): void {
        if (
            this.narratorLoading ||
            !(
                this.session.tutorial.enabled ||
                this.session.sheet?.kind === 'journal' ||
                this.session.sheet?.kind === 'tutorial'
            )
        )
            return;
        // Load visible art first, then warm only the next queued expression while the player reads.
        const names = [...this.parent.querySelectorAll<HTMLElement>('[data-art^="anahita-"]')]
            .map((node) => node.dataset.art as keyof typeof ART)
            .filter(
                (name, index, all) =>
                    all.indexOf(name) === index &&
                    !this.textures.exists(`ui-${name}`) &&
                    !this.unavailablePortraits.has(name),
            );
        const next =
            this.session.sheet?.kind === 'introduction'
                ? this.session.tutorial.current
                : this.session.sheet?.kind === 'tutorial'
                  ? this.session.tutorial.next
                  : null;
        if (!names.length && next) {
            const name = `anahita-${LESSONS[next].expression}` as const;
            if (!this.textures.exists(`ui-${name}`) && !this.unavailablePortraits.has(name))
                names.push(name);
        }
        if (!names.length) return;
        this.narratorLoading = true;
        for (const name of names) this.load.image(`ui-${name}`, assetUrl(ART[name].file));
        this.load.once('complete', () => {
            for (const name of names) {
                const texture = this.textures.get(`ui-${name}`);
                if (!this.textures.exists(`ui-${name}`)) {
                    this.unavailablePortraits.add(name);
                    continue;
                }
                const [x, y, width, height] = ART[name].frame;
                texture.add('crop', 0, x, y, width, height);
            }
            this.narratorLoading = false;
            this.invalidate();
        });
        this.load.start();
    }
    private paintTree(root: HTMLElement, layer: PaintLayer, clip?: UiBox): void {
        const visit = (element: HTMLElement) => {
            if (
                element.hidden ||
                element.classList.contains('sr-only') ||
                element.classList.contains('board-canvas') ||
                (element.classList.contains('action-dock') && layer !== this.dock) ||
                (element.classList.contains('board-roll') && layer !== this.roll) ||
                (element.classList.contains('context-line') && layer !== this.hints) ||
                this.feedback?.hides(element)
            )
                return;
            const style = getComputedStyle(element);
            if (style.display === 'none') return;
            const box = this.box(element);
            if (box.width <= 0 || box.height <= 0) return;
            if (clip && (box.y + box.height < clip.y || box.y > clip.y + clip.height)) return;
            const controlsRoot = element.classList.contains('match-controls');
            if (!(controlsRoot && layer === this.panel)) this.paintElement(element, box, layer);
            // The panel's scroll mask must not clip the independent player header.
            if (controlsRoot && layer === this.hud) return;
            // Native closed details retain descendant DOM nodes but hide their contents.
            for (const node of element.childNodes) {
                if (node instanceof HTMLElement) {
                    if (
                        element instanceof HTMLDetailsElement &&
                        !element.open &&
                        node.tagName !== 'SUMMARY'
                    )
                        continue;
                    visit(node);
                } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
                    this.paintText(node, element, layer);
            }
        };
        visit(root);
    }
    private paintElement(el: HTMLElement, box: UiBox, layer: PaintLayer): void {
        drawComponent(layer.graphics, el, box, this.pressed);
        const has = (name: string) => el.classList.contains(name);
        if (el.dataset.art) {
            const texture = `ui-${el.dataset.art}`;
            if (el.dataset.art.startsWith('anahita-') && !this.textures.exists(texture))
                drawRosette(
                    layer.graphics,
                    box.x + box.width / 2,
                    box.y + box.height / 2,
                    20,
                    UI_INK.gold,
                );
            else this.paintImage(layer, el, texture, 'crop', box);
        }
        if (has('resource-icon')) {
            const resource = RESOURCE_TYPES.find((r) => has(`resource-icon--${r}`));
            if (resource) this.paintImage(layer, el, 'art-resources', resource, box);
        }
    }
    private paintImage(
        layer: PaintLayer,
        node: HTMLElement,
        texture: string,
        frame: string,
        box: UiBox,
    ): void {
        if (!this.textures.exists(texture) || !this.textures.get(texture).has(frame)) return;
        const id = this.key(node, 'image');
        let image = layer.objects.get(id) as GameObjects.Image | undefined;
        if (!image) {
            image = this.add.image(0, 0, texture, frame);
            layer.container.add(image);
            layer.objects.set(id, image);
        }
        layer.used.add(id);
        const style = getComputedStyle(node);
        const matrix = new DOMMatrixReadOnly(
            style.transform === 'none' ? undefined : style.transform,
        );
        image
            .setPosition(box.x + box.width / 2, box.y + box.height / 2)
            .setDisplaySize(
                parseFloat(style.width) * Math.hypot(matrix.a, matrix.b),
                parseFloat(style.height) * Math.hypot(matrix.c, matrix.d),
            )
            .setRotation(Math.atan2(matrix.b, matrix.a));
        image.setAlpha(node.closest('button:disabled') ? 0.45 : 1);
    }
    private paintText(node: Node, element: HTMLElement, layer: PaintLayer): void {
        const style = getComputedStyle(element);
        const runs = measureTextRuns(node);
        for (const [index, run] of runs.entries()) {
            const id = this.key(node, String(index));
            let text = layer.objects.get(id) as GameObjects.Text | undefined;
            const size = parseFloat(style.fontSize);
            const metrics = this.fontMetrics.get(style);
            if (!text) {
                text = createSharpText(
                    this,
                    0,
                    0,
                    run.value,
                    {
                        fontFamily: UI_FONT_FAMILY,
                        fontSize: size,
                        color: style.color,
                        rtl: style.direction === 'rtl',
                        metrics,
                        padding: { x: 1, y: 3 },
                    },
                    this.density,
                ).setOrigin(0, 0);
                layer.objects.set(id, text);
                layer.container.add(text);
            }
            layer.used.add(id);
            if (text.text !== run.value) text.setText(run.value);
            if (text.style.color !== style.color) text.setColor(style.color);
            if (
                text.style.fontSize !== `${size * this.density}px` ||
                text.scaleX !== 1 / this.density
            ) {
                text.setStyle(
                    rasterTextStyle(
                        { fontSize: size, metrics, padding: { x: 1, y: 3 } },
                        this.density,
                    ),
                );
                text.setPadding({ x: this.density, y: 3 * this.density });
                text.setScale(1 / this.density);
            }
            if (style.textOverflow === 'ellipsis') {
                const width =
                    element.getBoundingClientRect().width +
                    0.5 -
                    parseFloat(style.paddingLeft) -
                    parseFloat(style.paddingRight);
                const fitted = fitText(
                    run.value,
                    width,
                    (value) => text!.context.measureText(value).width / this.density,
                );
                if (text.text !== fitted) text.setText(fitted);
            }
            const { x, y } = textRunPosition(
                run.rect,
                text.displayWidth,
                metrics,
                {
                    left: (text.padding.left ?? 0) / this.density,
                    right: (text.padding.right ?? 0) / this.density,
                    top: (text.padding.top ?? 0) / this.density,
                },
                this.origin,
                style.direction === 'rtl',
                this.density,
            );
            text.setPosition(x, y).setAlpha(1);
            // Honor CSS overflow regions without shrinking Persian labels or text.
            let ancestor: HTMLElement | null = element;
            let left = 0,
                right = this.displayWidth,
                top = 0,
                bottom = this.displayHeight;
            while (ancestor && ancestor !== this.parent) {
                const overflow = getComputedStyle(ancestor);
                const clipsX = ['hidden', 'clip', 'auto', 'scroll'].includes(overflow.overflowX);
                const clipsY = ['hidden', 'clip', 'auto', 'scroll'].includes(overflow.overflowY);
                if (!clipsX && !clipsY) {
                    ancestor = ancestor.parentElement;
                    continue;
                }
                const box = this.box(ancestor);
                if (clipsX) {
                    left = Math.max(left, box.x);
                    right = Math.min(right, box.x + box.width);
                }
                if (clipsY) {
                    top = Math.max(top, box.y);
                    bottom = Math.min(bottom, box.y + box.height);
                }
                ancestor = ancestor.parentElement;
            }
            const cropLeft = Math.max(0, left - x);
            const cropWidth = Math.max(0, Math.min(text.displayWidth, right - x) - cropLeft);
            const cropTop = Math.max(0, top - y);
            const cropHeight = Math.max(0, Math.min(text.displayHeight, bottom - y) - cropTop);
            if (
                cropLeft === 0 &&
                cropWidth >= text.displayWidth &&
                cropTop === 0 &&
                cropHeight >= text.displayHeight
            )
                text.setCrop();
            else
                text.setCrop(
                    cropLeft * this.density,
                    cropTop * this.density,
                    cropWidth * this.density,
                    cropHeight * this.density,
                );
        }
    }
    private scrollIndicator(body: HTMLElement, graphics: GameObjects.Graphics): void {
        if (body.scrollHeight <= body.clientHeight + 1) return;
        const box = this.box(body);
        const height = Math.max(28, (body.clientHeight / body.scrollHeight) * (box.height - 16));
        const y =
            box.y +
            8 +
            (body.scrollTop / (body.scrollHeight - body.clientHeight)) * (box.height - 16 - height);
        graphics
            .fillStyle(0x151b1d, 0.7)
            .fillRoundedRect(box.x + 3, box.y + 8, 3, box.height - 16, 2);
        graphics.fillStyle(UI_INK.gold, 0.8).fillRoundedRect(box.x + 3, y, 3, height, 2);
    }
}
