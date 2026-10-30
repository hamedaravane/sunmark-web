import { z } from 'zod';
const identitySchema = z.object({
    id: z.uuid(),
    name: z.string().min(1).max(24),
    username: z.string().min(3).max(24),
});
export type PlayerIdentity = z.infer<typeof identitySchema>;
const key = 'sunmark-player';
let memoryIdentity: PlayerIdentity | null | undefined;
export function playerIdentity(): PlayerIdentity | null {
    if (memoryIdentity !== undefined) return memoryIdentity;
    try {
        const result = identitySchema.safeParse(JSON.parse(localStorage.getItem(key) ?? 'null'));
        return result.success ? result.data : null;
    } catch {
        return null;
    }
}
export function saveIdentity(value: PlayerIdentity | null) {
    memoryIdentity = value ? identitySchema.parse(value) : null;
    try {
        if (value) localStorage.setItem(key, JSON.stringify(identitySchema.parse(value)));
        else localStorage.removeItem(key);
    } catch {
        /* Offline cache is optional. */
    }
}
export const apiBase = () =>
    String(
        import.meta.env.VITE_API_BASE_URL ||
            (import.meta.env.DEV
                ? `${location.protocol}//${location.hostname}:3000`
                : location.origin),
    ).replace(/\/$/, '');

export async function restoreIdentity() {
    try {
        const response = await fetch(`${apiBase()}/api/v1/online/account`, {
            credentials: 'include',
            signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) return false;
        const value: unknown = await response.json();
        const parsed = z.object({ profile: identitySchema }).safeParse(value);
        if (!parsed.success) return false;
        saveIdentity(parsed.data.profile);
        return true;
    } catch {
        return false;
    }
}
