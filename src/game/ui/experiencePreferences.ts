export const EXPERIENCE_DEFAULTS = {
    sound: false,
    haptics: false,
    quick: false,
    reduced: false,
    introduced: false,
    anahita: true,
    rivals: true,
    anahitaChosen: false,
    rivalsChosen: false,
};
export type ExperienceOption = keyof typeof EXPERIENCE_DEFAULTS;
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
const KEY = 'sunmark.experience.v1';

function browserStorage(): PreferenceStorage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

/** Device preferences are separate from match data; unavailable storage never blocks play. */
export class ExperiencePreferences {
    private values = { ...EXPERIENCE_DEFAULTS };
    private listeners = new Set<() => void>();
    constructor(private storage: PreferenceStorage | null = browserStorage()) {
        try {
            const raw: unknown = JSON.parse(storage?.getItem(KEY) ?? 'null');
            if (raw && typeof raw === 'object')
                for (const key of Object.keys(EXPERIENCE_DEFAULTS) as ExperienceOption[])
                    if (typeof (raw as Record<string, unknown>)[key] === 'boolean')
                        this.values[key] = (raw as Record<string, boolean>)[key];
        } catch {
            /* Fall back to quiet defaults. */
        }
    }
    get snapshot(): Readonly<typeof EXPERIENCE_DEFAULTS> {
        return { ...this.values };
    }
    set(key: ExperienceOption, value: boolean): void {
        if (
            !Object.prototype.hasOwnProperty.call(EXPERIENCE_DEFAULTS, key) ||
            typeof value !== 'boolean' ||
            this.values[key] === value
        )
            return;
        this.values[key] = value;
        try {
            this.storage?.setItem(KEY, JSON.stringify(this.values));
        } catch {
            /* Session setting still applies. */
        }
        this.listeners.forEach((fn) => fn());
    }
    subscribe(fn: () => void): () => void {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }
}
