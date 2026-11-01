import {
    progressionProfileSchema,
    type ProgressionProfile,
} from '../online/shared/src/online/progression.schemas';
import { apiBase, playerIdentity } from './identity';
let current: ProgressionProfile | null = null;
let busy = false;
let error = '';
let generation = 0;
const listeners = new Set<() => void>();
export function onlineProgression(): ProgressionProfile | null {
    return current?.playerId === playerIdentity()?.id ? current : null;
}
export const progressionStatus = () => ({ busy, error });
export function subscribeProgression(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
const emit = () => listeners.forEach((listener) => listener());
export async function refreshProgression(): Promise<void> {
    if (busy) return;
    const id = playerIdentity()?.id;
    const request = ++generation;
    if (!id || import.meta.env.VITE_ONLINE_ENABLED === 'false') {
        current = null;
        error = '';
        emit();
        return;
    }
    try {
        const response = await fetch(`${apiBase()}/api/v1/online/progression`, {
            credentials: 'include',
            headers: { 'X-Sunmark-Player': id },
            signal: AbortSignal.timeout(5000),
        });
        if (request !== generation || id !== playerIdentity()?.id) return;
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) current = null;
            return;
        }
        const parsed = progressionProfileSchema.parse(await response.json());
        if (request !== generation || id !== playerIdentity()?.id || parsed.playerId !== id) return;
        current = parsed;
        error = '';
    } catch {
        /* The offline profile remains playable while synchronization is unavailable. */
    } finally {
        if (request === generation) emit();
    }
}
export async function changeProgression(
    path: 'cosmetics' | 'referral',
    body: unknown,
): Promise<boolean> {
    if (busy) return false;
    const id = playerIdentity()?.id;
    if (!id) return false;
    busy = true;
    error = '';
    generation++;
    emit();
    try {
        const response = await fetch(`${apiBase()}/api/v1/online/progression/${path}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Sunmark-Player': id },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
            error =
                response.status === 401 || response.status === 403
                    ? 'برای ادامه، دوباره وارد حسابت شو.'
                    : response.status === 409
                      ? path === 'cosmetics'
                          ? 'سکه کافی نداری. دارایی تازه را بررسی کن.'
                          : 'کد دعوت باید پیش از اولین بازی آنلاین انتخاب شود و فقط یک دوست را می‌توان انتخاب کرد.'
                      : response.status === 429
                        ? 'کمی صبر کن و دوباره تلاش کن.'
                        : 'درخواست انجام نشد؛ کد دعوت یا اتصال را بررسی کن.';
            return false;
        }
        const parsed = progressionProfileSchema.parse(await response.json());
        if (id !== playerIdentity()?.id || parsed.playerId !== id) return false;
        current = parsed;
        if (path === 'referral') {
            const url = new URL(location.href);
            url.searchParams.delete('ref');
            history.replaceState(history.state, '', url);
        }
        return true;
    } catch {
        error = 'پاسخ سرور دریافت نشد. دوباره تلاش کن؛ خرید و پاداش تکراری اعمال نمی‌شود.';
        return false;
    } finally {
        busy = false;
        emit();
    }
}
export const TIER_LABELS = {
    bronze: 'برنز',
    silver: 'نقره',
    gold: 'طلا',
    platinum: 'پلاتین',
    diamond: 'الماس',
    master: 'استاد',
};
export function rankLabel(profile: ProgressionProfile | null): string {
    if (!profile) return 'ورود برای دیدن رتبه';
    if (profile.tier && profile.rating !== null)
        return `${TIER_LABELS[profile.tier]} · ${profile.rating.toLocaleString('fa-IR')}`;
    return `ارزیابی · ${(5 - profile.placementGamesRemaining).toLocaleString('fa-IR')} از ۵ بازی`;
}
export function referralLink(code: string): string {
    const url = new URL(import.meta.env.BASE_URL, location.origin);
    url.searchParams.set('ref', code);
    return url.href;
}
