import { expect, test } from 'vitest';
import { ExperiencePreferences, EXPERIENCE_DEFAULTS } from '../src/game/ui/experiencePreferences';

test('preferences stay separate from the match and round-trip without enabling unwanted sound', () => {
    const values = new Map([['ancient-persia.match.v1', 'untouched match']]);
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
    const prefs = new ExperiencePreferences(storage);
    expect(prefs.snapshot).toEqual(EXPERIENCE_DEFAULTS);
    let notices = 0;
    const stop = prefs.subscribe(() => notices++);
    prefs.set('quick', true);
    prefs.set('reduced', true);
    prefs.set('quick', true);
    expect(notices).toBe(2);
    stop();
    expect(new ExperiencePreferences(storage).snapshot).toMatchObject({
        quick: true,
        reduced: true,
        sound: false,
    });
    expect(values.get('ancient-persia.match.v1')).toBe('untouched match');
});

test('corrupt or unavailable preference storage falls back and cannot prevent session settings', () => {
    expect(
        new ExperiencePreferences({ getItem: () => '{broken', setItem: () => {} }).snapshot,
    ).toEqual(EXPERIENCE_DEFAULTS);
    const prefs = new ExperiencePreferences({
        getItem: () => {
            throw new Error('blocked');
        },
        setItem: () => {
            throw new Error('full');
        },
    });
    expect(() => prefs.set('sound', true)).not.toThrow();
    expect(prefs.snapshot.sound).toBe(true);
    const typed = new ExperiencePreferences({
        getItem: () => '{"sound":"yes","quick":true,"reduced":null}',
        setItem: () => {},
    });
    expect(typed.snapshot).toMatchObject({ sound: false, quick: true, reduced: false });
    const copy = typed.snapshot as { quick: boolean };
    copy.quick = false;
    expect(typed.snapshot.quick).toBe(true);
});

test('conversation choices persist into fresh sessions and do not disable deliberate practice', async () => {
    const { GameSession } = await import('../src/game/ui/session');
    const values = new Map<string, string>();
    const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
    };
    const first = new GameSession(undefined, undefined, new ExperiencePreferences(storage));
    first.start(4, true, 'Player', true);
    first.setTutorialEnabled(false);
    first.setRivalDialogue(false);
    const next = new GameSession(undefined, undefined, new ExperiencePreferences(storage));
    next.start(4, true, 'Player', true);
    expect(next.tutorial.enabled).toBe(false);
    expect(next.rivals.enabled).toBe(false);
    expect(next.preferences.snapshot).toMatchObject({
        anahita: false,
        rivals: false,
        anahitaChosen: true,
        rivalsChosen: true,
    });
    next.returnToMenu();
    next.requestPlay(true);
    expect(next.practice).toBeTruthy();
});
