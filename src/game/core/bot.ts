import { developmentBuyError, developmentPlayError } from './development';
import { resourceCount, resolutionActor } from './robber';
import { getPublicVictoryPoints } from './scoring';
import { getSetupTargets, setupPlacementType } from './setup';
import { BUILD_COSTS, canAfford, type BuildType } from './building';
import type { GameCommand } from './commands';
import { getBuildOption, getProductionProbability } from './queries';
import { getVictoryPoints } from './game';
import { getBankTradeRatio } from './ports';
import { RESOURCE_TYPES, type GameState } from './types';
import { BOT_POLICIES, type BotPersonality } from './botPersonality';

function siteValue(state: GameState, vertexId: string, personality: BotPersonality): number {
    const policy = BOT_POLICIES[personality];
    const vertex = state.board.vertices[vertexId];
    const tiles = state.board.tiles.filter((t) => vertex.tileIds.includes(t.id) && t.resource);
    const production = tiles.reduce(
        (sum, tile) =>
            sum +
            getProductionProbability(tile.number!).outcomes *
                (policy.resources[tile.resource!] ?? 1),
        0,
    );
    const variety = new Set(tiles.map((t) => t.resource)).size;
    const port = state.board.ports.some((p) =>
        state.board.edges[p.edgeId].vertexIds.includes(vertexId),
    );
    return production + variety * policy.variety + (port ? policy.port : 0);
}

/** Find a useful expansion path, never build roads just to spend spare resources. */
export function expansionRoad(
    state: GameState,
    personality: BotPersonality = 'balanced',
): string | null {
    const { board } = state;
    const owner = state.players[state.activePlayerIndex].id;
    const distances = new Map<string, { distance: number; firstEdge: string | null }>();
    const queue: string[] = [];
    for (const vertex of Object.values(board.vertices)) {
        if (vertex.building && vertex.building.ownerId !== owner) continue;
        if (
            vertex.building?.ownerId === owner ||
            vertex.edgeIds.some((id) => board.edges[id].road?.ownerId === owner)
        ) {
            distances.set(vertex.id, { distance: 0, firstEdge: null });
            queue.push(vertex.id);
        }
    }
    for (let i = 0; i < queue.length; i++) {
        const id = queue[i];
        const path = distances.get(id)!;
        for (const edgeId of board.vertices[id].edgeIds) {
            const edge = board.edges[edgeId];
            if (edge.road) continue;
            const next = edge.vertexIds.find((v) => v !== id)!;
            if (distances.has(next) || board.vertices[next].building) continue;
            distances.set(next, {
                distance: path.distance + 1,
                firstEdge: path.firstEdge ?? edgeId,
            });
            queue.push(next);
        }
    }
    return (
        [...distances]
            .filter(
                ([id, path]) =>
                    path.firstEdge &&
                    !board.vertices[id].building &&
                    board.vertices[id].neighborIds.every((n) => !board.vertices[n].building),
            )
            .sort(
                ([a, pa], [b, pb]) =>
                    (siteValue(state, b, personality) + 1) / pb.distance -
                    (siteValue(state, a, personality) + 1) / pa.distance,
            )[0]?.[1].firstEdge ?? null
    );
}

