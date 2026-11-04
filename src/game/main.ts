import { synchronizeOfflineProgression } from '../account/offlineSync';
import { playerIdentity } from '../account/identity';
import type { Game } from 'phaser';
import { GameSession } from './ui/session';
import { MatchStore, matchStorageKey } from './persistence/matchStore';
import { AppPlatform } from '../pwa/app';
import { BotTurnRunner } from './ui/botTurns';
import { mountMatch } from './matchRuntime';
import { ProgressionStore, PROGRESSION_KEY } from './progression/progression';

export function StartGame(parent: HTMLElement): Game {
    let storage: Storage | null = null;
    try {
        storage = window.localStorage;
    } catch {
        /* Private/blocked storage remains playable. */
    }
    const scope = new URL(import.meta.env.BASE_URL, document.baseURI).pathname;
    const identity = playerIdentity();
    const key = matchStorageKey(identity ? `${scope}:${identity.id}` : scope);
    const progressionKey = identity ? `${PROGRESSION_KEY}:${identity.id}` : PROGRESSION_KEY;
    if (storage && identity) {
        try {
            const legacyKey = matchStorageKey(scope);
            const legacy = storage.getItem(legacyKey);
            if (!storage.getItem(key) && legacy) {
                storage.setItem(key, legacy);
                storage.removeItem(legacyKey);
            }
            const legacyProgression = storage.getItem(PROGRESSION_KEY);
            if (!storage.getItem(progressionKey) && legacyProgression) {
                const legacyValue: unknown = JSON.parse(legacyProgression);
                // Rebind the local profile, never a prior owner's server revision.
                storage.setItem(
                    progressionKey,
                    JSON.stringify(
                        legacyValue && typeof legacyValue === 'object' && 'profile' in legacyValue
                            ? legacyValue.profile
                            : legacyValue,
                    ),
                );
                storage.removeItem(PROGRESSION_KEY);
            }
        } catch {
            /* Existing saves remain intact when storage is unavailable. */
        }
    }
    const session = new GameSession(
        new MatchStore(storage, key),
        new ProgressionStore(storage, progressionKey),
    );
    const disconnectProgression = synchronizeOfflineProgression(session.progression, identity?.id);
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
        disconnectProgression();
        visibility.disconnect();
        bots.destroy();
        disconnectBotsPlatform();
        document.removeEventListener('visibilitychange', bots.refresh);
    });
    return game;
}
