import { viewerResources } from './matchState';
import { getVictoryPoints } from './matchState';
import type { BuildType } from '../core/building';
import { RESOURCE_TYPES } from '../core/types';
import type { PresentedTransition as MatchTransition } from './transitions';

export type FeedbackCue =
    | 'road'
    | 'settlement'
    | 'city'
    | 'point'
    | 'victory'
    | 'resources'
    | 'trade'
    | 'warning'
    | 'loss'
    | 'development'
    | 'roll'
    | 'turn';

export interface FeedbackEvent {
    cue: FeedbackCue;
    /** Opponent actions are quieter and never vibrate the human's device. */
    personal: boolean;
    construction?: BuildType;
}

/** One cue per committed command. Payments are never described as resource losses. */
export function feedbackEvent(t: MatchTransition, humanId: string): FeedbackEvent | null {
    const { before, after, action } = t;
    const actor = before.players[before.activePlayerIndex].id;
    const human = after.players.some((p) => p.id === humanId)
        ? viewerResources(after, humanId)
        : null;
    const previous = before.players.some((p) => p.id === humanId)
        ? viewerResources(before, humanId)
        : null;
    if (!human || !previous || before === after) return null;
    if (after.winnerId && !before.winnerId)
        return { cue: 'victory', personal: after.winnerId === humanId };
    const construction =
        action.kind === 'build' || action.kind === 'setup' ? action.type : undefined;
    if (getVictoryPoints(after, humanId) > getVictoryPoints(before, humanId))
        return { cue: 'point', personal: true, construction };
    // Never reveal an opponent's hidden VP card through its sound.
    if (
        actor !== humanId &&
        getVictoryPoints(after, actor, false) > getVictoryPoints(before, actor, false)
    )
        return { cue: 'point', personal: false, construction };
    if (action.kind === 'build' || action.kind === 'setup')
        return { cue: action.type, personal: actor === humanId };
    const lost = RESOURCE_TYPES.some((r) => human[r] < previous[r]);
    if (lost && ['discard', 'steal', 'play-development'].includes(action.kind))
        return { cue: 'loss', personal: true };
    if (
        action.kind === 'robber' ||
        (action.kind === 'roll' && after.lastRoll && after.lastRoll[0] + after.lastRoll[1] === 7)
    )
        return { cue: 'warning', personal: actor === humanId };
    if (
        (action.kind === 'trade' && actor === humanId) ||
        (action.kind === 'domestic-trade' && [action.terms.from, action.terms.to].includes(humanId))
    )
        return { cue: 'trade', personal: true };
    if (RESOURCE_TYPES.some((r) => human[r] > previous[r]))
        return { cue: 'resources', personal: true };
    if (['buy-development', 'play-development'].includes(action.kind) && actor === humanId)
        return { cue: 'development', personal: true };
    if (action.kind === 'roll' || action.kind === 'setup-roll')
        return { cue: 'roll', personal: actor === humanId };
    if (action.kind === 'end-turn' && after.players[after.activePlayerIndex].id === humanId)
        return { cue: 'turn', personal: true };
    return null;
}
