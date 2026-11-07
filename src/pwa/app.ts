export type OfflineStatus = 'preparing' | 'ready' | 'error' | 'unsupported';

/** Observable platform state. Browser adapters provide capabilities; game rules stay separate. */
export class AppPlatform {
    offline: OfflineStatus = 'preparing';
    online = true;
    installed = false;
    embedded = false;
    linkCopied = false;
    ios = false;
    android = false;
    chrome = false;
    updateReady = false;
    updating = false;
    error = '';
    installPrompt: (() => Promise<'accepted' | 'dismissed'>) | null = null;
    activateUpdate: (() => Promise<void>) | null = null;
    retry: () => void = () => {};
    private listeners = new Set<() => void>();

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    changed(): void {
        this.listeners.forEach((listener) => listener());
    }
    async install(): Promise<void> {
        const prompt = this.installPrompt;
        if (!prompt || this.installed) return;
        this.installPrompt = null; // A browser prompt can only be used once.
        this.changed();
        try {
            if ((await prompt()) === 'accepted') this.installed = true;
        } catch {
            this.error = 'نصب انجام نشد؛ از منوی مرورگر دوباره امتحان کن.';
        }
        this.changed();
    }
    async update(): Promise<boolean> {
        if (!this.updateReady || this.updating || !this.activateUpdate) return false;
        this.updating = true;
        this.error = '';
        this.changed();
        try {
            await this.activateUpdate();
            return true;
        } catch {
            this.updating = false;
            this.error = 'به‌روزرسانی انجام نشد؛ دوباره امتحان کن.';
            this.changed();
            return false;
        }
    }
}
