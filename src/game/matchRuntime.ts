import { AUTO, Game, Scale } from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameHud } from './ui/GameHud';
import type { MatchSession } from './ui/matchSession';
import { GameFeedback } from './ui/GameFeedback';
import { Motion } from './ui/motion';
import { InterfaceScene } from './ui/InterfaceScene';
import { BackdropScene } from './scenes/BackdropScene';
import { canvasPixelSize } from './rendering/displayGeometry';
import type { AppPlatform } from '../pwa/app';
import { connectPlatform } from '../pwa/browser';
import { UpdateNotice } from '../pwa/updateFlow';

export function mountMatch(parent: HTMLElement, session: MatchSession, app: AppPlatform): Game {
    const disconnectPlatform = connectPlatform(app);
    const motion = new Motion(session.preferences);
    const hud = new GameHud(parent, session, app);
    const updates = new UpdateNotice(app, session);
    const stage = document.createElement('div');
    stage.className = 'phaser-stage';
    stage.setAttribute('aria-hidden', 'true');
    parent.prepend(stage);
    let feedback: GameFeedback | null = null;
    const ui = new InterfaceScene(parent, session, motion);
    const scene = new GameScene(
        session,
        motion,
        hud.boardViewport,
        (readyScene) => {
            feedback = new GameFeedback(parent, session, readyScene, ui, motion, (transition) =>
                hud.consumeRollOrigin(transition),
            );
        },
        () => hud.boardReady(),
    );
    const initialSize = canvasPixelSize(
        parent.clientWidth || 390,
        parent.clientHeight || 844,
        window.devicePixelRatio,
    );
    const game = new Game({
        type: AUTO,
        width: initialSize.width,
        height: initialSize.height,
        parent: stage,
        transparent: true,
        // ResizeObserver owns the grid measurements, including hidden-menu startup.
        scale: { mode: Scale.NONE, autoCenter: Scale.NO_CENTER, expandParent: false },
        scene: [new BackdropScene(session, motion), scene, ui],
        input: { keyboard: false, mouse: false, touch: false },
        render: { antialias: true, roundPixels: false },
    });
    // Grid/safe-area changes can resize the board without a window resize.
    const resize = () => {
        if (parent.clientWidth <= 0 || parent.clientHeight <= 0) return;
        const size = canvasPixelSize(
            parent.clientWidth,
            parent.clientHeight,
            window.devicePixelRatio,
        );
        if (game.scale.width !== size.width || game.scale.height !== size.height)
            game.scale.resize(size.width, size.height);
        scene.resizeBoard();
        ui.invalidate();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    observer.observe(hud.boardViewport);
    // A browser zoom or a move between displays can change DPR without changing layout.
    let densityQuery: MediaQueryList;
    const watchDensity = () => {
        densityQuery?.removeEventListener('change', densityChanged);
        densityQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        densityQuery.addEventListener('change', densityChanged);
    };
    const densityChanged = () => {
        resize();
        watchDensity();
    };
    watchDensity();
    window.addEventListener('resize', resize);
    game.events.once('destroy', () => {
        observer.disconnect();
        updates.destroy();
        disconnectPlatform();
        densityQuery.removeEventListener('change', densityChanged);
        window.removeEventListener('resize', resize);
        feedback?.destroy();
        hud.destroy();
        motion.destroy();
        stage.remove();
    });
    return game;
}
