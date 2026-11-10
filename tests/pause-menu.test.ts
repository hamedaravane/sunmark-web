import { afterEach, expect, test, vi } from 'vitest';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { humanHeader } from '../src/game/ui/humanHud';
import { menuContent } from '../src/game/ui/menu';
import { AppPlatform } from '../src/pwa/app';
import { MatchStore } from '../src/game/persistence/matchStore';

const actions = (markup: string) => [...markup.matchAll(/data-action="([^"]+)"/g)].map((m) => m[1]);
afterEach(() => vi.restoreAllMocks());
function pausedSession() {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(4, false);
    session.openSheet({ kind: 'help' });
    return session;
}

test('pause menu has focused actions and experience preferences, one tutorial entry, and no inline rulebook or lesson list', () => {
    const session = pausedSession();
    const before = structuredClone(session.state);
    const content = sheetContent(session);
    expect(content.title).toBe('بازی متوقف است');
    expect(actions(content.body)).toEqual([
        'open:journal',
        'open:history',
        'open:inspect',
        'open:turn-review',
        'new-game',
        'restart-match',
        'open:experience-guide',
        'open:experience',
        'open-app',
    ]);
    expect(actions(content.footer!)).toEqual(['resume-game']);
    expect(content.focusAction).toBe('resume-game');
    expect(content.body).toContain('آناهیتا خاموش است');
    expect(content.body).not.toMatch(
        /help-list|journal-chapter|lesson:|open:build|open:opponents|player:/,
    );
    expect(humanHeader(session)).toContain('منوی توقف بازی');
    expect(session.botReady).toBe(false);
    expect(session.state).toEqual(before);
    session.closeSheet();
    expect(session.sheet).toBeNull();
    expect(session.state).toEqual(before);
});

test('tutorial hub gives disabled Anahita a clearly named enable button and keeps rules behind a separate screen', () => {
    const session = pausedSession();
    session.openSheet({ kind: 'journal' });
    let content = sheetContent(session);
    expect(content.body).toContain('روشن‌کردن آناهیتا');
    expect(actions(content.body)).toContain('tutorial-resume');
    expect(actions(content.body)).toContain('open:rules');
    session.setTutorialEnabled(true);
    expect(session.tutorial.enabled).toBe(true);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    session.openSheet({ kind: 'help' });
    expect(sheetContent(session).body).toContain('آناهیتا روشن است');
    session.openSheet({ kind: 'journal' });
    content = sheetContent(session);
    expect(actions(content.body)).toContain('tutorial-pause');
    session.setTutorialEnabled(false);
    session.openSheet({ kind: 'rules' });
    content = sheetContent(session);
    expect(content.title).toBe('قوانین بازی');
    expect(content.body).toContain('help-list');
    expect(actions(content.footer!)).toEqual(['open:journal']);
});

test('pause directly exposes keyboard inspection and history; restarting a live match requires confirmation', () => {
    const session = pausedSession();
    const before = session.state;
    session.openSheet({ kind: 'help' });
    const content = sheetContent(session);
    expect(actions(content.body)).toContain('open:history');
    expect(actions(content.body)).toContain('open:inspect');
    expect(actions(content.body)).toContain('open:turn-review');
    expect(actions(content.body)).toContain('restart-match');
    expect(actions(content.body)).not.toContain('open:review');
    expect(actions(content.body)).not.toContain('open:characters');
    for (const kind of ['history', 'inspect'] as const) {
        session.openSheet({ kind });
        expect(actions(sheetContent(session).footer!)).toEqual(['open:help']);
    }
    session.requestStart(4);
    expect(session.sheet?.kind).toBe('new-match');
    expect(session.state).toBe(before);
    session.closeSheet();
    expect(session.state).toBe(before);
});

test('new matches enable Anahita by default and saved opt-outs survive resume', () => {
    let raw: string | null = null;
    const storage = {
        getItem: () => raw,
        setItem: (_key: string, value: string) => {
            raw = value;
        },
    };
    const session = new GameSession(new MatchStore(storage));
    session.requestPlay();
    expect(session.sheet).toMatchObject({ kind: 'player-name', guided: true });
    session.confirmPlayerName();
    expect(session.tutorial.enabled).toBe(true);
    expect(session.sheet?.kind).toBe('introduction');
    session.closeSheet();
    expect(session.sheet?.kind).toBe('tutorial');
    session.setTutorialEnabled(false);
    session.returnToMenu();
    const resumed = new GameSession(new MatchStore(storage));
    resumed.requestPlay();
    expect(resumed.tutorial.enabled).toBe(false);
    resumed.openSheet({ kind: 'help' });
    expect(sheetContent(resumed).body).toContain('آناهیتا خاموش است');
    const direct = new GameSession();
    direct.start(4);
    expect(direct.tutorial.enabled).toBe(true);
});

test('practice pause menu has a single relevant help entry and update availability stays visible', () => {
    const session = new GameSession();
    session.requestPlay(true);
    while (session.sheet?.kind === 'tutorial') session.continueTutorial();
    session.openSheet({ kind: 'help' });
    const content = sheetContent(session, true);
    expect(actions(content.body)).toEqual([
        'open:rules',
        'open:history',
        'open:inspect',
        'new-game',
        'open:experience-guide',
        'open:experience',
        'open-app',
    ]);
    expect(content.body).toContain('به‌روزرسانی بازی');
    expect(content.body).not.toContain('ادامه این بازی');
    session.openSheet({ kind: 'help' });
    expect(actions(sheetContent(session).body)).not.toContain('restart-match');
    session.openSheet({ kind: 'rules' });
    expect(sheetContent(session).title).toBe('راهنمای تمرین');
    expect(session.savedMatch).toBeNull();
});

test('home settings apply narrator choices before entering a new match', () => {
    const session = new GameSession();
    session.openSheet({ kind: 'experience' });
    session.setExperienceOption('anahita');
    session.setExperienceOption('rivals');
    expect(session.state).toBeNull();
    expect(session.preferences.snapshot).toMatchObject({
        anahita: false,
        rivals: false,
        anahitaChosen: true,
        rivalsChosen: true,
    });
    session.closeSheet();
    session.start(4, true, 'بازیکن', true);
    expect(session.tutorial.enabled).toBe(false);
    expect(session.rivals.enabled).toBe(false);
    expect(session.state?.players).toHaveLength(4);
});

test('home has no companion gallery route and keeps direct entry to play and practice', () => {
    const session = new GameSession();
    const markup = menuContent(new AppPlatform(), session);
    expect(actions(markup)).toContain('play');
    expect(actions(markup)).toContain('tutorial');
    expect(actions(markup)).not.toContain('open:characters');
    expect(markup).not.toContain('با هم‌نشینان جزیره آشنا شو');
});
