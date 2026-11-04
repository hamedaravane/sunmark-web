import { remoteIdentity } from './transportIdentity';
import { apiBase, playerIdentity } from './identity';
import { offlineSyncResponseSchema } from '../online/shared/src/online/offlineProgression';
import type { ProgressionStore } from '../game/progression/progression';

/** Account-bound retries; a response cannot overwrite another player's profile. */
export function synchronizeOfflineProgression(
    store: ProgressionStore,
    owner: string | undefined,
    changed: () => void = () => {},
) {
    const ownerKey = owner ?? 'guest';
    let busy = false,
        closed = false;
    const sync = async () => {
        if (
            closed ||
            busy ||
            (playerIdentity()?.id ?? 'guest') !== ownerKey ||
            import.meta.env.VITE_ONLINE_ENABLED === 'false' ||
            !navigator.onLine
        )
            return;
        busy = true;
        try {
            for (let i = 0; i < 4; i++) {
                const id = await remoteIdentity(ownerKey);
                if ((playerIdentity()?.id ?? 'guest') !== ownerKey) break;
                const body = { accountId: id, ...store.syncRequest(id) };
                const response = await fetch(
                    `${apiBase()}/api/v1/online/progression/offline/sync`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        cache: 'no-store',
                        headers: { 'Content-Type': 'application/json', 'X-Sunmark-Player': id },
                        body: JSON.stringify(body),
                        signal: AbortSignal.timeout(8000),
                    },
                );
                if (!response.ok) break;
                const result = offlineSyncResponseSchema.parse(await response.json());
                if (
                    closed ||
                    (playerIdentity()?.id ?? 'guest') !== ownerKey ||
                    result.accountId !== id
                )
                    break;
                store.reconcile(result.profile, result.revision, result.acknowledged);
                changed();
                if (!store.synchronization.pending) break;
            }
        } catch {
            /* Durable pending rewards remain available offline and retry after reconnection. */
        } finally {
            busy = false;
        }
    };
    const retry = () => {
        void sync();
    };
    const unsubscribe = store.subscribe(retry);
    const timer = window.setInterval(retry, 30000);
    window.addEventListener('online', retry);
    const visible = () => {
        if (!document.hidden) retry();
    };
    document.addEventListener('visibilitychange', visible);
    retry();
    return () => {
        closed = true;
        unsubscribe();
        clearInterval(timer);
        window.removeEventListener('online', retry);
        document.removeEventListener('visibilitychange', visible);
    };
}
