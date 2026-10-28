import { expect, test } from 'vitest';
import { ready, giveCard } from './helpers/development';
import { GameSession } from '../src/game/ui/session';
import { MatchStore } from '../src/game/persistence/matchStore';
import { TutorialDirector } from '../src/game/tutorial/director';
import { actionDock, actionGuidance, primaryAction, turnStatus } from '../src/game/ui/turnMarkup';
import { matchGeometry } from '../src/game/ui/matchGeometry';
import { getBuildOption } from '../src/game/core/queries';
import { beginRobber } from '../src/game/core/robber';
import { sheetContent } from '../src/game/ui/sheets';
import { humanHand, humanHeader } from '../src/game/ui/humanHud';

function sessionFor(state = ready()) {
    const raw = JSON.stringify({
        version: 2,
        state,
        humanPlayerId: 'player-1',
        history: [],
        tutorial: new TutorialDirector().snapshot(),
    });
    const session = new GameSession(new MatchStore({ getItem: () => raw, setItem: () => {} }));
    session.preferences.set('introduced', true);
    session.resumeSaved();
    return session;
}

test('one dock primary changes from End Turn to guarded confirmation; cancel never pays', () => {
    const session = sessionFor();
    expect(primaryAction(session)?.label).toBe('پایان نوبت');
    expect(actionDock(session).match(/class="button dock-primary/g)).toHaveLength(1);
    const resources = { ...session.humanPlayer!.resources };
    session.chooseBuild('road');
    expect(primaryAction(session)).toMatchObject({ label: 'تأیید راه', disabled: true });
    expect(actionDock(session)).not.toMatch(/open:(build|domestic|development)/);
    expect(actionDock(session)).toContain('cancel-placement');
    expect(actionDock(session)).toContain('open:targets');
    session.preview(session.targets[0]);
    expect(primaryAction(session)?.disabled).toBe(false);
    expect(session.humanPlayer!.resources).toEqual(resources);
    session.cancelPlacement();
    expect(primaryAction(session)?.label).toBe('پایان نوبت');
    expect(session.humanPlayer!.resources).toEqual(resources);
});

test('an off-turn human discard retains its completion control and hides ordinary tools', () => {
    const state = ready();
    state.activePlayerIndex = 1;
    state.lastRoll = [3, 4];
    state.players[1].resources = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    state.players[2].resources = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    const session = sessionFor(beginRobber(state, 'seven', 'actions'));
    expect(session.isHumanTurn).toBe(false);
    expect(session.state!.phase).toBe('discard');
    expect(primaryAction(session)).toMatchObject({ label: 'انتخاب منابع', disabled: false });
    expect(actionDock(session)).not.toContain('dock-tools');
    expect(actionDock(session)).toContain('dock-primary');
    expect(session.sheet?.kind).toBe('discard');
});

test('pre-roll cards and storage/guide access fit in the dock without a second roll action', () => {
    const state = ready();
    state.phase = 'roll';
    state.lastRoll = null;
    giveCard(state, 'knight');
    const session = sessionFor(state);
    expect(primaryAction(session)).toBeNull();
    expect(actionDock(session)).toContain('پیش از تاس');
    expect(actionDock(session)).not.toContain('dock-primary');
    expect(actionDock(session)).not.toContain('roll-dice');
    expect(turnStatus(session)).toBe('');
});

test('guidance uses real resources and legal sites, and can replace an expired receipt', () => {
    const session = sessionFor();
    session.humanPlayer!.resources = { wood: 0, brick: 0, wheat: 2, wool: 0, stone: 2 };
    expect(getBuildOption(session.state!, 'city').legalTargetIds.length).toBeGreaterThan(0);
    expect(actionGuidance(session)).toContain('برای شهر، ۱ سنگ کم داری');
    session.humanPlayer!.resources.stone = 3;
    expect(turnStatus(session, false)).toContain('قابل ساخت: شهر');
    for (const v of Object.values(session.state!.board.vertices))
        if (v.building?.ownerId === 'player-1') v.building = null;
    expect(actionGuidance(session)).not.toContain('قابل ساخت: شهر');
});

test('direct player details never expose opponent VP cards, private totals or hand controls', () => {
    const session = sessionFor();
    session.openSheet({ kind: 'player', id: 'player-2' });
    const publicDetails = sheetContent(session);
    const header = humanHeader(session),
        hand = humanHand(session);
    giveCard(session.state!, 'victory-point', 'player-2');
    giveCard(session.state!, 'victory-point', 'player-2');
    expect(sheetContent(session)).toEqual(publicDetails);
    expect(publicDetails.body).not.toContain('امتیاز کارت‌های مخفی تو');
    expect(publicDetails.footer).not.toMatch(/open:(development|build)/);
    expect(humanHeader(session)).toBe(header);
    expect(humanHand(session)).toBe(hand);
});

test.each([
    [320, 568, 0, 0],
    [390, 844, 47, 34],
    [480, 900, 0, 20],
])(
    'portrait %i preserves coastal clearance and a separate ocean action band',
    (width, height, top, bottom) => {
        const chrome = width < 360 ? 112 + 48 + 60 + 84 + 6 : 124 + 48 + 66 + 84 + 6;
        const available = height - top - bottom - chrome;
        const { board, seaBand, dieSize, diceOnLedge } = matchGeometry(width, available);
        // Number medallions must remain distinct at the smallest supported portrait.
        expect(board.hexRadius).toBeGreaterThanOrEqual(22);
        expect(board.centerY + 4 * board.hexRadius + 40).toBeLessThanOrEqual(
            available - seaBand + 0.001,
        );
        expect(board.centerY - 4 * board.hexRadius - 40).toBeGreaterThanOrEqual(-0.001);
        expect(5 * Math.sqrt(3) * board.hexRadius + 80).toBeLessThanOrEqual(width + 0.001);
        expect(dieSize).toBeGreaterThanOrEqual(48);
        if (diceOnLedge) {
            expect(seaBand).toBe(0);
            expect(dieSize + 2 + 3 + 18).toBeLessThanOrEqual(84);
        } else expect(dieSize + 2 + 5 + 20 + 8 + 8).toBeLessThanOrEqual(seaBand + 0.001);
    },
);
