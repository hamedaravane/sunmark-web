import {
    analyticsEventSchema,
    type eventContextSchema,
    type eventNameSchema,
} from '../online/shared/src/analytics/analytics.schemas';
import type { z } from 'zod';

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type EventContext = z.infer<typeof eventContextSchema>;
export type EventName = z.infer<typeof eventNameSchema>;

/** Bounded, best-effort diagnostics. Never changes game state or persists event payloads locally. */
export class AnalyticsRecorder {
    private queue: AnalyticsEvent[] = [];
    private enabled = false;
    private sessionId = '';
    private generation = 0;
    private sending = false;
    constructor(
        private readonly send: (events: AnalyticsEvent[]) => Promise<void>,
        private readonly build = 'development',
        private readonly uuid = () => crypto.randomUUID(),
    ) {}
    setEnabled(enabled: boolean) {
        this.generation++;
        this.queue = [];
        this.enabled = enabled;
        try {
            this.sessionId = enabled ? this.uuid() : '';
        } catch {
            this.enabled = false;
        }
    }
    track(name: EventName, data: EventContext = {}) {
        if (!this.enabled) return;
        try {
            const parsed = analyticsEventSchema.safeParse({
                id: this.uuid(),
                sessionId: this.sessionId,
                name,
                build: this.build,
                data,
            });
            if (!parsed.success) return;
            if (this.queue.length >= 100) this.queue.shift();
            this.queue.push(parsed.data);
        } catch {
            /* Optional diagnostics must never fail a player action. */
        }
    }
    async flush() {
        if (!this.enabled || this.sending || !this.queue.length) return;
        const batch = this.queue.slice(0, 20),
            generation = this.generation;
        this.sending = true;
        try {
            await this.send(batch);
            if (generation === this.generation) {
                const ids = new Set(batch.map((event) => event.id));
                this.queue = this.queue.filter((event) => !ids.has(event.id));
            }
        } catch {
            /* Retry the same event IDs on the next scheduled flush. */
        } finally {
            this.sending = false;
        }
    }
}
