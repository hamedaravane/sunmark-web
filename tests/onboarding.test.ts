import { expect, test } from 'vitest';
import { AppPlatform } from '../src/pwa/app';
import { entryInstall, installGuide } from '../src/pwa/markup';
test('installed users do not see an acquisition card', () => {
    const app = new AppPlatform();
    app.installed = true;
    expect(entryInstall(app)).toBe('');
});
test('a real install capability is required for the direct install CTA', () => {
    const app = new AppPlatform();
    expect(entryInstall(app)).toContain('data-action="open-app"');
    app.installPrompt = async () => 'dismissed';
    expect(entryInstall(app)).toContain('data-action="app-install"');
    app.embedded = true;
    expect(entryInstall(app)).not.toContain('data-action="app-install"');
    expect(installGuide(app)).toContain('Open in browser');
});
test('iOS guide includes Safari, share, home screen and confirmation without claiming automatic installation', () => {
    const app = new AppPlatform();
    app.ios = true;
    const guide = installGuide(app);
    for (const step of ['Safari', 'Share', 'Add to Home Screen', 'Open as Web App', 'Add'])
        expect(guide).toContain(step);
    expect(guide).toContain('copy-game-link');
});
