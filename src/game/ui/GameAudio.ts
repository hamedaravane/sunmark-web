import { feedbackEvent, type FeedbackCue, type FeedbackEvent } from './feedbackEvents';
import type { ExperiencePreferences } from './experiencePreferences';
import type { PresentedTransition as MatchTransition } from './transitions';
import type { Motion } from './motion';

// Muted stone taps and bronze-like intervals; no ambient loop or downloaded audio.
const NOTES: Record<FeedbackCue, readonly number[]> = {
    road: [196, 294],
    settlement: [220, 330],
    city: [165, 330, 440],
    point: [330, 440, 660],
    victory: [294, 440, 587, 880],
    resources: [440, 554],
    trade: [330, 494],
    warning: [220, 165],
    loss: [165, 110],
    development: [294, 392],
    roll: [165, 196],
    turn: [294, 440],
};
const HAPTICS: Partial<Record<FeedbackCue, number | number[]>> = {
    road: 10,
    settlement: 14,
    city: 18,
    point: [12, 45, 16],
    victory: [18, 60, 22],
    warning: 12,
    loss: [12, 35, 12],
    development: 10,
    trade: 8,
    turn: 8,
};

/** Browser-only observer: never queues events, waits for effects, or sends commands. */
export class GameAudio {
    private context: AudioContext | null = null;
    private voices = new Set<AudioScheduledSourceNode>();
    private contactBuffer: AudioBuffer | null = null;
    private cleanup: Array<() => void> = [];
    private lastTransition: MatchTransition | null = null;
    private lastAt = -Infinity;
    private vibrating = false;

    constructor(
        private parent: HTMLElement,
        private preferences: ExperiencePreferences,
        private motion: Motion,
    ) {
        parent.addEventListener('pointerdown', this.activate, true);
        parent.addEventListener('keydown', this.activate, true);
        parent.addEventListener('click', this.activate, true);
        document.addEventListener('visibilitychange', this.visibility);
        window.addEventListener('pagehide', this.stop);
        this.cleanup.push(preferences.subscribe(this.stop));
    }
    play(transition: MatchTransition, humanId: string): void {
        if (transition === this.lastTransition) return;
        this.lastTransition = transition;
        const event = feedbackEvent(transition, humanId);
        if (event) this.playEvent(event);
    }
    private activate = (event: Event): void => {
        if (!event.isTrusted || document.hidden || !this.preferences.snapshot.sound) return;
        if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return;
        try {
            if (!this.context) {
                const Audio =
                    window.AudioContext ??
                    (window as unknown as { webkitAudioContext?: typeof AudioContext })
                        .webkitAudioContext;
                if (!Audio) return;
                this.context = new Audio();
            }
            if (this.context.state !== 'running') void this.context.resume().catch(() => {});
        } catch {
            // Autoplay policy or unavailable hardware must never interrupt play.
        }
    };
    private playEvent(event: FeedbackEvent): void {
        if (!this.motion.visible || document.hidden) return;
        const now = performance.now();
        if (now - this.lastAt < 180 && !['point', 'victory', 'loss'].includes(event.cue)) return;
        this.lastAt = now;
        this.stop();
        if (this.preferences.snapshot.sound && this.context?.state === 'running') {
            try {
                const notes =
                    event.construction && event.cue === 'point'
                        ? [NOTES[event.construction][0], ...NOTES.point]
                        : NOTES[event.cue];
                notes.forEach((frequency, index) => {
                    const context = this.context!;
                    const start = context.currentTime + index * 0.065;
                    const oscillator = context.createOscillator();
                    const envelope = context.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(frequency, start);
                    oscillator.frequency.exponentialRampToValueAtTime(
                        frequency * 0.97,
                        start + 0.14,
                    );
                    envelope.gain.setValueAtTime(0, start);
                    envelope.gain.linearRampToValueAtTime(
                        event.personal ? 0.045 : 0.018,
                        start + 0.006,
                    );
                    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
                    oscillator.connect(envelope).connect(context.destination);
                    this.voices.add(oscillator);
                    oscillator.onended = () => {
                        this.voices.delete(oscillator);
                        oscillator.disconnect();
                        envelope.disconnect();
                    };
                    oscillator.start(start);
                    oscillator.stop(start + 0.18);
                });
                if (event.construction || ['road', 'settlement', 'city'].includes(event.cue))
                    this.contact(event.personal);
            } catch {
                this.stop();
            }
        }
        const pattern = HAPTICS[event.cue];
        if (event.personal && pattern && this.preferences.snapshot.haptics && navigator.vibrate) {
            try {
                this.vibrating = navigator.vibrate(pattern);
            } catch {
                // Unsupported/blocked vibration is a silent no-op.
            }
        }
    }
    private visibility = (): void => {
        if (document.hidden) {
            this.stop();
            if (this.context?.state === 'running') void this.context.suspend().catch(() => {});
        }
    };
    private contact(personal: boolean): void {
        const context = this.context!;
        if (!this.contactBuffer) {
            this.contactBuffer = context.createBuffer(
                1,
                Math.ceil(context.sampleRate * 0.035),
                context.sampleRate,
            );
            const data = this.contactBuffer.getChannelData(0);
            let seed = 4173;
            for (let i = 0; i < data.length; i++) {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                data[i] = (seed / 2 ** 32 - 0.5) * (1 - i / data.length);
            }
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = this.contactBuffer;
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        gain.gain.value = personal ? 0.035 : 0.014;
        source.connect(filter).connect(gain).connect(context.destination);
        this.voices.add(source);
        source.onended = () => {
            this.voices.delete(source);
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        source.start();
        source.stop(context.currentTime + 0.04);
    }
    stop = (): void => {
        for (const voice of this.voices) {
            try {
                voice.stop();
            } catch {
                /* Already stopped. */
            }
        }
        this.voices.clear();
        if (this.vibrating) {
            try {
                navigator.vibrate?.(0);
            } catch {
                /* Device unavailable. */
            }
            this.vibrating = false;
        }
    };
    destroy(): void {
        this.stop();
        this.cleanup.forEach((dispose) => dispose());
        this.parent.removeEventListener('pointerdown', this.activate, true);
        this.parent.removeEventListener('keydown', this.activate, true);
        this.parent.removeEventListener('click', this.activate, true);
        document.removeEventListener('visibilitychange', this.visibility);
        window.removeEventListener('pagehide', this.stop);
        if (this.context) void this.context.close().catch(() => {});
    }
}
