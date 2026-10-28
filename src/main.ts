import { StartGame } from './game/main';
import { loadUiFont } from './game/ui/typography';
import './styles/global.css';
import './styles/royal.css';
import './styles/desktop.css';

const parent = document.querySelector<HTMLElement>('#game-container');

if (!parent) {
    throw new Error('Game container #game-container was not found.');
}

void loadUiFont().then(async () => {
    if (new URLSearchParams(window.location.search).get('demo') === 'pieces') {
        const { startPiecesDemo } = await import('./game/demo/piecesDemo');
        startPiecesDemo(parent);
    } else {
        const offline = document.createElement('div');
        parent.append(offline);
        const game = StartGame(offline);
        let online: { destroy(): void } | null = null;
        const openOnline = async () => {
            if (online) return;
            const { startOnline } = await import('./online/start');
            offline.hidden = true;
            game.loop.sleep();
            const root = document.createElement('div');
            parent.append(root);
            online = startOnline(root, () => {
                online?.destroy();
                online = null;
                root.remove();
                offline.hidden = false;
                game.loop.wake();
            });
        };
        parent.addEventListener('sunmark:online', () => {
            void openOnline();
        });
        if (
            import.meta.env.VITE_ONLINE_ENABLED !== 'false' &&
            new URL(location.href).searchParams.has('invite')
        )
            await openOnline();
    }
});
