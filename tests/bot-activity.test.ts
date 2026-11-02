import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner } from '../src/game/ui/botTurns';
import { botActivity } from '../src/game/ui/botActivity';
import { botActivityLayout } from '../src/game/ui/botActivityLayout';
import { responsiveLayout, DESKTOP_LAYOUT } from '../src/game/ui/responsiveLayout';
import { matchGeometry } from '../src/game/ui/matchGeometry';
import { completeSessionSetup } from './helpers/setup';
afterEach(() => vi.useRealTimers());
function botSession() {
    const session = new GameSession();
    session.start(4, false);
    completeSessionSetup(session);
    session.state!.activePlayerIndex = 1;
    session.state!.phase = 'roll';
    session.setTutorialEnabled(false);
    session.setRivalDialogue(false);
    return session;
}
test('unrelated UI notifications do not restart the bot waiting interval', () => {
    vi.useFakeTimers();
    const session = botSession(),
        before = session.state;
    const runner = new BotTurnRunner(session, () => true, 650);
    vi.advanceTimersByTime(400);
    session.setBotPaused(false);
    runner.refresh();
    vi.advanceTimersByTime(250);
    expect(session.state).not.toBe(before);
    runner.destroy();
});
test('activity uses complete supplied art and public confirmed facts without obstructing human choices', () => {
    const session = botSession();
    const before = botActivity(session);
    expect(before).toContain('data-art="mithra-portrait"');
    expect(before).toContain('آمادهٔ تاس');
    expect(before).not.toContain('resources');
    session.advanceBot();
    expect(botActivity(session)).toContain('تاس');
    session.openSheet({ kind: 'turn-review' });
    expect(botActivity(session)).toBe('');
    session.closeSheet();
    session.state!.activePlayerIndex = 0;
    expect(botActivity(session)).toBe('');
});
test.each([
    [320, 568],
    [390, 844],
    [768, 1024],
    [1024, 1366],
    [844, 390],
    [1366, 768],
    [1920, 1080],
])('reserved character controls at %ix%i keep a usable separate board', (width, height) => {
    const layout = responsiveLayout(width, height);
    const activity = botActivityLayout(width, height, layout.wide, layout.desktop);
    expect(activity.portraitWidth * 1.5).toBeLessThan(activity.height);
    const boardWidth = layout.wide
        ? layout.contentWidth - layout.controlsWidth - (layout.desktop ? DESKTOP_LAYOUT.gap : 0)
        : width;
    const boardHeight = layout.desktop
        ? layout.contentHeight - DESKTOP_LAYOUT.headerHeight - DESKTOP_LAYOUT.gap
        : layout.wide
          ? height
          : height - 124 - 48 - 66 - activity.height - 6;
    const geometry = matchGeometry(boardWidth, boardHeight, layout.wide, layout.desktop);
    expect(boardHeight).toBeGreaterThan(190);
    expect(geometry.board.hexRadius).toBeGreaterThanOrEqual(19);
    expect(activity.portraitWidth).toBeLessThan(layout.wide ? layout.controlsWidth : width / 3);
});
