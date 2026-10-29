import type { GameState, Player, ResourceType, RuleErrorCode } from '../core/types';
import type { BuildType } from '../core/building';
import * as queries from '../core/queries';
import * as development from '../core/development';
import { getVictoryPoints as localPoints } from '../core/scoring';
import { getBankTradeError as localTradeError } from '../core/game';
import { resolutionActor as localActor } from '../core/robber';
import { getBankTradeRates } from '../core/ports';
import type { GameView } from '../../online/shared/src/online/wire';

/** A remote view is deliberately not a GameState: unknown hands/deck never exist here. */
export interface RemoteMatchState extends Pick<
    GameState,
    'board' | 'phase' | 'turn' | 'lastRoll' | 'winnerId' | 'victoryTarget' | 'setup' | 'awards'
> {
    projection: GameView;
    bots: Record<string, boolean>;
    players: Pick<Player, 'id' | 'name' | 'color'>[];
    activePlayerIndex: number;
    development: {
        deckCount: number;
        hands: NonNullable<GameState['development']>['hands'];
        knights: Record<string, number>;
    };
    robberResolution: {
        discards: Record<string, number>;
        victims: string[];
        source?: 'seven' | 'knight';
    } | null;
    roadBuilding: null;
}
export type MatchState = GameState | RemoteMatchState;
export const remoteState = (state: MatchState): state is RemoteMatchState => 'projection' in state;
export const isSetup = (state: MatchState) => state.phase.startsWith('setup-');
export const resolutionActor = (state: MatchState) =>
    remoteState(state) ? state.projection.actorId : localActor(state);
export function viewerResources(state: MatchState, id: string): Record<ResourceType, number> {
    if (!remoteState(state)) return state.players.find((p) => p.id === id)!.resources;
    if (id !== state.projection.self.id) throw new Error('Opponent resources are private');
    return state.projection.self.resources;
}
export function getVictoryPoints(state: MatchState, id: string, includePrivate = true): number {
    if (!remoteState(state)) return localPoints(state, id, includePrivate);
    return includePrivate && id === state.projection.self.id
        ? state.projection.self.score
        : state.projection.players.find((p) => p.id === id)!.publicScore;
}
export function getPlayerSummary(state: MatchState, id: string, viewerId?: string) {
    if (!remoteState(state)) return queries.getPlayerSummary(state, id, viewerId);
    const player = state.projection.players.find((p) => p.id === id)!;
    const buildings = Object.values(state.board.vertices).filter((v) => v.building?.ownerId === id);
    return {
        score: getVictoryPoints(state, id, viewerId === id),
        resources: player.resourceCount,
        roads: Object.values(state.board.edges).filter((e) => e.road?.ownerId === id).length,
        settlements: buildings.filter((v) => v.building?.type === 'settlement').length,
        cities: buildings.filter((v) => v.building?.type === 'city').length,
    };
}
export function getBuildOption(
    state: MatchState,
    type: BuildType,
    playerId = remoteState(state)
        ? state.projection.self.id
        : state.players[state.activePlayerIndex].id,
    hand?: Record<ResourceType, number>,
): queries.BuildOption {
    return queries.getBuildOption(
        state,
        type,
        playerId,
        hand ?? (remoteState(state) ? viewerResources(state, playerId) : undefined),
    );
}

export function developmentPlayError(state: MatchState, cardId: string): RuleErrorCode | null {
    if (!remoteState(state)) return development.developmentPlayError(state, cardId);
    const card = state.projection.self.developmentCards.find((c) => c.id === cardId);
    if (!card || card.kind === 'victory-point') return 'invalid-card';
    if (card.boughtOnRound >= state.turn) return 'card-too-new';
    return state.projection.availableIntents.some(
        (i) => i.kind === 'play-development' && i.cardId === cardId,
    )
        ? null
        : 'wrong-phase';
}
export function developmentBuyError(state: MatchState): RuleErrorCode | null {
    if (!remoteState(state)) return development.developmentBuyError(state);
    return state.projection.availableIntents.some((i) => i.kind === 'buy-development')
        ? null
        : !state.development.deckCount
          ? 'deck-empty'
          : state.phase !== 'actions'
            ? 'wrong-phase'
            : 'insufficient-resources';
}
export function getBankTradeError(
    state: MatchState,
    give: ResourceType,
    receive: ResourceType,
    ratio: 2 | 3 | 4,
): RuleErrorCode | null {
    if (!remoteState(state)) return localTradeError(state, give, receive, ratio);
    if (state.phase !== 'actions' || state.projection.activePlayerId !== state.projection.self.id)
        return 'wrong-phase';
    if (give === receive) return 'same-resource-trade';
    if (!getBankTradeRates(state.board, state.projection.self.id, give).includes(ratio))
        return 'invalid-trade-ratio';
    return state.projection.self.resources[give] < ratio ? 'insufficient-resources' : null;
}

export const developmentDeckCount = (state: MatchState) =>
    remoteState(state) ? state.development.deckCount : (state.development?.deck.length ?? 0);
