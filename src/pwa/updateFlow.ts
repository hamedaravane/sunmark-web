import type { AppPlatform } from './app';
import type { MatchSession } from '../game/ui/matchSession';

/** Prompt once per available release, after any existing conversation/workspace closes. */
export class UpdateNotice {
    private shown = false;
    private removers: Array<() => void>;

    constructor(
        private app: AppPlatform,
        private session: MatchSession,
    ) {
        this.removers = [app.subscribe(this.refresh), session.subscribe(this.refresh)];
        this.refresh();
    }

    private refresh = (): void => {
        if (!this.app.updateReady) this.shown = false;
        if (!this.app.updateReady || this.shown || this.app.updating || this.session.sheet) return;
        this.shown = true;
        this.session.openSheet({ kind: 'update' });
    };

    destroy(): void {
        this.removers.forEach((remove) => remove());
    }
}

/** Save confirmed gameplay before accepting the reload; never discard a live unsaved match. */
export async function applyUpdate(app: AppPlatform, session: MatchSession): Promise<boolean> {
    if (!app.updateReady || app.updating) return false;
    if (session.online?.pending) {
        app.error = 'ابتدا نتیجه حرکت آنلاین را پیگیری کن؛ سپس به‌روزرسانی کن.';
        app.changed();
        return false;
    }
    session.save();
    if (session.state && session.state.phase !== 'finished' && session.saveStatus !== 'saved') {
        app.error = 'بازی ذخیره نشد؛ فعلاً ادامه بده و بعد از پایان بازی به‌روزرسانی کن.';
        app.changed();
        return false;
    }
    return app.update();
}
