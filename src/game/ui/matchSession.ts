import type { PresentedTransition } from './transitions';
import type { GameSession } from './session';
import type { MatchState } from './matchState';
import type { PlayerTrading } from './playerTrading';
import type { ProgressionStore } from '../progression/progression';

/** Both authorities drive the same HUD, sheets, renderer and input vocabulary. */
export type MatchSession = Omit<
    GameSession,
    'state' | 'trading' | 'transition' | 'advanceBot' | 'botReady' | 'start' | 'progression'
> & {
    readonly transition: PresentedTransition | null;
    readonly state: MatchState | null;
    readonly progression?: ProgressionStore;
    readonly trading: Pick<
        PlayerTrading,
        | 'give'
        | 'want'
        | 'target'
        | 'parentId'
        | 'composing'
        | 'reviewId'
        | 'message'
        | 'allowed'
        | 'waitingForHuman'
        | 'targets'
        | 'draftError'
        | 'adjust'
        | 'selectTarget'
        | 'send'
        | 'edit'
        | 'respond'
        | 'review'
        | 'withdraw'
        | 'finish'
        | 'errorFor'
    > & {
        table: Pick<PlayerTrading['table'], 'offers' | 'find'>;
    };
    readonly online?: {
        connected: boolean;
        busy: boolean;
        pending: boolean;
        matchId?: string;
        retry(): void;
    };
};
