export interface ScreenLock {
    release(): Promise<void>;
    addEventListener(type: 'release', listener: () => void): void;
}
/** Best effort: unsupported browsers and battery restrictions must never block play. */
export class ScreenAwake {
    private lock: ScreenLock | null = null;
    private requesting = false;
    private active = false;
    private disposed = false;
    constructor(private readonly request: (() => Promise<ScreenLock>) | null) {}
    setActive(active: boolean) {
        this.active = active;
        void this.sync();
    }
    private async sync() {
        if ((!this.active || this.disposed) && this.lock) {
            const lock = this.lock;
            this.lock = null;
            try {
                await lock.release();
            } catch {
                /* Already released by the platform. */
            }
        }
        if (!this.active || this.disposed || this.lock || this.requesting || !this.request) return;
        this.requesting = true;
        try {
            const lock = await this.request();
            if (!this.active || this.disposed) {
                await lock.release();
                return;
            }
            this.lock = lock;
            lock.addEventListener('release', () => {
                if (this.lock === lock) this.lock = null;
            });
        } catch {
            /* Screen Wake Lock is optional and permission may be denied. */
        } finally {
            this.requesting = false;
        }
    }
    destroy() {
        this.disposed = true;
        this.setActive(false);
    }
}
