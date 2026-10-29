import { CANVAS, Scene, type GameObjects } from 'phaser';
import { ProceduralOcean } from '../game/rendering/ProceduralOcean';
import { configureDisplayCamera, textDensity } from '../game/rendering/display';
import { createSharpText } from '../game/rendering/sharpText';
import { boardToScreen } from '../game/ui/layout';
import { matchGeometry } from '../game/ui/matchGeometry';
import { drawSurface, drawDie, type Material } from '../game/ui/graphicsTheme';
import {
    ensureTerrainTextures,
    terrainTextureKey,
    terrainVariant,
} from '../game/rendering/terrainTextures';
import { TERRAIN_TEXTURE_RADIUS } from '../game/rendering/terrainArt';
import { createBuildingPiece, createRoadPiece } from '../game/rendering/pieces';
import { createPortMarker, getPortLayout } from '../game/rendering/ports';
import type { OnlineClient } from './client';
import { drawPlayerAvatar } from '../game/ui/playerAvatarArt';
import { ensureResourceTextures, NUMBER_TOKEN_ART } from '../game/rendering/boardEmblems';
import { drawVectorArt } from '../game/rendering/vectorArt';
import { createAhriman } from '../game/rendering/ahriman';
import { createBoardCoast } from '../game/rendering/boardCoast';
import { assetUrl, TEXTURE_FILES } from '../game/assets';
import { actionGroup } from './markup';
import type { Drafts } from './markup';
export class OnlineScene extends Scene {
    private objects: GameObjects.GameObject[] = [];
    private ocean: ProceduralOcean | null = null;
    private pressed: Element | null = null;
    private dirty = true;
    private targets: { x: number; y: number; index: number }[] = [];
    private disconnect: () => void = () => {};
    private observer: ResizeObserver | null = null;
    constructor(
        private readonly root: HTMLElement,
        private readonly client: OnlineClient,
        private readonly draft: Drafts,
        private readonly select: (index: number) => void,
    ) {
        super('OnlineScene');
    }
    preload() {
        this.load.image('online-palace', assetUrl(TEXTURE_FILES.menuBackground));
    }
    create() {
        this.ocean = new ProceduralOcean(this);
        ensureResourceTextures(this);
        void document.fonts.ready.then(() => this.invalidate());
        ensureTerrainTextures(this);
        this.disconnect = this.client.subscribe(() => this.invalidate());
        this.observer = new ResizeObserver(() => this.invalidate());
        this.observer.observe(this.root);
        this.root.addEventListener('scroll', this.onScroll, true);
        this.root.addEventListener('input', this.onScroll);
        this.root.addEventListener('focusin', this.onScroll);
        this.root.addEventListener('focusout', this.onScroll);
        this.scale.on('resize', this.onScroll);
        this.input.on('pointerup', (pointer: { x: number; y: number }) => {
            if (this.client.busy || this.client.pending) return;
            const canvas = this.game.canvas;
            const bounds = canvas.getBoundingClientRect();
            pointer = {
                x: (pointer.x * bounds.width) / canvas.width,
                y: (pointer.y * bounds.height) / canvas.height,
            };
            const nearest = [...this.targets].sort(
                (a, b) =>
                    Math.hypot(a.x - pointer.x, a.y - pointer.y) -
                    Math.hypot(b.x - pointer.x, b.y - pointer.y),
            )[0];
            if (nearest && Math.hypot(nearest.x - pointer.x, nearest.y - pointer.y) < 24)
                this.select(nearest.index);
        });
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
            this.ocean?.destroy();
            this.ocean = null;
            this.disconnect();
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
    update(_time: number, delta: number) {
        const active =
            !!this.client.snapshot?.game &&
            !document.hidden &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.ocean?.setActive(!!this.client.snapshot?.game);
        this.ocean?.update(delta, active);
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
        this.targets = [];
        const root = this.root.getBoundingClientRect();
        const width = root.width,
            height = root.height;
        if (!width || !height) return;
        configureDisplayCamera(this);
        this.ocean?.resize(width, height);
        this.cameras.main.setBackgroundColor('#111b3b');
        const game = this.client.snapshot?.game;
        if (!game && this.textures.exists('online-palace')) {
            const image = this.keep(this.add.image(width / 2, height / 2, 'online-palace'));
            image.setScale(Math.max(width / image.width, height / image.height));
            this.keep(this.add.graphics()).fillStyle(0x111b3b, 0.7).fillRect(0, 0, width, height);
        }
        const boardElement = this.root.querySelector<HTMLElement>('.online-board');
        if (game && boardElement && !boardElement.hidden) {
            const bounds = boardElement.getBoundingClientRect();
            const geometry = matchGeometry(
                bounds.width,
                bounds.height,
                true,
                this.root.classList.contains('is-desktop'),
            );
            const { board: layout, detailScale } = geometry;
            layout.centerX += bounds.left - root.left;
            layout.centerY += bounds.top - root.top;
            const point = (value: { x: number; y: number }) => boardToScreen(value, layout);
            this.keep(createBoardCoast(this, game.board, layout));
            for (const tile of game.board.tiles) {
                const p = point(tile);
                this.keep(
                    this.add
                        .image(
                            p.x,
                            p.y,
                            terrainTextureKey(tile.terrain, terrainVariant(tile.q, tile.r)),
                        )
                        .setScale(layout.hexRadius / TERRAIN_TEXTURE_RADIUS),
                );
                if (tile.number) {
                    const g = this.keep(this.add.graphics());
                    drawVectorArt(
                        g,
                        NUMBER_TOKEN_ART,
                        p.x,
                        p.y + layout.hexRadius * 0.4,
                        12 * detailScale,
                    );
                    this.text(
                        String(tile.number),
                        p.x,
                        p.y + layout.hexRadius * 0.4,
                        30,
                        12 * detailScale,
                        tile.number === 6 || tile.number === 8 ? '#a53636' : '#3a342b',
                    );
                }
                if (tile.robber)
                    this.keep(
                        createAhriman(this, p.x, p.y - layout.hexRadius * 0.3, 34 * detailScale),
                    );
            }
            for (const port of game.board.ports) {
                const position = getPortLayout(game.board, port, layout);
                const edge = game.board.edges[port.edgeId];
                const owner = edge?.vertexIds
                    .map((id) => game.board.vertices[id]?.building?.ownerId)
                    .find(Boolean);
                this.keep(
                    createPortMarker(
                        this,
                        port,
                        position,
                        port.resource ? 2 : 3,
                        game.players.find((p) => p.id === owner)?.color,
                    ),
                );
            }
            for (const edge of Object.values(game.board.edges))
                if (edge.road) {
                    const a = point(game.board.vertices[edge.vertexIds[0]]),
                        b = point(game.board.vertices[edge.vertexIds[1]]);
                    const view = createRoadPiece(this, {
                        x: (a.x + b.x) / 2,
                        y: (a.y + b.y) / 2,
                        length: Math.min(28 * detailScale, Math.hypot(a.x - b.x, a.y - b.y) * 0.74),
                        thickness: 7 * detailScale,
                        angle: Math.atan2(b.y - a.y, b.x - a.x),
                        color:
                            game.players.find((p) => p.id === edge.road?.ownerId)?.color ??
                            0xffffff,
                    });
                    this.keep(view.container);
                }
            for (const vertex of Object.values(game.board.vertices))
                if (vertex.building) {
                    const p = point(vertex);
                    this.keep(
                        createBuildingPiece(this, {
                            x: p.x,
                            y: p.y,
                            kind: vertex.building.type,
                            size: (vertex.building.type === 'city' ? 25 : 21) * detailScale,
                            color:
                                game.players.find(
                                    (player) => player.id === vertex.building?.ownerId,
                                )?.color ?? 0xffffff,
                        }).container,
                    );
                }
            game.availableIntents.forEach((intent, index) => {
                if (!('targetId' in intent)) return;
                if (!this.draft.tool || actionGroup(intent) !== this.draft.tool) return;
                let p: { x: number; y: number } | undefined;
                const vertex = game.board.vertices[intent.targetId],
                    edge = game.board.edges[intent.targetId],
                    tile = game.board.tiles.find((t) => t.id === intent.targetId);
                if (vertex) p = point(vertex);
                else if (edge) {
                    const a = point(game.board.vertices[edge.vertexIds[0]]),
                        b = point(game.board.vertices[edge.vertexIds[1]]);
                    p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                } else if (tile) p = point(tile);
                if (p) {
                    this.targets.push({ ...p, index });
                    const mark = this.keep(this.add.graphics());
                    mark.lineStyle(index === this.draft.target ? 3 : 1, 0xffcf75, 1).strokeCircle(
                        p.x,
                        p.y,
                        index === this.draft.target ? 10 : 5,
                    );
                }
            });
        }
        // Every scroll region owns one clipped paint container. Phaser 4 WebGL
        // requires external mask filters; GeometryMask only works in Canvas.
        const layers = new Map<Element, GameObjects.Container>();
        const layerFor = (node: HTMLElement) => {
            const scroll =
                node.closest('.online-details') ?? (!game ? node.closest('.online-panel') : null);
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
            if (node.dataset.resource)
                attach(
                    this.keep(
                        this.add
                            .image(
                                box.x + box.width / 2,
                                box.y + box.height / 2,
                                'art-resources',
                                node.dataset.resource,
                            )
                            .setDisplaySize(box.width, box.height),
                    ),
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
