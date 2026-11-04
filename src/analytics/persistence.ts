import { analyticsEventSchema } from '../online/shared/src/analytics/analytics.schemas';
import type { AnalyticsEvent } from './recorder';

export interface EventPersistence {
    read(): AnalyticsEvent[];
    put(event: AnalyticsEvent): void;
    remove(ids: string[]): void;
    clear(): void;
}
/** One key per event: another tab's additions cannot be overwritten by acknowledgments. */
export function eventPersistence(storage: Storage, owner: string): EventPersistence {
    const prefix = `sunmark.analytics.v2:${owner}:`;
    const keys = () =>
        Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter(
            (key): key is string => key?.startsWith(prefix) === true,
        );
    return {
        read() {
            const events: AnalyticsEvent[] = [];
            for (const key of keys()) {
                try {
                    const parsed = analyticsEventSchema.safeParse(
                        JSON.parse(storage.getItem(key) ?? 'null'),
                    );
                    if (
                        !parsed.success ||
                        (parsed.data.occurredAt &&
                            Date.parse(parsed.data.occurredAt) < Date.now() - 90 * 86400000)
                    ) {
                        storage.removeItem(key);
                    } else events.push(parsed.data);
                } catch {
                    storage.removeItem(key);
                }
            }
            return events.sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''));
        },
        put(event) {
            storage.setItem(prefix + event.id, JSON.stringify(event));
        },
        remove(ids) {
            for (const id of ids) storage.removeItem(prefix + id);
        },
        clear() {
            for (const key of keys()) storage.removeItem(key);
        },
    };
}
