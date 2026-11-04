import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { BotTurnRunner } from '../src/game/ui/botTurns';
import { botActivity } from '../src/game/ui/botActivity';
import { responsiveLayout } from '../src/game/ui/responsiveLayout';
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
    expect(before).toContain('portrait-anchor');
    expect(before).not.toContain('bot-pause');
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
])('portrait-free controls at %ix%i keep a usable separate board', (width, height) => {
    const layout = responsiveLayout(width, height);
    expect(layout.characterWidth).toBe(0);
    const compact = width < 360 || height < 720;
    const boardWidth = layout.boardWidth;
    const boardHeight = layout.wide
        ? layout.boardHeight
        : height - (compact ? 112 : 124) - 48 - (compact ? 60 : 66) - (compact ? 84 : 124) - 6;
    const geometry = matchGeometry(boardWidth, boardHeight, layout.wide, layout.desktop);
    expect(boardHeight).toBeGreaterThan(180);
    expect(geometry.board.hexRadius).toBeGreaterThanOrEqual(22);
});
