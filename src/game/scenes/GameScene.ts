import { createAhriman, AHRIMAN_OFFSET_RATIO } from '../rendering/ahriman';
import {
    ensureTerrainTextures,
    terrainTextureKey,
    boardTerrainVariants,
} from '../rendering/terrainTextures';
import { TERRAIN_TEXTURE_RADIUS } from '../rendering/terrainArt';
import { type GameObjects, Scene } from 'phaser';
import type { GameState, HexTile } from '../core/types';
import { BoardInput } from '../rendering/boardInput';
import { BoardEffects } from '../rendering/boardEffects';
import { createBoardCoast } from '../rendering/boardCoast';
import { boardToClient, boardToScreen, fitBoard, type BoardLayout } from '../ui/layout';
import { matchGeometry } from '../ui/matchGeometry';
import { number } from '../ui/components';
import type { GameSession } from '../ui/session';
import { UI_FONT_FAMILY } from '../ui/typography';
import type { Motion } from '../ui/motion';
import type { MatchTransition } from '../ui/transitions';
import { ART, assetUrl } from '../assets';
import { ensureResourceTextures, NUMBER_TOKEN_ART } from '../rendering/boardEmblems';
import { drawVectorArt } from '../rendering/vectorArt';
import { createBuildingPiece, createRoadPiece } from '../rendering/pieces';
import {
    createPortMarker,
    getPortLayout,
    PORT_TOUCH_RADIUS,
    type PortLayout,
} from '../rendering/ports';
import { getPortOwnerId, getPortTradeRatio } from '../core/ports';
import { configureDisplayCamera, logicalCameraSize } from '../rendering/display';
import { createSharpText } from '../rendering/sharpText';

const NUMBER_TOKEN_SCALE = 1.1;

/** Phaser presents state and previews; all eligibility and commands belong to core/session. */
export class GameScene extends Scene {
    private terrainObjects!: GameObjects.Container;
    private terrainSignature = '';
    private boardObjects!: GameObjects.Container;
    private coast: GameObjects.Graphics | null = null;
    private layout: BoardLayout = fitBoard(390, 468);
    private renderedState: GameState | null = null;
    private renderedPlacement: unknown;
    private inputAdapter: BoardInput;
    private unsubscribe: () => void;
    private effects: BoardEffects;
    private pieces = new Map<string, GameObjects.Container>();
    private portPositions = new Map<string, PortLayout>();
    private ahrimanMarker: GameObjects.Container | null = null;
    private layoutListeners = new Set<() => void>();
    private prepared = false;

    constructor(
        private session: GameSession,
        private motion: Motion,
        private viewport: HTMLElement,
        private onReady: (scene: GameScene) => void,
        private onPrepared: () => void,
    ) {
        super({ key: 'GameScene', active: true });
    }

    create(): void {
        ensureResourceTextures(this);
        this.terrainObjects = this.add.container();
        this.boardObjects = this.add.container();
        this.effects = new BoardEffects(this, this.motion);
        this.inputAdapter = new BoardInput(
            this,
            this.viewport,
            () => !!this.session.state && !this.session.sheet,
            (x, y) => this.selectAt(x, y),
        );
        this.unsubscribe = this.session.subscribe(() => this.render());
        this.scale.on('resize', this.resizeBoard, this);
        let disposed = false;
        const dispose = () => {
            if (disposed) return;
            disposed = true;
            this.unsubscribe();
            this.inputAdapter.destroy();
            this.effects.destroy();
            this.layoutListeners.clear();
            this.scale.off('resize', this.resizeBoard, this);
        };
        this.events.once('shutdown', dispose);
        this.events.once('destroy', dispose);
        this.resizeBoard();
        this.scene.launch('InterfaceScene');
        this.onReady(this);
    }

