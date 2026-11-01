import { z } from 'zod';
import type { SaveStorage } from '../persistence/matchStore';

export const PROGRESSION_KEY = 'sunmark.progression.v1';

/** getRandomValues also works on local HTTP previews, outside secure contexts. */
export function createProgressionId(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const BADGES = [
    {
        id: 'practice',
        name: 'اولین گام',
        description: 'تمرین را کامل کن',
        metric: 'practice',
        goal: 1,
        xp: 100,
        coins: 40,
    },
    {
        id: 'first-match',
        name: 'همسفر',
        description: 'یک بازی آفلاین را تمام کن',
        metric: 'matches',
        goal: 1,
        xp: 50,
        coins: 10,
    },
    {
        id: 'first-win',
        name: 'اولین پیروزی',
        description: 'یک بازی آفلاین را ببر',
        metric: 'wins',
        goal: 1,
        xp: 100,
        coins: 25,
    },
    {
        id: 'explorer',
        name: 'جهانگرد',
        description: 'پنج بازی آفلاین را تمام کن',
        metric: 'matches',
        goal: 5,
        xp: 200,
        coins: 50,
    },
    {
        id: 'champion',
        name: 'پیروز جزیره',
        description: 'پنج بازی آفلاین را ببر',
        metric: 'wins',
        goal: 5,
        xp: 200,
        coins: 50,
    },
] as const;
export type BadgeId = (typeof BADGES)[number]['id'];
export const SEALS = [
    { id: 'sun', name: 'مهر خورشید', cost: 0, color: 0xffcf75 },
    { id: 'turquoise', name: 'مهر فیروزه', cost: 100, color: 0x59d8ce },
    { id: 'amethyst', name: 'مهر ارغوان', cost: 200, color: 0xc9a3f7 },
] as const;
export type SealId = (typeof SEALS)[number]['id'];
const badgeId = z.enum(['practice', 'first-match', 'first-win', 'explorer', 'champion']);
const sealId = z.enum(['sun', 'turquoise', 'amethyst']);
const count = z.number().int().min(0).max(100_000_000);
const rewardSchema = z.strictObject({
    source: z.enum(['match', 'practice']),
    matchId: z.uuid().nullable(),
    won: z.boolean(),
    xp: count,
    coins: count,
    badges: z.array(badgeId).max(BADGES.length),
    previousLevel: z.number().int().min(1),
});
const profileSchema = z
    .strictObject({
        version: z.literal(1),
        name: z.string().min(1).max(48),
        xp: count,
        coins: count,
        matches: count,
        wins: count,
        practice: z.boolean(),
        matchIds: z.array(z.uuid()).max(20_000),
        badges: z.array(badgeId).max(BADGES.length),
        owned: z.array(sealId).min(1).max(SEALS.length),
        equipped: sealId,
        lastReward: rewardSchema.nullable(),
    })
    .refine(
        (p) =>
            p.wins <= p.matches &&
            p.matchIds.length === p.matches &&
            new Set(p.matchIds).size === p.matchIds.length &&
            new Set(p.badges).size === p.badges.length &&
            new Set(p.owned).size === p.owned.length &&
            p.owned.includes('sun') &&
            p.owned.includes(p.equipped) &&
            BADGES.every((b) => p.badges.includes(b.id) === metric(p, b.metric) >= b.goal),
    );
export type Profile = z.infer<typeof profileSchema>;
export type Reward = z.infer<typeof rewardSchema>;
type Metric = (typeof BADGES)[number]['metric'];

export function metric(
    profile: { practice: boolean; matches: number; wins: number },
    key: Metric,
): number {
    return key === 'practice' ? Number(profile.practice) : profile[key];
}

/** Account experience measures participation, never competitive skill. */
export function experience(xp: number): {
    level: number;
    current: number;
    required: number;
    percent: number;
} {
    let level = 1;
    let current = Number.isFinite(xp) ? Math.max(0, Math.min(100_000_000, Math.floor(xp))) : 0;
    let required = 300;
    while (current >= required) {
        current -= required;
        level++;
        required = Math.min(1500, 300 + (level - 1) * 100);
    }
    return { level, current, required, percent: current / required };
}

function emptyProfile(): Profile {
    return {
        version: 1,
        name: 'بازیکن',
        xp: 0,
        coins: 0,
        matches: 0,
        wins: 0,
        practice: false,
        matchIds: [],
        badges: [],
        owned: ['sun'],
        equipped: 'sun',
        lastReward: null,
    };
}
function browserStorage(): SaveStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/** Device-local rewards. This ledger is never proof of online rank or account wealth. */
export class ProgressionStore {
    private profile = emptyProfile();
    private previousRaw: string | null = null;
    status: 'saved' | 'empty' | 'invalid' | 'unavailable' = 'empty';
    constructor(private storage: SaveStorage | null = browserStorage()) {
        this.refresh();
    }
    /** Pick up sequential writes from another tab before reading or changing this profile. */
    private refresh(): void {
        try {
            const storage = this.storage;
            if (!storage) {
                this.status = 'unavailable';
                return;
            }
            const raw = storage.getItem(PROGRESSION_KEY);
            if (raw === this.previousRaw) return;
            this.previousRaw = raw;
            if (!raw) {
                this.profile = emptyProfile();
                this.status = 'empty';
                return;
            }
            if (raw.length > 2_000_000) {
                this.status = 'invalid';
                return;
            }
            let value: unknown;
            try {
                value = JSON.parse(raw);
            } catch {
                this.status = 'invalid';
                return;
            }
            const parsed = profileSchema.safeParse(value);
            if (parsed.success) {
                this.profile = parsed.data;
                this.status = 'saved';
            } else this.status = 'invalid';
        } catch {
            this.status = 'unavailable';
        }
    }
    get snapshot(): Profile {
        this.refresh();
        const p = this.profile;
        return {
            ...p,
            matchIds: [...p.matchIds],
            badges: [...p.badges],
            owned: [...p.owned],
            lastReward: p.lastReward ? { ...p.lastReward, badges: [...p.lastReward.badges] } : null,
        };
    }
    get seal() {
        this.refresh();
        return SEALS.find((s) => s.id === this.profile.equipped) ?? SEALS[0];
    }
    rename(name: string): void {
        this.refresh();
        if (!name || Array.from(name).length > 24 || name === this.profile.name) return;
        this.profile.name = name;
        this.save();
    }
    /** Save balance and ownership together; repeated purchase equips without charging again. */
    equip(id: string): boolean {
        this.refresh();
        const seal = SEALS.find((s) => s.id === id);
        if (!seal) return false;
        if (!this.profile.owned.includes(seal.id)) {
            if (this.profile.coins < seal.cost) return false;
            this.profile.coins -= seal.cost;
            this.profile.owned.push(seal.id);
        }
        this.profile.equipped = seal.id;
        this.save();
        return true;
    }
    completePractice(): Reward | null {
        this.refresh();
        if (this.profile.practice) return null;
        this.profile.practice = true;
        return this.grant('practice', null, false, 0, 0);
    }
    completeMatch(matchId: string, won: boolean): Reward | null {
        this.refresh();
        if (
            !z.uuid().safeParse(matchId).success ||
            this.profile.matchIds.includes(matchId) ||
            this.profile.matchIds.length >= 20_000
        )
            return null;
        this.profile.matchIds.push(matchId);
        this.profile.matches++;
        if (won) this.profile.wins++;
        return this.grant('match', matchId, won, won ? 150 : 100, won ? 30 : 20);
    }
    private grant(
        source: Reward['source'],
        matchId: string | null,
        won: boolean,
        xp: number,
        coins: number,
    ): Reward {
        const previousLevel = experience(this.profile.xp).level;
        const badges = BADGES.filter(
            (b) => !this.profile.badges.includes(b.id) && metric(this.profile, b.metric) >= b.goal,
        );
        for (const badge of badges) {
            xp += badge.xp;
            coins += badge.coins;
            this.profile.badges.push(badge.id);
        }
        this.profile.xp += xp;
        this.profile.coins += coins;
        const reward: Reward = {
            source,
            matchId,
            won,
            xp,
            coins,
            badges: badges.map((b) => b.id),
            previousLevel,
        };
        this.profile.lastReward = reward;
        this.save();
        return { ...reward, badges: [...reward.badges] };
    }
    private save(): void {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = JSON.stringify(this.profile);
            this.storage.setItem(PROGRESSION_KEY, raw);
            this.previousRaw = raw;
            this.status = 'saved';
        } catch {
            this.status = 'unavailable';
        }
    }
}
