import { createDevelopment } from '../core/developmentDeck';
import { refreshAwards } from '../core/scoring';
import { beginRobber } from '../core/robber';
import { validTrading } from './validateTrading';
import type { TradeMemory } from '../core/domesticTrade';
import type { GameState } from '../core/types';
import type { MatchEvent } from '../ui/session';
import type { TutorialMemory } from '../tutorial/director';
import { LESSONS } from '../tutorial/lessons.fa';
import { integer, label, record, validGameState } from './validateState';
import { validRivalMemory, type RivalMemory } from '../narrative/rivalDirector';

export interface SavedMatch {
    /** Stable local reward identity; legacy saves acquire one on resume. */
    progressionId?: string;
    buildGoal?: 'road' | 'settlement' | 'city' | null;
    version: 1 | 2;
    /** Absent in legacy shared-device saves; their first seat becomes the human. */
    humanPlayerId?: string;
    state: GameState;
    tutorial: TutorialMemory;
    history: MatchEvent[];
    trading?: TradeMemory;
    rivals?: RivalMemory;
}
export interface SaveStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export type SaveStatus = 'saved' | 'empty' | 'invalid' | 'unavailable';

/** The renamed Pages site shares its original save slot on the same origin. */
export function matchStorageKey(scope: string): string {
    const saveScope = scope === '/sunmark-web/' ? '/ancient-persia-game/' : scope;
    return `ancient-persia.match.v1:${saveScope}`;
}

export function decodeSave(raw: string): SavedMatch | null {
    try {
        if (raw.length > 1_000_000) return null;
        const value: unknown = JSON.parse(raw);
        if (
            !record(value) ||
            ![1, 2].includes(Number(value.version)) ||
            !validGameState(value.state)
        )
            return null;
        const state = value.state;
        if (
            value.progressionId !== undefined &&
            (typeof value.progressionId !== 'string' ||
                !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    value.progressionId,
                ))
        )
            return null;
        if (
            value.buildGoal !== undefined &&
            value.buildGoal !== null &&
            (typeof value.buildGoal !== 'string' ||
                !['road', 'settlement', 'city'].includes(value.buildGoal))
        )
            return null;
        if (value.trading !== undefined && !validTrading(value.trading, state)) return null;
        if (
            value.rivals !== undefined &&
            (!validRivalMemory(value.rivals) || value.rivals.lastRound > state.turn)
        )
            return null;
        if (
            value.humanPlayerId !== undefined &&
            !state.players.some((player) => player.id === value.humanPlayerId)
        )
            return null;
        const memory = value.tutorial;
        if (
            !record(memory) ||
            typeof memory.enabled !== 'boolean' ||
            typeof memory.replaying !== 'boolean'
        )
            return null;
        for (const key of ['seen', 'practiced', 'queue']) {
            const ids = memory[key];
            if (
                !Array.isArray(ids) ||
                ids.length > Object.keys(LESSONS).length ||
                new Set(ids).size !== ids.length ||
                !ids.every(
                    (id) =>
                        typeof id === 'string' && Object.prototype.hasOwnProperty.call(LESSONS, id),
                )
            )
                return null;
        }
        if (!memory.enabled && !memory.replaying && (memory.queue as unknown[]).length) return null;
        if (
            !Array.isArray(value.history) ||
            value.history.length > 100 ||
            !value.history.every(
                (event) =>
                    record(event) &&
                    integer(event.id, 1) &&
                    integer(event.turn, 1, state.turn) &&
                    label(event.player, 80) &&
                    label(event.text),
            )
        )
            return null;
        const saved = value as unknown as SavedMatch;
        if (!saved.state.development && saved.state.phase !== 'finished') {
            // Modern rules already reject an over-supply legacy network. Check before
            // exponential trail evaluation rather than calculating an unusable title.
            if (
                saved.state.players.some(
                    (p) =>
                        Object.values(saved.state.board.edges).filter(
                            (e) => e.road?.ownerId === p.id,
                        ).length > 15,
                )
            )
                return null;
            let seed = 0x6d2b79f5;
            for (const char of raw) seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
            const random = () => {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                return seed / 2 ** 32;
            };
            let upgraded = refreshAwards({
                ...saved.state,
                victoryTarget: 10,
                development: createDevelopment(saved.state.players, random),
                robberResolution: null,
                roadBuilding: null,
            });
            if (upgraded.phase === 'robber') upgraded = beginRobber(upgraded, 'seven', 'actions');
            if (!validGameState(upgraded)) return null;
            return { ...saved, version: 2, state: upgraded };
        }
        return saved;
    } catch {
        return null;
    }
}

/** Synchronous, atomic small snapshots: no dependency on unload events to save a move. */
export class MatchStore {
    status: SaveStatus = 'empty';
    private previous = '';
    constructor(
        private storage: SaveStorage | null,
        private key = 'ancient-persia.match.v1',
    ) {}

    read(): SavedMatch | null {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = this.storage.getItem(this.key);
            if (!raw) return null;
            const value = decodeSave(raw);
            this.status = value ? 'saved' : 'invalid';
            if (value) this.previous = raw;
            return value;
        } catch {
            this.status = 'unavailable';
            return null;
        }
    }
    write(value: SavedMatch): void {
        try {
            if (!this.storage) throw new Error('Storage unavailable');
            const raw = JSON.stringify(value);
            if (raw !== this.previous || this.status !== 'saved')
                this.storage.setItem(this.key, raw);
            this.previous = raw;
            this.status = 'saved';
        } catch {
            this.status = 'unavailable';
        }
    }
}
