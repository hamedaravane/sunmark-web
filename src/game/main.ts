import type { Game } from 'phaser';
import { GameSession } from './ui/session';
import { MatchStore, matchStorageKey } from './persistence/matchStore';
import { AppPlatform } from '../pwa/app';
import { BotTurnRunner } from './ui/botTurns';
import { mountMatch } from './matchRuntime';

export function StartGame(parent: HTMLElement): Game {
    let storage: Storage | null = null;
    try {
        storage = window.localStorage;
    } catch {
        /* Private/blocked storage remains playable. */
    }
    const scope = new URL(import.meta.env.BASE_URL, document.baseURI).pathname;
    const session = new GameSession(new MatchStore(storage, matchStorageKey(scope)));
    const app = new AppPlatform();
    const bots = new BotTurnRunner(
        session,
        () => !parent.hidden && !document.hidden && !app.updating,
    );
    document.addEventListener('visibilitychange', bots.refresh);
    const visibility = new MutationObserver(bots.refresh);
    visibility.observe(parent, { attributes: true, attributeFilter: ['hidden'] });
    const disconnectBotsPlatform = app.subscribe(bots.refresh);
    const game = mountMatch(parent, session, app);
    game.events.once('destroy', () => {
        visibility.disconnect();
        bots.destroy();
        disconnectBotsPlatform();
        document.removeEventListener('visibilitychange', bots.refresh);
    });
    return game;
}
