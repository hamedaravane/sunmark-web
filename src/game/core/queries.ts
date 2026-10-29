import { getVictoryPoints } from './scoring';
import { BUILD_COSTS, getPlacementError, type BuildType, type ResourceCost } from './building';
import { RESOURCE_TYPES, type GameState, type Player, type ResourceType } from './types';

export interface BuildOption {
    type: BuildType;
    cost: ResourceCost;
    missing: Record<ResourceType, number>;
    legalTargetIds: string[];
    reason:
        | 'wrong-phase'
        | 'game-finished'
        | 'insufficient-resources'
        | 'no-legal-targets'
        | 'road-supply'
        | null;
}

export function getBuildOption(
    state: Pick<GameState, 'board' | 'phase' | 'activePlayerIndex'> & {
        players: (Pick<Player, 'id'> & Partial<Pick<Player, 'resources'>>)[];
    },
    type: BuildType,
    playerId = state.players[state.activePlayerIndex].id,
    knownHand?: Record<ResourceType, number>,
): BuildOption {
    const player = state.players.find((p) => p.id === playerId)!;
    const hand = knownHand ?? player.resources;
    if (!hand) throw new Error('Build planning requires the viewer hand');
    const cost = BUILD_COSTS[type];
    const missing = Object.fromEntries(
        RESOURCE_TYPES.map((resource) => [resource, Math.max(0, cost[resource] - hand[resource])]),
    ) as Record<ResourceType, number>;
    const ids = Object.keys(type === 'road' ? state.board.edges : state.board.vertices);
    const legalTargetIds =
        type === 'road' &&
        Object.values(state.board.edges).filter((e) => e.road?.ownerId === player.id).length >= 15
            ? []
            : ids.filter((id) => getPlacementError(state.board, player.id, type, id) === null);
    const reason =
        state.phase === 'finished'
            ? 'game-finished'
            : state.phase !== 'actions' || state.players[state.activePlayerIndex].id !== playerId
              ? 'wrong-phase'
              : type === 'road' &&
                  Object.values(state.board.edges).filter((e) => e.road?.ownerId === player.id)
                      .length >= 15
                ? 'road-supply'
                : RESOURCE_TYPES.some((resource) => missing[resource] > 0)
                  ? 'insufficient-resources'
                  : legalTargetIds.length === 0
                    ? 'no-legal-targets'
                    : null;
    return { type, cost, missing, legalTargetIds, reason };
}

export function getPlayerSummary(state: GameState, playerId: string, viewerId?: string) {
    const player = state.players.find(({ id }) => id === playerId)!;
    const buildings = Object.values(state.board.vertices).filter(
        ({ building }) => building?.ownerId === playerId,
    );
    return {
        score: getVictoryPoints(state, playerId, viewerId === playerId),
        resources: RESOURCE_TYPES.reduce(
            (total, resource) => total + player.resources[resource],
            0,
        ),
        roads: Object.values(state.board.edges).filter(({ road }) => road?.ownerId === playerId)
            .length,
        settlements: buildings.filter(({ building }) => building?.type === 'settlement').length,
        cities: buildings.filter(({ building }) => building?.type === 'city').length,
    };
}

export function getProductionProbability(number: number): { outcomes: number; total: number } {
    return { outcomes: Math.max(0, 6 - Math.abs(7 - number)), total: 36 };
}
