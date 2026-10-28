import { CANVAS, Scene, type GameObjects, type Display } from 'phaser';
import { fitBoard, boardToScreen } from '../game/ui/layout';
import { drawSurface } from '../game/ui/graphicsTheme';
import {
    ensureTerrainTextures,
    terrainTextureKey,
    terrainVariant,
} from '../game/rendering/terrainTextures';
import { TERRAIN_TEXTURE_RADIUS } from '../game/rendering/terrainArt';
import { createBuildingPiece, createRoadPiece } from '../game/rendering/pieces';
import { createPortMarker, getPortLayout } from '../game/rendering/ports';
import type { OnlineClient } from './client';
import type { Drafts } from './markup';
export class OnlineScene extends Scene {
    private objects: GameObjects.GameObject[] = [];
    private masks: Display.Masks.GeometryMask[] = [];
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
    create() {
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
            const nearest = [...this.targets].sort(
                (a, b) =>
                    Math.hypot(a.x - pointer.x, a.y - pointer.y) -
                    Math.hypot(b.x - pointer.x, b.y - pointer.y),
            )[0];
            if (nearest && Math.hypot(nearest.x - pointer.x, nearest.y - pointer.y) < 24)
                this.select(nearest.index);
        });
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
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
            this.add
                .text(x, y, value, {
                    fontFamily: 'Vazirmatn',
                    fontSize: `${size}px`,
                    color,
                    rtl: true,
                    align: 'center',
                    wordWrap: { width: Math.max(1, width) },
                    padding: { x: 2, y: 2 },
                })
                .setOrigin(0.5),
        );
    }
    private paint() {
        this.objects.forEach((object) => object.destroy());
        this.objects = [];
        this.masks.forEach((mask) => mask.destroy());
        this.masks = [];
        this.targets = [];
        const root = this.root.getBoundingClientRect();
        const width = root.width,
            height = root.height;
        if (!width || !height) return;
        this.cameras.main.setBackgroundColor('#111b3b');
        const game = this.client.snapshot?.game;
        const boardElement = this.root.querySelector<HTMLElement>('.online-board');
        if (game && boardElement && !boardElement.hidden) {
            const bounds = boardElement.getBoundingClientRect();
            const layout = fitBoard(bounds.width, bounds.height);
            layout.centerX += bounds.left - root.left;
            layout.centerY += bounds.top - root.top;
            const point = (value: { x: number; y: number }) => boardToScreen(value, layout);
            const sea = this.keep(this.add.graphics());
            sea.fillStyle(0x164858).fillRect(
                bounds.left - root.left,
                bounds.top - root.top,
                bounds.width,
                bounds.height,
            );
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
                if (tile.number)
                    this.text(
                        String(tile.number),
                        p.x,
                        p.y + layout.hexRadius * 0.4,
                        30,
                        12,
                        tile.number === 6 || tile.number === 8 ? '#ffb9a3' : '#ffffff',
                    );
                if (tile.robber) this.text('اهریمن', p.x, p.y - 4, 48, 10, '#ffcf75');
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
                        length: Math.min(28, Math.hypot(a.x - b.x, a.y - b.y) * 0.74),
                        thickness: 7,
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
                            size: vertex.building.type === 'city' ? 25 : 21,
                            color:
                                game.players.find(
                                    (player) => player.id === vertex.building?.ownerId,
                                )?.color ?? 0xffffff,
                        }).container,
                    );
                }
            game.availableIntents.forEach((intent, index) => {
                if (!('targetId' in intent)) return;
                if (
                    this.draft.tool &&
                    (intent.kind === 'setup' || intent.kind === 'build'
                        ? `${intent.kind}-${intent.type}`
                        : intent.kind) !== this.draft.tool
                )
                    return;
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
        const panel = this.root
            .querySelector<HTMLElement>('.online-panel')
            ?.getBoundingClientRect();
        const clippedLayers = new Map<string, GameObjects.Container>();
        for (const node of this.root.querySelectorAll<HTMLElement>('[data-paint]')) {
            const rect = node.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) continue;
            const inside = node.closest('.online-panel');
            const choices = node.closest('.online-choices')?.getBoundingClientRect();
            const clip =
                inside && panel
                    ? {
                          left: Math.max(panel.left, choices?.left ?? panel.left),
                          top: Math.max(panel.top, choices?.top ?? panel.top),
                          right: Math.min(panel.right, choices?.right ?? panel.right),
                          bottom: Math.min(panel.bottom, choices?.bottom ?? panel.bottom),
                      }
                    : null;
            if (
                inside &&
                panel &&
                (rect.bottom <= (clip?.top ?? panel.top) ||
                    rect.top >= (clip?.bottom ?? panel.bottom))
            )
                continue;
            const x = rect.left - root.left,
                y = rect.top - root.top;
            const graphics = this.keep(this.add.graphics());
            const isButton = node instanceof HTMLButtonElement,
                isInput = node instanceof HTMLInputElement;
            if (isButton || isInput)
                drawSurface(
                    graphics,
                    { x, y, width: rect.width, height: rect.height },
                    isButton ? 'turquoise' : 'inset',
                    {
                        disabled: isButton && node.disabled,
                        pressed: node === document.activeElement,
                        radius: 12,
                    },
                );
            if (isInput && node === document.activeElement) continue;
            const value = isInput ? node.value : (node.textContent ?? '');
            const size = parseFloat(getComputedStyle(node).fontSize) || 15;
            const text = this.text(
                value,
                x + rect.width / 2,
                y + rect.height / 2,
                rect.width - 12,
                size,
                isButton && node.disabled ? '#a5afbd' : '#fff4dc',
            );
            if (inside && clip) {
                const key = `${clip.left},${clip.top},${clip.right},${clip.bottom}`;
                let content = clippedLayers.get(key);
                if (!content) {
                    const maskGraphics = this.make
                        .graphics({}, false)
                        .fillStyle(0xffffff)
                        .fillRect(
                            clip.left - root.left,
                            clip.top - root.top,
                            clip.right - clip.left,
                            clip.bottom - clip.top,
                        );
                    this.objects.push(maskGraphics);
                    content = this.keep(this.add.container());
                    if (this.renderer.type === CANVAS) {
                        const mask = maskGraphics.createGeometryMask();
                        content.setMask(mask);
                        this.masks.push(mask);
                    } else {
                        content.enableFilters();
                        content.filters?.external.addMask(maskGraphics);
                    }
                    clippedLayers.set(key, content);
                }
                content.add([graphics, text]);
            }
        }
    }
}
