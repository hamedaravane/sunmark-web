import { apiBase, playerIdentity } from './identity';
import { guestResponseSchema } from '../online/shared/src/online/wire';
const ownerKey = () => playerIdentity()?.id ?? 'guest';
async function resolveIdentity(expected = ownerKey()) {
    if (expected !== 'guest') return expected;
    let response = await fetch(`${apiBase()}/api/v1/online/session`, {
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
    });
    if (response.status === 401)
        response = await fetch(`${apiBase()}/api/v1/online/session`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'مهمان' }),
            signal: AbortSignal.timeout(4000),
        });
    if (!response.ok) throw new Error('Session unavailable');
    const value = guestResponseSchema.parse(await response.json());
    if (ownerKey() !== expected) throw new Error('Identity changed');
    return value.id;
}

let pending: Promise<string> | null = null;
export function remoteIdentity(expected = ownerKey()): Promise<string> {
    if (expected !== 'guest') return Promise.resolve(expected);
    if (pending) return pending;
    const task = resolveIdentity(expected).finally(() => {
        if (pending === task) pending = null;
    });
    pending = task;
    return task;
}
