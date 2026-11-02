import { createGame } from '../../src/game/core/game';
import {
    getSetupTargets,
    isSetup,
    placeInitialPiece,
    rollForStart,
    setupPlacementType,
} from '../../src/game/core/setup';
import type { GameState, RandomSource } from '../../src/game/core/types';
import type { GameSession } from '../../src/game/ui/session';

/** Existing post-opening tests enter play through real setup commands, not a hidden game mode. */
export function createReadyGame(names: string[], random: RandomSource = Math.random): GameState {
    let state = createGame(names, random);
    let steps = 0;
    while (isSetup(state)) {
        if (++steps > 40) throw new Error('Fixture opening stalled');
        const type = setupPlacementType(state);
        const result = type
            ? placeInitialPiece(state, type, openingTarget(state))
            : rollForStart(state, () => (state.activePlayerIndex === 0 ? 0.99 : 0.01));
        if (!result.ok) throw new Error(result.reason);
        state = result.state;
    }
    return state;
}

function openingTarget(state: GameState): string {
    const targets = getSetupTargets(state);
    if (state.phase === 'setup-road') return targets[0];
    const occupied = Object.values(state.board.vertices).filter((v) => v.building);
    const distance = (id: string) => {
        const v = state.board.vertices[id];
        return occupied.length
            ? Math.min(...occupied.map((o) => (o.x - v.x) ** 2 + (o.y - v.y) ** 2))
            : v.x * v.x + v.y * v.y;
    };
    return targets.sort((a, b) => distance(b) - distance(a))[0];
}

function dismissDialogue(session: GameSession): void {
    for (let i = 0; i < 50; i++) {
        if (session.sheet?.kind === 'tutorial') session.continueTutorial();
        else if (session.rivalReady) session.presentRival();
        else if (session.sheet?.kind === 'rival-dialogue') session.continueRival();
        else return;
    }
    throw new Error('Fixture dialogue stalled');
}

export function completeSessionSetup(session: GameSession): void {
    let steps = 0;
    while (session.state && isSetup(session.state)) {
        if (++steps > 120) throw new Error('Session fixture opening stalled');
        dismissDialogue(session);
        const previousRandom = Math.random;
        // Seat zero wins unambiguously; tests restore their own dice source immediately.
        Math.random = () => (session.state!.activePlayerIndex === 0 ? 0.99 : 0.01);
        try {
            if (session.isHumanTurn) {
                if (session.placement) {
                    session.preview(openingTarget(session.state));
                    dismissDialogue(session);
                }
                session.primary();
            } else session.advanceBot();
        } finally {
            Math.random = previousRandom;
        }
    }
}
