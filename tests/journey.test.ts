import { expect, test } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { MatchStore, type SaveStorage } from '../src/game/persistence/matchStore';
import { siteDescription, resumeSummary, matchReflection } from '../src/game/ui/journey';
import { primaryAction } from '../src/game/ui/turnMarkup';

function storage(): SaveStorage {
    const values = new Map<string, string>();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
    };
}

test('practice continuation restores the exact saved board instead of replacing it', () => {
    const store = new MatchStore(storage(), 'journey-test');
    const session = new GameSession(store);
    session.start(4, false, 'بازیکن');
    session.returnToMenu();
    const before = structuredClone(session.savedMatch!.state);
    session.requestPlay(true);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    // Exercise the complete-stage handoff independently of the covered practice commands.
    session.practice!.stage = 'complete';
    session.state!.phase = 'actions';
    expect(primaryAction(session)?.action).toBe('practice-match');
    session.continueFromPractice();
    expect(session.practice).toBeNull();
    expect(session.state).toEqual(before);
});

test('incomplete practice cannot hand off, and new players enter guided setup', () => {
    const session = new GameSession();
    session.requestPlay(true);
    const practice = session.state;
    session.continueFromPractice();
    expect(session.state).toBe(practice);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    session.practice!.stage = 'complete';
    session.continueFromPractice();
    expect(session.sheet?.kind).toBe('player-name');
    session.confirmPlayerName();
    expect(session.state?.phase).toBe('setup-roll');
    expect(session.tutorial.enabled).toBe(true);
});

test('site explanations and reflection use board facts without changing the match', () => {
    const session = new GameSession();
    session.start(4, false);
    const state = session.state!;
    const before = structuredClone(state);
    const vertex = Object.values(state.board.vertices).find((v) => v.tileIds.length === 3)!;
    const description = siteDescription(state, session.humanPlayer!.id, vertex.id);
    expect(description).toContain('از ۳۶ حالت');
    expect(description).toContain('تضمین');
    expect(matchReflection(state, session.humanPlayer!.id)).toContain('رد تو');
    session.returnToMenu();
    expect(resumeSummary(session.savedMatch!)).toContain('جانمایی آغازین');
    expect(state).toEqual(before);
});
