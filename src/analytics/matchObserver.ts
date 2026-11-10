import type { MatchSession } from '../game/ui/matchSession';
import { resolutionActor } from '../game/ui/matchState';
import { LESSONS } from '../game/tutorial/lessons.fa';
import type { EventContext, EventName } from './recorder';

/** Projects a strict, small set of diagnostics, never commands, hands, names or board snapshots. */
export function observeMatch(
    session: MatchSession,
    emit: (name: EventName, data: EventContext) => void,
    visible = () => true,
    uuid = () => crypto.randomUUID(),
) {
    let runId: string | undefined;
    let phase = '',
        screen = '',
        error = '',
        lesson: MatchSession['tutorial']['current'] = null;
    let transition = -1;
    let connected: boolean | undefined;
    let wasVisible = false;
    let activeMode: EventContext['mode'] = 'offline';
    let finished = false;
    let practiceComplete = false;
    const refresh = () => {
        if (!visible()) {
            wasVisible = false;
            return;
        }
        if (!wasVisible) screen = '';
        wasVisible = true;
        const state = session.state;
        const mode = !state
            ? 'hub'
            : session.practice
              ? 'practice'
              : session.online
                ? 'online'
                : 'offline';
        const context: EventContext = {
            mode,
            ...(!session.online && !session.practice && session.savedMatch?.progressionId
                ? { matchId: session.savedMatch.progressionId }
                : {}),
            ...(runId ? { runId } : {}),
            ...(state ? { phase: state.phase } : {}),
        };
        if (state && !runId) {
            activeMode = mode;
            runId = uuid();
            context.runId = runId;
            finished = false;
            practiceComplete = false;
            emit('match_entered', context);
        }
        if (!state && runId) {
            if (!finished) emit('match_left', { ...context, mode: activeMode });
            runId = undefined;
            phase = '';
            transition = -1;
        }
        if (state && state.phase !== phase) {
            phase = state.phase;
            emit('phase_changed', { ...context, phase: state.phase });
            if (state.phase === 'finished') {
                finished = true;
                emit('match_finished', {
                    ...context,
                    ...(state && !session.online
                        ? { won: state.winnerId === session.humanPlayer?.id, turn: state.turn }
                        : {}),
                });
            }
        }
        if (session.practice?.stage === 'complete' && !practiceComplete) {
            practiceComplete = true;
            finished = true;
            emit('match_finished', context);
        }
        const kind = session.sheet?.kind;
        const nextScreen = !state
            ? 'hub'
            : kind === 'build'
              ? 'construction'
              : kind === 'trade' || kind === 'domestic'
                ? 'trade'
                : kind === 'development'
                  ? 'development'
                  : kind === 'tutorial'
                    ? 'tutorial'
                    : kind === 'results'
                      ? 'results'
                      : kind === 'profile' || kind === 'online-profile'
                        ? 'profile'
                        : kind === 'achievements' || kind === 'online-achievements'
                          ? 'achievements'
                          : kind === 'cosmetics' || kind === 'online-cosmetics'
                            ? 'cosmetics'
                            : kind === 'experience'
                              ? 'settings'
                              : kind
                                ? 'other'
                                : 'board';
        if (screen !== nextScreen) {
            screen = nextScreen;
            emit('screen_view', { ...context, screen: nextScreen });
        }
        const current = kind === 'tutorial' ? session.tutorial.current : null;
        if (current !== lesson) {
            if (lesson)
                emit(
                    session.tutorial.seen.has(lesson) ? 'tutorial_acknowledged' : 'tutorial_closed',
                    { ...context, lesson: Object.keys(LESSONS).indexOf(lesson) },
                );
            lesson = current;
            if (current)
                emit('tutorial_shown', {
                    ...context,
                    lesson: Object.keys(LESSONS).indexOf(current),
                });
        }
        const change = session.transition;
        if (change && change.id !== transition) {
            transition = change.id;
            if (
                change.action.kind !== 'synchronize' &&
                resolutionActor(change.before) === session.humanPlayer?.id
            )
                emit('action_confirmed', {
                    ...context,
                    action: change.action.kind,
                    ...(change.action.kind === 'build' ? { building: change.action.type } : {}),
                });
        }
        if (session.error && session.error !== error) emit('action_rejected', context);
        error = session.error ?? '';
        if (session.online && connected !== session.online.connected) {
            connected = session.online.connected;
            emit('connection_changed', { ...context, connected });
        }
    };
    const safeRefresh = () => {
        try {
            refresh();
        } catch {
            /* Diagnostics never interrupt gameplay. */
        }
    };
    const disconnect = session.subscribe(safeRefresh);
    safeRefresh();
    return {
        refresh: safeRefresh,
        destroy: () => {
            disconnect();
            try {
                if (runId && !finished)
                    emit('match_left', {
                        mode: session.online ? 'online' : session.practice ? 'practice' : 'offline',
                        runId,
                    });
            } catch {
                /* Optional diagnostics must not interrupt teardown. */
            }
        },
    };
}