    /** Warm actual board textures/effect art during the introduction, once per app visit. */
    private prepareMatch(): void {
        if (this.prepared) return;
        this.prepared = true;
        ensureTerrainTextures(this);
        for (const name of ['spark', 'dust'] as const)
            this.load.image(`art-${name}`, assetUrl(ART[name].file));
        this.load.once('complete', () => {
            for (const name of ['spark', 'dust'] as const) {
                const key = `art-${name}`;
                if (!this.textures.exists(key)) continue;
                const texture = this.textures.get(key);
                const [x, y, width, height] = ART[name].frame;
                if (!texture.has('crop')) texture.add('crop', 0, x, y, width, height);
            }
        });
        this.load.start();
        // Dust/spark are optional: prepare them while players read, never gate entry on a download.
        this.onPrepared();
    }
    resizeBoard(): void {
        if (!this.boardObjects) return;
        const rect = this.viewport.getBoundingClientRect();
        const canvas = this.game.canvas.getBoundingClientRect();
        this.cameras.main.setVisible(rect.width > 0 && rect.height > 0);
        if (rect.width <= 0 || rect.height <= 0) return;
        configureDisplayCamera(this, {
            x: rect.left - canvas.left,
            y: rect.top - canvas.top,
            width: rect.width,
            height: rect.height,
        });
        this.layout = matchGeometry(
            rect.width,
            rect.height,
            this.viewport.closest('.match-screen')?.classList.contains('is-wide'),
        ).board;
        this.effects?.clear();
        this.layoutListeners.forEach((listener) => listener());
        this.render(true);
    }
    subscribeLayout(listener: () => void): () => void {
        this.layoutListeners.add(listener);
        return () => this.layoutListeners.delete(listener);
    }
    clearEffects(): void {
        this.effects.clear();
    }

    /** Client coordinates bridge the fitted board and the DOM hand. */
    tileAnchor(tileId: string): { x: number; y: number } | null {
        const tile = this.session.state?.board.tiles.find(({ id }) => id === tileId);
        if (!tile) return null;
        return boardToClient(
            tile,
            this.layout,
            logicalCameraSize(this),
            this.viewport.getBoundingClientRect(),
        );
    }

    playTransition(transition: MatchTransition): void {
        const { action, before, after } = transition;
        if (action.kind === 'roll') {
            const roll = after.lastRoll!;
            const total = roll[0] + roll[1];
            for (const tile of after.board.tiles)
                if (tile.number === total)
                    this.effects.pulse(
                        this.toScreen(tile),
                        this.layout.hexRadius * 0.8,
                        tile.robber ? 0xce977b : 0xffdda0,
                        200,
                    );
        } else if (action.kind === 'build' || action.kind === 'setup') {
            if (action.type === 'road') {
                const edge = after.board.edges[action.targetId];
                this.effects.road(
                    this.toScreen(after.board.vertices[edge.vertexIds[0]]),
                    this.toScreen(after.board.vertices[edge.vertexIds[1]]),
                    0xffdda0,
                );
            } else {
                const piece = this.pieces.get(action.targetId);
                if (piece) this.effects.piece(piece);
                this.effects.pulse(
                    this.toScreen(after.board.vertices[action.targetId]),
                    15,
                    0xffdda0,
                );
            }
        } else if (action.kind === 'robber' && this.ahrimanMarker) {
            const from = before.board.tiles.find(({ robber }) => robber)!;
            const to = after.board.tiles.find(({ robber }) => robber)!;
            const start = this.toScreen(from),
                end = this.toScreen(to);
            const offset = this.layout.hexRadius * AHRIMAN_OFFSET_RATIO;
            this.effects.ahriman(
                this.ahrimanMarker,
                { x: start.x, y: start.y - offset },
                { x: end.x, y: end.y - offset },
            );
            this.effects.pulse(end, this.layout.hexRadius * 0.75, 0xce977b, 250);
        }
    }
    private toScreen(point: { x: number; y: number }) {
        return boardToScreen(point, this.layout);
    }

