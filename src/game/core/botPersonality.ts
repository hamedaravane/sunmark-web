import type { ResourceType } from './types';

export type BotPersonality = 'balanced' | 'mithra' | 'ashi' | 'spenta-armaiti';

/** Strategy weights only. Personalities never alter costs, randomness, or legal targets. */
export const BOT_POLICIES: Record<
    BotPersonality,
    {
        port: number;
        variety: number;
        resources: Partial<Record<ResourceType, number>>;
        settlementFirst: boolean;
        leaderPressure: number;
    }
> = {
    balanced: { port: 2, variety: 2, resources: {}, settlementFirst: false, leaderPressure: 1 },
    mithra: {
        port: 1,
        variety: 2,
        resources: { wood: 1.45, brick: 1.45 },
        settlementFirst: true,
        leaderPressure: 2,
    },
    ashi: {
        port: 9,
        variety: 3,
        resources: { wool: 1.2, wheat: 1.2 },
        settlementFirst: true,
        leaderPressure: 1,
    },
    'spenta-armaiti': {
        port: 1,
        variety: 1,
        resources: { wheat: 1.6, stone: 1.8 },
        settlementFirst: false,
        leaderPressure: 0.5,
    },
};
