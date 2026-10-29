import type { GameCommand } from '../core/commands';
import type { ProductionGrant } from '../core/production';
import type { GameState } from '../core/types';
import type { MatchState } from './matchState';

export type MatchAction = GameCommand;

/** One confirmed command, consumed once by presentation. Never an animation callback. */
export interface MatchTransition<S extends MatchState = GameState, A = MatchAction> {
    id: number;
    action: A;
    before: S;
    after: S;
    production: ProductionGrant[];
}

export type PresentedTransition = MatchTransition<
    MatchState,
    MatchAction | { kind: 'synchronize' }
>;
