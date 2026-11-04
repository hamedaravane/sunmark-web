import { z } from 'zod';
import type { SaveStorage } from '../persistence/matchStore';
import {
    applyOfflineCommand,
    emptyProfile,
    offlineProfileSchema,
    offlineCommandSchema,
    createProgressionId,
    SEALS,
    PROGRESSION_KEY,
    type OfflineCommand,
    type Profile,
    type Reward,
} from '../../online/shared/src/online/offlineProgression';
export {
    BADGES,
    SEALS,
    PROGRESSION_KEY,
    experience,
    metric,
    createProgressionId,
} from '../../online/shared/src/online/offlineProgression';
export type {
    BadgeId,
    SealId,
    Profile,
    Reward,
} from '../../online/shared/src/online/offlineProgression';

const envelopeSchema = z.strictObject({
    version: z.literal(2),
    profile: offlineProfileSchema,
    baseline: offlineProfileSchema,
    pending: z.array(offlineCommandSchema).max(20000),
    revision: z.number().int().nonnegative().nullable(),
    syncedAt: z.string().nullable(),
    remoteOwner: z.string().nullable().optional(),
});
function browserStorage(): SaveStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}
/** Atomic profile/outbox envelope. The server replays commands, never trusts requested reward amounts. */
export class ProgressionStore {
    private profile = emptyProfile();
    private baseline = emptyProfile();
    private pending: OfflineCommand[] = [];
    private revision: number | null = null;
    private syncedAt: string | null = null;
    private remoteOwner: string | null = null;
    private previousRaw: string | null = null;
    private listeners = new Set<() => void>();
    status: 'saved' | 'empty' | 'invalid' | 'unavailable' = 'empty';
    constructor(
        private storage: SaveStorage | null = browserStorage(),
        private key = PROGRESSION_KEY,
    ) {
        this.refresh();
    }
    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    private commandStorage(): Storage | null {
        const candidate = this.storage;
        return candidate &&
            'length' in candidate &&
            'key' in candidate &&
            'removeItem' in candidate &&
            typeof candidate.key === 'function' &&
            typeof candidate.removeItem === 'function'
            ? (candidate as Storage)
            : null;
    }
    private loadCommands() {
        const storage = this.commandStorage();
        if (!storage) return;
        const prefix = this.key + ':command:';
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (!key?.startsWith(prefix)) continue;
            const parsed = offlineCommandSchema.safeParse(
                JSON.parse(storage.getItem(key) ?? 'null'),
            );
            if (parsed.success && !this.pending.some((c) => c.id === parsed.data.id)) {
                this.pending.push(parsed.data);
                this.profile = applyOfflineCommand(this.profile, parsed.data);
            }
        }
    }
    private refresh() {
        try {
            if (!this.storage) {
                this.status = 'unavailable';
                return;
            }
            const raw = this.storage.getItem(this.key);
            if (raw === this.previousRaw) return;
            this.previousRaw = raw;
            if (!raw) {
                this.status = 'empty';
                return;
            }
            if (raw.length > 8000000) {
                this.status = 'invalid';
                return;
            }
            const value: unknown = JSON.parse(raw);
            const current = envelopeSchema.safeParse(value);
            if (current.success) {
                this.profile = current.data.profile;
                this.baseline = current.data.baseline;
                this.pending = current.data.pending;
                this.revision = current.data.revision;
                this.syncedAt = current.data.syncedAt;
                this.remoteOwner = current.data.remoteOwner ?? null;
            } else {
                const legacy = offlineProfileSchema.safeParse(value);
                if (!legacy.success) {
                    this.status = 'invalid';
                    return;
                }
                this.profile = legacy.data;
                this.baseline = structuredClone(legacy.data);
            }
            this.loadCommands();
            this.status = 'saved';
        } catch {
            this.status = 'unavailable';
        }
    }
    get snapshot(): Profile {
        this.refresh();
        return structuredClone(this.profile);
    }
    get seal() {
        return SEALS.find((s) => s.id === this.snapshot.equipped) ?? SEALS[0];
    }
    get synchronization() {
        this.refresh();
        return { pending: this.pending.length, syncedAt: this.syncedAt, revision: this.revision };
    }
    syncRequest(remoteOwner?: string) {
        this.refresh();
        if (remoteOwner && this.remoteOwner && this.remoteOwner !== remoteOwner) {
            // An expired guest cookie creates a new authenticated guest, preserving this device's earned profile.
            this.baseline = structuredClone(this.profile);
            this.pending = [];
            this.revision = null;
            try {
                const storage = this.commandStorage();
                if (storage) {
                    const prefix = this.key + ':command:';
                    for (let i = storage.length - 1; i >= 0; i--) {
                        const key = storage.key(i);
                        if (key?.startsWith(prefix)) storage.removeItem(key);
                    }
                }
            } catch {
                /* Best effort cleanup; profile remains intact. */
            }
        }
        if (remoteOwner) this.remoteOwner = remoteOwner;
        this.refresh();
        try {
            this.loadCommands();
        } catch {
            /* Keep the current durable envelope. */
        }
        return {
            ...(this.revision === null ? { baseline: structuredClone(this.baseline) } : {}),
            commands: structuredClone(this.pending.slice(0, 25)),
        };
    }
    reconcile(profile: Profile, revision: number, acknowledged: string[]) {
        this.refresh();
        if (this.revision !== null && revision < this.revision) return;
        // Preserve legacy history on this device before the first canonical reconciliation.
        if (this.revision === null)
            try {
                this.storage?.setItem(this.key + ':legacy-backup', JSON.stringify(this.baseline));
            } catch {
                /* Keep the existing envelope if backup fails. */
            }
        const ids = new Set(acknowledged);
        // Acknowledgment removes only known command keys; concurrent tabs keep their additions.
        const storage = this.commandStorage();
        try {
            for (const id of ids) storage?.removeItem(this.key + ':command:' + id);
        } catch {
            /* Server receipts keep retries safe. */
        }
        this.pending = this.pending.filter((c) => !ids.has(c.id));
        this.baseline = offlineProfileSchema.parse(profile);
        this.revision = revision;
        this.syncedAt = new Date().toISOString();
        this.profile = this.pending.reduce(applyOfflineCommand, structuredClone(this.baseline));
        this.save();
    }
    private apply(command: OfflineCommand) {
        this.refresh();
        if (this.pending.length >= 20000) {
            this.status = 'unavailable';
            return false;
        }
        const next = applyOfflineCommand(this.profile, command);
        if (JSON.stringify(next) === JSON.stringify(this.profile)) return false;
        try {
            this.commandStorage()?.setItem(
                this.key + ':command:' + command.id,
                JSON.stringify(command),
            );
        } catch {
            /* Envelope still attempts a durable write. */
        }
        this.pending.push(command);
        this.profile = next;
        this.save();
        return true;
    }
    rename(name: string) {
        if (!name || Array.from(name).length > 24) return;
        this.apply({ id: createProgressionId(), kind: 'rename', name });
    }
    equip(id: string): boolean {
        this.refresh();
        const seal = SEALS.find((s) => s.id === id);
        if (!seal || (!this.profile.owned.includes(seal.id) && this.profile.coins < seal.cost))
            return false;
        this.apply({ id: createProgressionId(), kind: 'equip', seal: seal.id });
        return true;
    }
    completePractice(): Reward | null {
        return this.apply({ id: createProgressionId(), kind: 'practice' })
            ? this.snapshot.lastReward
            : null;
    }
    completeMatch(matchId: string, won: boolean): Reward | null {
        if (!z.uuid().safeParse(matchId).success) return null;
        return this.apply({ id: createProgressionId(), kind: 'match', matchId, won })
            ? this.snapshot.lastReward
            : null;
    }
    private save() {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = JSON.stringify({
                version: 2,
                profile: this.profile,
                baseline: this.baseline,
                pending: this.pending,
                revision: this.revision,
                syncedAt: this.syncedAt,
                remoteOwner: this.remoteOwner,
            });
            this.storage.setItem(this.key, raw);
            this.previousRaw = raw;
            this.status = 'saved';
        } catch {
            this.status = 'unavailable';
        }
        this.listeners.forEach((listener) => listener());
    }
}
