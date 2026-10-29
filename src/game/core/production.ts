import type { GameState, ResourceType } from './types';

export interface ProductionGrant {
    tileId: string;
    playerId: string;
    resource: ResourceType;
    amount: number;
}

/** The same production ledger drives payment and its presentation. No state is changed. */
export function getProduction(
    state: { board: GameState['board']; players: Pick<GameState['players'][number], 'id'>[] },
    total: number,
): ProductionGrant[] {
    if (total === 7) return [];
    const players = new Set(state.players.map(({ id }) => id));
    const grants: ProductionGrant[] = [];
    for (const tile of state.board.tiles) {
        if (tile.number !== total || tile.robber || tile.resource === null) continue;
        const amounts = new Map<string, number>();
        for (const vertexId of tile.vertexIds) {
            const building = state.board.vertices[vertexId].building;
            if (!building || !players.has(building.ownerId)) continue;
            amounts.set(
                building.ownerId,
                (amounts.get(building.ownerId) ?? 0) + (building.type === 'city' ? 2 : 1),
            );
        }
        for (const [playerId, amount] of amounts)
            grants.push({ tileId: tile.id, playerId, resource: tile.resource, amount });
    }
    return grants;
}
