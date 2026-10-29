import type { RemoteMatchState } from '../game/ui/matchState';
import type { PresentedTransition } from '../game/ui/transitions';

/** Effects may describe a single public change, never infer hidden commands or replay a gap. */
export function publicAction(
    before: RemoteMatchState,
    after: RemoteMatchState,
): PresentedTransition['action'] {
    if (
        before.phase === 'setup-roll' &&
        JSON.stringify(before.setup?.lastRoll) !== JSON.stringify(after.setup?.lastRoll)
    )
        return { kind: 'setup-roll' };
    if (
        before.phase === 'roll' &&
        after.lastRoll &&
        (after.phase !== 'roll' ||
            JSON.stringify(before.lastRoll) !== JSON.stringify(after.lastRoll))
    )
        return { kind: 'roll' };
    const roads = Object.values(after.board.edges).filter(
        (e) => e.road && !before.board.edges[e.id]?.road,
    );
    const buildings = Object.values(after.board.vertices).filter(
        (v) => v.building && v.building.type !== before.board.vertices[v.id]?.building?.type,
    );
    if (roads.length + buildings.length === 1) {
        const kind = before.phase.startsWith('setup-') ? 'setup' : 'build';
        if (roads[0]) return { kind, type: 'road', targetId: roads[0].id };
        const vertex = buildings[0];
        if (vertex.building?.type === 'settlement')
            return { kind, type: 'settlement', targetId: vertex.id };
        return { kind: 'build', type: 'city', targetId: vertex.id };
    }
    const robber = after.board.tiles.find(
        (t) => t.robber && !before.board.tiles.find((b) => b.id === t.id)?.robber,
    );
    if (robber) return { kind: 'robber', targetId: robber.id };
    if (before.projection.activePlayerId !== after.projection.activePlayerId)
        return { kind: 'end-turn' };
    if (before.projection.developmentDeckCount - after.projection.developmentDeckCount === 1)
        return { kind: 'buy-development' };
    return { kind: 'synchronize' };
}
