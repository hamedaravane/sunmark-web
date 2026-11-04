import type { EventPersistence } from './persistence';
import {
    analyticsEventSchema,
    type eventContextSchema,
    type eventNameSchema,
} from '../online/shared/src/analytics/analytics.schemas';
import type { z } from 'zod';

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type EventContext = z.infer<typeof eventContextSchema>;
export type EventName = z.infer<typeof eventNameSchema>;

/** Bounded, best-effort diagnostics. Survives restarts through an optional owner-scoped outbox; never changes game state. */
export class AnalyticsRecorder {
    private queue: AnalyticsEvent[] = [];
    private enabled = false;
    private sessionId = '';
    private generation = 0;
    private sending = false;
    private persistence: EventPersistence | null = null;
    private persistRead() {
        try {
            const ids = new Set(this.queue.map((e) => e.id));
            for (const event of this.persistence?.read() ?? [])
                if (!ids.has(event.id)) {
                    this.queue.push(event);
                    ids.add(event.id);
                }
        } catch {
            /* Storage denied: memory fallback remains playable. */
        }
    }
    attach(persistence: EventPersistence | null) {
        this.generation++;
        this.queue = [];
        this.persistence = persistence;
        this.persistRead();
    }
    suspend() {
        this.enabled = false;
        this.generation++;
        this.queue = [];
        this.persistence = null;
    }
    newSession() {
        try {
            this.sessionId = this.uuid();
        } catch {
            /* Keep the existing session. */
        }
    }
    constructor(
        private readonly send: (events: AnalyticsEvent[]) => Promise<void>,
        private readonly build = 'development',
        private readonly uuid = () => crypto.randomUUID(),
    ) {}
    setEnabled(enabled: boolean) {
        this.generation++;
        if (!enabled) {
            this.queue = [];
            try {
                this.persistence?.clear();
            } catch {
                /* Best effort deletion when storage is unavailable. */
            }
        } else this.persistRead();
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
                occurredAt: new Date().toISOString(),
                id: this.uuid(),
                sessionId: this.sessionId,
                name,
                build: this.build,
                data,
            });
            if (!parsed.success) return;
            const limit = this.persistence ? 5000 : 100;
            if (this.queue.length >= limit) {
                const dropped = this.queue.shift();
                if (dropped)
                    try {
                        this.persistence?.remove([dropped.id]);
                    } catch {
                        /* Bounded queue. */
                    }
            }
            try {
                this.persistence?.put(parsed.data);
            } catch {
                /* Keep event in memory if quota is exhausted. */
            }
            this.queue.push(parsed.data);
        } catch {
            /* Optional diagnostics must never fail a player action. */
        }
    }
    async flush() {
        if (!this.enabled || this.sending) return;
        this.persistRead();
        if (!this.queue.length) return;
        const batch = this.queue.slice(0, 20),
            generation = this.generation;
        this.sending = true;
        try {
            await this.send(batch);
            if (generation === this.generation) {
                const ids = new Set(batch.map((event) => event.id));
                try {
                    this.persistence?.remove([...ids]);
                } catch {
                    /* Retried IDs are deduplicated by the server. */
                }
                this.queue = this.queue.filter((event) => !ids.has(event.id));
            }
        } catch {
            /* Retry the same event IDs on the next scheduled flush. */
        } finally {
            this.sending = false;
        }
    }
}
