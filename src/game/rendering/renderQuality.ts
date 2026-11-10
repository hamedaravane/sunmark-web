export interface DeviceHints {
    handheld: boolean;
    memoryGB?: number;
    logicalCores?: number;
}

export interface RenderingProfile {
    densityCap: number;
    pixelBudget: number;
    decorativeMotion: boolean;
}

/** Coarse hints choose a safe starting budget, never a model/OS allowlist.
 * Missing memory information (including Safari) is not evidence of unlimited RAM.
 */
export function renderingProfile(hints: DeviceHints): RenderingProfile {
    if (!hints.handheld) return { densityCap: 3, pixelBudget: 4_000_000, decorativeMotion: true };
    const memory = hints.memoryGB;
    const cores = hints.logicalCores;
    const constrained =
        (Number.isFinite(memory) && memory !== undefined && memory > 0 && memory <= 4) ||
        (Number.isFinite(cores) && cores !== undefined && cores > 0 && cores <= 4);
    if (constrained) return { densityCap: 1.5, pixelBudget: 1_000_000, decorativeMotion: false };
    const ample =
        Number.isFinite(memory) &&
        memory !== undefined &&
        memory >= 8 &&
        Number.isFinite(cores) &&
        cores !== undefined &&
        cores >= 8;
    return ample
        ? { densityCap: 3, pixelBudget: 3_000_000, decorativeMotion: true }
        : { densityCap: 2, pixelBudget: 2_000_000, decorativeMotion: true };
}

/** Accept stable 30 Hz presentation. Lower density after sustained slower frames,
 * not a single interaction, a visibility gap, or a naturally 30 Hz display.
 */
export class RenderQuality {
    cap: number;
    readonly pixelBudget: number;
    private readonly motionAllowed: boolean;
    private frames: number[] = [];
    constructor(profile: RenderingProfile = renderingProfile({ handheld: false })) {
        this.cap = profile.densityCap;
        this.pixelBudget = profile.pixelBudget;
        this.motionAllowed = profile.decorativeMotion;
    }
    get decorativeMotion(): boolean {
        return this.motionAllowed && this.cap > 1.5;
    }
    sample(delta: number): boolean {
        if (!Number.isFinite(delta) || delta <= 0 || delta > 1000) {
            this.reset();
            return false;
        }
        this.frames.push(delta);
        if (this.frames.length < 90) return false;
        const slow = this.frames.filter((ms) => ms > 38).length;
        this.reset();
        if (slow < 68 || this.cap <= 1) return false;
        this.cap = this.cap > 2 ? 2 : this.cap > 1.5 ? 1.5 : this.cap > 1.25 ? 1.25 : 1;
        return true;
    }
    reset(): void {
        this.frames = [];
    }
}