    private render(force = false): void {
        const state = this.session.state;
        if (
            !force &&
            state === this.renderedState &&
            this.session.placement === this.renderedPlacement
        )
            return;
        this.effects.clear();
        this.pieces.clear();
        this.portPositions.clear();
        this.ahrimanMarker = null;
        const previousBoard = this.renderedState?.board;
        this.renderedState = state;
        this.renderedPlacement = this.session.placement;
        this.boardObjects.removeAll(true);
        if (!state) {
            this.terrainObjects.removeAll(true);
            this.terrainSignature = '';
            this.coast?.destroy();
            this.coast = null;
            return;
        }
        this.prepareMatch();
        if (force || state.board !== previousBoard || !this.coast) {
            this.coast?.destroy();
            this.coast = createBoardCoast(this, state.board, this.layout).setDepth(-1);
        }
        const terrainSignature = state.board.tiles
            .map((tile) => `${tile.id}:${tile.terrain}`)
            .join('|');
        if (force || terrainSignature !== this.terrainSignature) {
            this.terrainObjects.removeAll(true);
            const variants = boardTerrainVariants(state.board.tiles);
            for (const tile of state.board.tiles) {
                const { x, y } = this.toScreen(tile);
                this.terrainObjects.add(
                    this.add
                        .image(x, y, terrainTextureKey(tile.terrain, variants.get(tile.id)!))
                        .setScale(this.layout.hexRadius / TERRAIN_TEXTURE_RADIUS),
                );
            }
            this.terrainSignature = terrainSignature;
        }
        for (const port of state.board.ports) {
            const position = getPortLayout(state.board, port, this.layout);
            this.portPositions.set(port.id, position);
            const owner = state.players.find(({ id }) => id === getPortOwnerId(state.board, port));
            this.boardObjects.add(
                createPortMarker(this, port, position, getPortTradeRatio(port), owner?.color),
            );
        }
        for (const tile of state.board.tiles) this.renderTile(tile);
        const lines = this.add.graphics();
        this.boardObjects.add(lines);
        const targets = new Set(this.session.targets);
        const placement = this.session.placement;
        const active = state.players[state.activePlayerIndex];
        for (const edge of Object.values(state.board.edges)) {
            const a = this.toScreen(state.board.vertices[edge.vertexIds[0]]),
                b = this.toScreen(state.board.vertices[edge.vertexIds[1]]);
            const owner = state.players.find(({ id }) => id === edge.road?.ownerId);
            const eligible = placement?.kind === 'road' && targets.has(edge.id);
            const selected = eligible && placement.targetId === edge.id;
            this.line(lines, a, b, 2, 0x231f1b, 0.5);
            if (owner || eligible) {
                const road = createRoadPiece(this, {
                    x: (a.x + b.x) / 2,
                    y: (a.y + b.y) / 2,
                    length: Math.min(28, Math.hypot(b.x - a.x, b.y - a.y) * 0.74),
                    thickness: 8,
                    angle: Math.atan2(b.y - a.y, b.x - a.x),
                    color: owner?.color ?? active.color,
                    state: { legal: eligible, preview: !owner, selected },
                });
                this.boardObjects.add(road.container);
            }
        }
        for (const vertex of Object.values(state.board.vertices)) {
            const p = this.toScreen(vertex);
            const eligible =
                (placement?.kind === 'settlement' || placement?.kind === 'city') &&
                targets.has(vertex.id);
            const selected = eligible && placement?.targetId === vertex.id;
            const owner = state.players.find(({ id }) => id === vertex.building?.ownerId);
            if (
                this.session.state?.phase === 'setup-settlement' &&
                eligible &&
                !selected &&
                !owner
            ) {
                this.circle(p.x, p.y, 4, active.color, 0.8, 0xf3ead8);
                continue;
            }
            if (owner || eligible) {
                const city =
                    vertex.building?.type === 'city' || (selected && placement?.kind === 'city');
                const piece = createBuildingPiece(this, {
                    x: p.x,
                    y: p.y,
                    kind: city ? 'city' : 'settlement',
                    size: city ? 25 : 21,
                    color: owner?.color ?? active.color,
                    state: { legal: eligible, preview: selected || !owner, selected },
                });
                this.boardObjects.add(piece.container);
                this.pieces.set(vertex.id, piece.container);
            }
        }
    }
    private line(
        graphics: GameObjects.Graphics,
        a: { x: number; y: number },
        b: { x: number; y: number },
        width: number,
        color: number,
        alpha = 1,
    ): void {
        graphics
            .lineStyle(width, color, alpha)
            .beginPath()
            .moveTo(a.x, a.y)
            .lineTo(b.x, b.y)
            .strokePath();
    }
    private renderTile(tile: HexTile): void {
        const { x, y } = this.toScreen(tile);
        const radius = this.layout.hexRadius;
        const points = Array.from({ length: 6 }, (_, i) => {
            const angle = ((-90 + i * 60) * Math.PI) / 180;
            return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
        });
        const polygon = (graphics: GameObjects.Graphics) => {
            graphics.beginPath().moveTo(points[0].x, points[0].y);
            for (const p of points.slice(1)) graphics.lineTo(p.x, p.y);
            return graphics.closePath();
        };
        const roll = this.session.state!.lastRoll;
        if (roll && roll[0] + roll[1] === tile.number && !tile.robber) {
            const highlight = this.add.graphics({ x, y }).lineStyle(3, 0xffebaf, 0.85);
            polygon(highlight).strokePath();
            this.boardObjects.add(highlight);
        }
        if (tile.number !== null) {
            const token = this.add.graphics();
            drawVectorArt(token, NUMBER_TOKEN_ART, x, y + radius * 0.48, 13 * NUMBER_TOKEN_SCALE);
            this.boardObjects.add(token);
            this.text(
                x,
                y + radius * 0.48,
                number(tile.number),
                14 * NUMBER_TOKEN_SCALE,
                tile.number === 6 || tile.number === 8 ? '#a33d2e' : '#332a22',
            );
        }
        const preview =
            this.session.placement?.kind === 'robber' &&
            this.session.placement.targetId === tile.id;
        if (this.session.placement?.kind === 'robber' && !tile.robber) {
            const rim = this.add
                .graphics({ x, y })
                .lineStyle(preview ? 4 : 2, 0xffd77b, preview ? 1 : 0.65);
            polygon(rim).strokePath();
            this.boardObjects.add(rim);
        }
        if (tile.robber || preview) {
            const marker = createAhriman(
                this,
                x,
                y - radius * AHRIMAN_OFFSET_RATIO,
                Math.min(34, radius * 0.9),
                preview,
            );
            this.boardObjects.add(marker);
            if (tile.robber) this.ahrimanMarker = marker;
        }
    }
    private text(
        x: number,
        y: number,
        value: string,
        size: number,
        color: string,
    ): GameObjects.Text {
        const text = createSharpText(this, x, y, value, {
            fontFamily: UI_FONT_FAMILY,
            fontSize: size,
            color,
            rtl: true,
        }).setOrigin(0.5);
        this.boardObjects.add(text);
        return text;
    }
    private circle(
        x: number,
        y: number,
        radius: number,
        color: number,
        alpha = 1,
        stroke = 0x271f18,
    ): void {
        this.boardObjects.add(
            this.add.circle(x, y, radius, color, alpha).setStrokeStyle(2, stroke),
        );
    }
    private selectAt(x: number, y: number): void {
        const state = this.session.state;
        if (!state || this.session.sheet) return;
        const placement = this.session.placement;
        if (!placement) {
            const nearest = [...this.portPositions]
                .map(([id, point]) => ({ id, distance: Math.hypot(x - point.x, y - point.y) }))
                .sort((a, b) => a.distance - b.distance)[0];
            if (nearest && nearest.distance <= PORT_TOUCH_RADIUS) {
                this.session.openSheet({ kind: 'port', id: nearest.id });
                return;
            }
        }
        if (placement?.kind === 'road') {
            let nearest: string | null = null,
                best = Infinity;
            for (const id of this.session.targets) {
                const edge = state.board.edges[id];
                const a = this.toScreen(state.board.vertices[edge.vertexIds[0]]),
                    b = this.toScreen(state.board.vertices[edge.vertexIds[1]]);
                const dx = b.x - a.x,
                    dy = b.y - a.y;
                const t = Math.max(
                    0,
                    Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)),
                );
                const distance = Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
                if (distance < best) {
                    nearest = id;
                    best = distance;
                }
            }
            if (nearest && best <= 28) this.session.preview(nearest);
        } else if (placement?.kind === 'settlement' || placement?.kind === 'city') {
            const nearest = this.session.targets
                .map((id) => {
                    const p = this.toScreen(state.board.vertices[id]);
                    return { id, distance: Math.hypot(x - p.x, y - p.y) };
                })
                .sort((a, b) => a.distance - b.distance)[0];
            if (nearest && nearest.distance <= 28) this.session.preview(nearest.id);
        } else {
            const tile = state.board.tiles.find((tile) => {
                const p = this.toScreen(tile),
                    dx = Math.abs(x - p.x) / this.layout.hexRadius,
                    dy = Math.abs(y - p.y) / this.layout.hexRadius;
                return dx <= Math.sqrt(3) / 2 && dy <= 1 && dy + dx / Math.sqrt(3) <= 1;
            });
            if (tile) {
                if (placement?.kind === 'robber') this.session.preview(tile.id);
                else this.session.openSheet({ kind: 'tile', id: tile.id });
            }
        }
    }
}
