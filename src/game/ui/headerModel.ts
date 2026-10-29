import { remoteState } from './matchState';
import { getPlayerSummary } from './matchState';
import type { MatchState } from './matchState';
import { avatarForSeat } from './playerIdentity';
import type { UiBox } from './graphicsTheme';

export function matchAvatar(state: MatchState, id: string, humanId: string) {
    return remoteState(state) && !state.bots[id]
        ? ('human' as const)
        : avatarForSeat(
              state.players.findIndex((p) => p.id === id),
              state.players.findIndex((p) => p.id === humanId),
          );
}
export function matchBot(state: MatchState, id: string, humanId: string) {
    return remoteState(state) ? !!state.bots[id] : id !== humanId;
}

/** Public standings only; exact opponent hands never enter the header projection. */
export function headerPlayers(state: MatchState, humanId: string) {
    const scores = state.players.map((p) => getPlayerSummary(state, p.id, humanId).score);
    const publicScores = state.players.map((p) => getPlayerSummary(state, p.id).score);
    const highest = Math.max(...publicScores);
    return state.players.map((p, seat) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: scores[seat],
        rank: 1 + publicScores.filter((score) => score > publicScores[seat]).length,
        leading: highest > 0 && publicScores[seat] === highest,
        active: state.phase !== 'finished' && seat === state.activePlayerIndex,
        human: p.id === humanId,
        avatar: matchAvatar(state, p.id, humanId),
        bot: matchBot(state, p.id, humanId),
    }));
}

/** Controls stay below safe insets; the header material reaches the canvas edges. */
export function headerBackdrop(box: UiBox, canvasWidth: number): UiBox {
    return { x: 0, y: 0, width: canvasWidth, height: Math.max(0, box.y + box.height) };
}
