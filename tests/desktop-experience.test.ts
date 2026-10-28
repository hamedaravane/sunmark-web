import { expect, test } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { desktopShortcuts, desktopTurnHeading } from '../src/game/ui/desktopMarkup';
import { actionDock, heroDice } from '../src/game/ui/turnMarkup';
import { humanHand } from '../src/game/ui/humanHud';

test('desktop turn context follows the actor while inventory remains human-owned', () => {
    const session = new GameSession();
    session.start(4, false, 'مهسا');
    const state = session.state!;
    state.phase = 'actions';
    state.turn = 12;
    state.activePlayerIndex = 1;
    state.players[1].name = '<img src=x>';
    const heading = desktopTurnHeading(session);
    const hand = humanHand(session);
    expect(heading).toContain('دور ۱۲');
    expect(heading).toContain('&lt;img src=x&gt;');
    expect(heading).not.toContain('<img');
    state.players[1].resources.wood = 99999;
    expect(humanHand(session)).toBe(hand);
    expect(desktopTurnHeading(session)).toBe(heading);
    state.activePlayerIndex = 0;
    expect(desktopTurnHeading(session)).toContain('نوبت تو');
    state.phase = 'finished';
    expect(desktopTurnHeading(session)).toContain('پایان بازی');
});

test('hiding the redundant desktop dice hint cannot hide an error', () => {
    const session = new GameSession();
    session.start(4, false);
    session.preferences.set('introduced', true);
    session.state!.activePlayerIndex = 0;
    session.state!.phase = 'roll';
    expect(actionDock(session)).toContain('dock-roll-hint');
    session.error = 'خطای تاس';
    expect(actionDock(session)).toContain('خطای تاس');
    expect(actionDock(session)).not.toContain('dock-roll-hint');
    expect(heroDice(session)).toContain('data-action="roll-dice"');
});

test('desktop review shortcuts open existing read-only workspaces, not extra turn actions', () => {
    const markup = desktopShortcuts();
    expect(markup).toContain('data-action="open:review"');
    expect(markup).toContain('data-action="open:history"');
    expect(markup).not.toContain('data-action="primary"');
});