/** Deterministic, modest opponents: public board + own inventory, no dice/hand cheating. */
export function chooseBotCommand(
    state: GameState,
    personality: BotPersonality = 'balanced',
): GameCommand | null {
    const policy = BOT_POLICIES[personality];
    if (state.phase === 'finished') return null;
    if (state.phase === 'setup-roll') return { kind: 'setup-roll' };
    const openingType = setupPlacementType(state);
    if (openingType) {
        const targets = getSetupTargets(state);
        const value = (id: string) =>
            openingType === 'settlement'
                ? siteValue(state, id, personality)
                : Math.max(
                      ...state.board.edges[id].vertexIds.map((v) =>
                          Math.max(
                              ...state.board.vertices[v].neighborIds
                                  .filter((n) => !state.board.vertices[n].building)
                                  .map((n) => siteValue(state, n, personality)),
                              0,
                          ),
                      ),
                  );
        targets.sort((a, b) => value(b) - value(a));
        return targets.length ? { kind: 'setup', type: openingType, targetId: targets[0] } : null;
    }
    if (state.phase === 'discard') {
        const playerId = resolutionActor(state);
        const hand = { ...state.players.find((p) => p.id === playerId)!.resources };
        const resources = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
        for (let n = 0; n < state.robberResolution!.discards[playerId]; n++) {
            const r = [...RESOURCE_TYPES].sort((a, b) => hand[b] - hand[a])[0];
            resources[r]++;
            hand[r]--;
        }
        return { kind: 'discard', playerId, resources };
    }
    const player = state.players[state.activePlayerIndex];
    if (
        ['roll', 'actions'].includes(state.phase) &&
        getVictoryPoints(state, player.id) >= state.victoryTarget
    )
        return { kind: 'declare-victory' };
    if (state.phase === 'steal')
        return {
            kind: 'steal',
            victimId: [...state.robberResolution!.victims].sort(
                (a, b) =>
                    resourceCount(state.players.find((p) => p.id === b)!.resources) -
                    resourceCount(state.players.find((p) => p.id === a)!.resources),
            )[0],
        };
    if (state.phase === 'road-building')
        return {
            kind: 'build',
            type: 'road',
            targetId:
                expansionRoad(state, personality) ??
                getBuildOption(state, 'road').legalTargetIds[0],
        };
    const card = state.development?.hands[player.id].find(
        (c) => !developmentPlayError(state, c.id),
    );
    if (card) {
        const wanted = [...RESOURCE_TYPES].sort(
            (a, b) =>
                BUILD_COSTS.city[b] +
                BUILD_COSTS.settlement[b] -
                player.resources[b] -
                (BUILD_COSTS.city[a] + BUILD_COSTS.settlement[a] - player.resources[a]),
        );
        return {
            kind: 'play-development',
            cardId: card.id,
            choice:
                card.kind === 'monopoly'
                    ? { resource: wanted[0] }
                    : card.kind === 'year-of-plenty'
                      ? { resources: [wanted[0], wanted[1]] }
                      : {},
        };
    }
    if (state.phase === 'roll') return { kind: 'roll' };
    if (state.phase === 'robber') {
        const value = (id: string) => {
            const tile = state.board.tiles.find((t) => t.id === id)!;
            if (!tile.number) return 0;
            return tile.vertexIds.reduce((sum, vertexId) => {
                const building = state.board.vertices[vertexId].building;
                if (!building) return sum;
                const leader = getPublicVictoryPoints(state, building.ownerId);
                return (
                    sum +
                    (building.ownerId === player.id
                        ? -4
                        : 1 + (policy.leaderPressure * leader) / state.victoryTarget) *
                        (building.type === 'city' ? 2 : 1) *
                        getProductionProbability(tile.number!).outcomes
                );
            }, 0);
        };
        const target = state.board.tiles
            .filter((t) => !t.robber)
            .sort((a, b) => value(b.id) - value(a.id))[0];
        return { kind: 'robber', targetId: target.id };
    }
    const city = getBuildOption(state, 'city');
    const settlement = getBuildOption(state, 'settlement');
    const bestSite = (ids: string[]) =>
        [...ids].sort(
            (a, b) => siteValue(state, b, personality) - siteValue(state, a, personality),
        )[0];
    if (policy.settlementFirst && !settlement.reason)
        return { kind: 'build', type: 'settlement', targetId: bestSite(settlement.legalTargetIds) };
    if (!city.reason)
        return { kind: 'build', type: 'city', targetId: bestSite(city.legalTargetIds) };
    if (!settlement.reason)
        return { kind: 'build', type: 'settlement', targetId: bestSite(settlement.legalTargetIds) };
    // Save a settlement's wood/brick instead of extending roads past a ready site.
    const road = settlement.legalTargetIds.length ? null : expansionRoad(state, personality);
    if (road && canAfford(player, BUILD_COSTS.road))
        return { kind: 'build', type: 'road', targetId: road };
    const goals: BuildType[] = [];
    if (settlement.legalTargetIds.length) goals.push('settlement');
    if (city.legalTargetIds.length) goals.push('city');
    if (road) goals.push('road');
    const missing = (type: BuildType) =>
        RESOURCE_TYPES.reduce(
            (sum, r) => sum + Math.max(0, BUILD_COSTS[type][r] - player.resources[r]),
            0,
        );
    goals.sort(
        (a, b) =>
            missing(a) - missing(b) ||
            (personality === 'balanced'
                ? 0
                : policy.settlementFirst
                  ? Number(a !== 'settlement') - Number(b !== 'settlement')
                  : Number(a !== 'city') - Number(b !== 'city')),
    );
    for (const goal of goals) {
        const cost = BUILD_COSTS[goal];
        for (const receive of RESOURCE_TYPES.filter((r) => player.resources[r] < cost[r])) {
            const give = [...RESOURCE_TYPES]
                .sort((a, b) =>
                    personality === 'ashi'
                        ? getBankTradeRatio(state.board, player.id, a) -
                              getBankTradeRatio(state.board, player.id, b) ||
                          player.resources[b] - player.resources[a]
                        : 0,
                )
                .find(
                    (r) =>
                        r !== receive &&
                        player.resources[r] - cost[r] >=
                            getBankTradeRatio(state.board, player.id, r),
                );
            if (give)
                return {
                    kind: 'trade',
                    give,
                    receive,
                    ratio: getBankTradeRatio(state.board, player.id, give),
                };
        }
    }
    if (!developmentBuyError(state)) return { kind: 'buy-development' };
    return { kind: 'end-turn' };
}
