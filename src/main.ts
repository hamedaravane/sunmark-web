import { applySunmarkPalette } from './ui/palette';
import { configureAnalytics, analytics } from './analytics/browser';
import { showAccount } from './account/account';
import { playerIdentity, restoreIdentity } from './account/identity';
import { refreshProgression } from './account/progression';
import { StartGame } from './game/main';
import { loadUiFont } from './game/ui/typography';
import './styles/global.css';
import './styles/council.css';
import './styles/cinematic.css';
import './ui/icons.css';

applySunmarkPalette();

const parent = document.querySelector<HTMLElement>('#game-container');

if (!parent) {
    throw new Error('Game container #game-container was not found.');
}

void loadUiFont().then(async () => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('review')) {
        const { startDesignReview } = await import('./game/demo/designReview');
        startDesignReview(parent);
    } else if (new URLSearchParams(window.location.search).get('demo') === 'pieces') {
        const { startPiecesDemo } = await import('./game/demo/piecesDemo');
        startPiecesDemo(parent);
    } else {
        if (import.meta.env.VITE_ONLINE_ENABLED !== 'false') {
            if (navigator.onLine) await restoreIdentity();
            if (navigator.onLine && playerIdentity()?.profileComplete === false)
                await showAccount(parent);
        }
        await configureAnalytics(parent);
        const offline = document.createElement('div');
        parent.append(offline);
        let game = StartGame(offline);
        let offlineIdentity = playerIdentity()?.id;
        const refreshOfflineIdentity = () => {
            if (offlineIdentity === playerIdentity()?.id) return;
            game.destroy(true);
            offline.replaceChildren();
            game = StartGame(offline);
            offlineIdentity = playerIdentity()?.id;
        };
        parent.addEventListener('sunmark:analytics', () => {
            void configureAnalytics(parent, true);
        });
        let accountOpen = false;
        parent.addEventListener('sunmark:account', (event) => {
            if (accountOpen) return;
            accountOpen = true;
            game.loop.sleep();
            void showAccount(
                parent,
                true,
                event instanceof CustomEvent && event.detail === 'login',
            ).finally(() => {
                accountOpen = false;
                refreshOfflineIdentity();
                game.loop.wake();
                void refreshProgression();
                void configureAnalytics(parent);
            });
        });
        let online: { destroy(): void } | null = null;
        const openOnline = async (mode: 'casual' | 'ranked' = 'casual') => {
            if (online) return;
            analytics.track('screen_view', { mode: 'online', screen: 'other' });
            const { startOnline } = await import('./online/start');
            offline.hidden = true;
            game.loop.sleep();
            const root = document.createElement('div');
            parent.append(root);
            online = startOnline(
                root,
                () => {
                    online?.destroy();
                    online = null;
                    root.remove();
                    refreshOfflineIdentity();
                    offline.hidden = false;
                    game.loop.wake();
                    void refreshProgression();
                },
                mode,
            );
        };
        parent.addEventListener('sunmark:online', () => {
            void openOnline();
        });
        parent.addEventListener('sunmark:ranked', () => {
            void openOnline('ranked');
        });
        void refreshProgression();
        if (
            import.meta.env.VITE_ONLINE_ENABLED !== 'false' &&
            new URL(location.href).searchParams.has('invite')
        )
            await openOnline();
    }
});
