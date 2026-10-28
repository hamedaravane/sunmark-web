import { createGame } from '../src/game/core/game';
import { chooseBotCommand } from '../src/game/core/bot';
import type { GameState } from '../src/game/core/types';
import { commandEnvelopeSchema } from '../src/online/shared/src/game/protocol';
import type { GameView } from '../src/online/shared/src/online/wire';
import type { Intent } from '../src/online/client';
/** Test planner uses public board/standings and this seat's private hand only.
 * Opponent resource inventories are deliberately empty placeholders. */
export function plan(view: GameView): Intent {
    const initial = createGame(
        view.players.map((p) => p.name),
        () => 0.42,
    );
    const dev = initial.development;
    if (!dev) throw new Error('Missing test deck');
    const state: GameState = {
        ...initial,
        board: view.board,
        players: view.players.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            resources:
                p.id === view.self.id
                    ? { ...view.self.resources }
                    : { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 },
        })),
        activePlayerIndex: view.players.findIndex((p) => p.id === view.activePlayerId),
        turn: view.turn,
        phase: view.phase,
        lastRoll: view.lastRoll,
        winnerId: view.winnerId,
        setup: view.setup ?? null,
        awards: view.awards ?? { longestRoad: null, largestArmy: null },
        robberResolution: {
            source: 'seven',
            returnPhase: 'actions',
            discards: view.discardObligations,
            victims: view.eligibleVictims,
        },
        roadBuilding: { remaining: 1, returnPhase: 'actions' },
        development: {
            deck: dev.deck.slice(0, view.developmentDeckCount),
            discard: [],
            hands: Object.fromEntries(
                view.players.map((p) => [
                    p.id,
                    p.id === view.self.id ? view.self.developmentCards : [],
                ]),
            ),
            knights: Object.fromEntries(view.players.map((p) => [p.id, p.playedKnights])),
            playedThisTurn: !view.availableIntents.some((i) => i.kind === 'play-development'),
        },
    };
    const command = chooseBotCommand(state);
    if (!command || command.kind === 'domestic-trade') throw new Error('No test move');
    if (command.kind === 'discard') return { kind: 'discard', resources: command.resources };
    // Validate the planner's wire payload, without accepting any fabricated state.
    const parsed = commandEnvelopeSchema.parse({
        protocolVersion: 1,
        matchId: 'test',
        commandId: crypto.randomUUID(),
        expectedRevision: 0,
        intent: command,
    });
    return parsed.intent;
}
