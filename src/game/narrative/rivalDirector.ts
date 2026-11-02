import type { MatchTransition } from '../ui/transitions';
import { characterForSeat, type CharacterId } from '../ui/characters';
import { getPublicVictoryPoints } from '../core/scoring';
import { getPortOwnerId } from '../core/ports';
import { DIALOGUES, REPLIES, dialogueId, type DialogueId, type DialogueBeat } from './dialogues.fa';

export interface RivalMemory {
    enabled: boolean;
    seen: DialogueId[];
    queue: { id: DialogueId; step: number; reply: 'bold' | 'curious' | null }[];
    lastRound: number;
}

/** Presentation-only story director: bounded, saved, event-driven and independent of tutorial opt-out. */
export class RivalDirector {
    enabled = false;
    readonly seen = new Set<DialogueId>();
    private queue: RivalMemory['queue'] = [];
    private lastRound = -1;
    private observed: MatchTransition | null = null;
    get pending() {
        return this.enabled && this.queue.length > 0;
    }
    get completed() {
        return [...this.seen].filter((id) => !this.queue.some((item) => item.id === id));
    }
    reset(enabled: boolean, arrival = false): void {
        this.enabled = enabled;
        this.seen.clear();
        this.queue = [];
        this.lastRound = -1;
        this.observed = null;
        if (enabled && arrival) this.offer('arrival');
    }
    snapshot(): RivalMemory {
        return {
            enabled: this.enabled,
            seen: [...this.seen],
            queue: this.queue.map((item) => ({ ...item })),
            lastRound: this.lastRound,
        };
    }
    restore(memory?: RivalMemory): void {
        this.reset(memory?.enabled ?? true);
        if (!memory) return;
        memory.seen.forEach((id) => this.seen.add(id));
        this.queue = memory.queue.map((item) => ({ ...item }));
        this.lastRound = memory.lastRound;
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) this.queue = [];
    }
    private offer(id: DialogueId, priority = false): void {
        if (!this.enabled || this.seen.has(id) || (!priority && this.queue.length)) return;
        if (priority) this.queue = [];
        this.seen.add(id);
        this.queue.push({ id, step: 0, reply: null });
    }
    replay(id: DialogueId): void {
        if (!this.seen.has(id)) return;
        this.queue = [{ id, step: 0, reply: null }];
    }
    view(guide = true, available?: readonly CharacterId[]) {
        const entry = this.queue[0];
        if (!entry) return null;
        const script = DIALOGUES[entry.id];
        const beats = script.beats.filter((beat) =>
            beat.speaker === 'anahita' ? guide : !available || available.includes(beat.speaker),
        );
        const remaining = script.beats.slice(entry.step).filter((beat) => beats.includes(beat));
        const speaker = [...beats].reverse().find((beat) => beat.speaker !== 'anahita')?.speaker as
            CharacterId | undefined;
        const beat: DialogueBeat | undefined =
            entry.reply && speaker
                ? { speaker, text: REPLIES[speaker][entry.reply] }
                : remaining[0];
        if (!beat) return null;
        return {
            id: entry.id,
            title: script.title,
            beat,
            position: entry.reply ? beats.length + 1 : beats.indexOf(beat) + 1,
            total: beats.length + (entry.reply ? 1 : 0),
            last: !!entry.reply || remaining.length === 1,
            canReply: !entry.reply && remaining.length === 1 && !!speaker,
        };
    }
    begin(round: number): void {
        this.lastRound = round;
    }
    advance(guide: boolean, available: readonly CharacterId[]): void {
        const view = this.view(guide, available),
            entry = this.queue[0];
        if (!entry) return;
        if (!view || view.last) this.queue.shift();
        else entry.step = DIALOGUES[entry.id].beats.findIndex((beat) => beat === view.beat) + 1;
    }
    reply(choice: 'bold' | 'curious', guide: boolean, available: readonly CharacterId[]): void {
        if (this.view(guide, available)?.canReply) this.queue[0].reply = choice;
    }
    skip(): void {
        this.queue.shift();
    }
    observe(transition: MatchTransition | null, humanId: string): void {
        if (!transition || transition === this.observed) return;
        this.observed = transition;
        if (!this.enabled) return;
        const { before, after, action } = transition;
        const humanSeat = after.players.findIndex((p) => p.id === humanId);
        const active = before.players[before.activePlayerIndex];
        const rival = characterForSeat(before.activePlayerIndex, humanSeat);
        if (after.phase === 'finished') {
            const winner = characterForSeat(
                after.players.findIndex((p) => p.id === after.winnerId),
                humanSeat,
            );
            const id: DialogueId =
                after.winnerId === humanId
                    ? 'human-victory'
                    : winner?.id === 'mithra'
                      ? 'mithra-victory'
                      : winner?.id === 'ashi'
                        ? 'ashi-victory'
                        : 'spenta-victory';
            this.offer(id, true);
            return;
        }
        if (before.phase.startsWith('setup-') && !after.phase.startsWith('setup-')) {
            this.offer('island-ready');
            return;
        }
        if (after.turn <= this.lastRound || this.queue.length) return;
        const humanScore = getPublicVictoryPoints(after, humanId);
        if (humanScore >= after.victoryTarget - 2 && !this.seen.has('near-victory')) {
            this.offer('near-victory');
            return;
        }
        if (
            after.awards?.longestRoad &&
            after.awards.longestRoad !== before.awards?.longestRoad &&
            !this.seen.has('roads-title')
        ) {
            this.offer('roads-title');
            return;
        }
        if (
            after.awards?.largestArmy &&
            after.awards.largestArmy !== before.awards?.largestArmy &&
            !this.seen.has('army-title')
        ) {
            this.offer('army-title');
            return;
        }
        if (
            humanScore >= 5 &&
            after.players.every(
                (p) => p.id === humanId || getPublicVictoryPoints(after, p.id) < humanScore,
            ) &&
            !this.seen.has('human-leads')
        ) {
            this.offer('human-leads');
            return;
        }
        let event: DialogueId | null = null;
        if (action.kind === 'build') {
            if (
                after.board.ports.some(
                    (port) =>
                        getPortOwnerId(after.board, port) &&
                        getPortOwnerId(after.board, port) !== getPortOwnerId(before.board, port),
                ) &&
                !this.seen.has('ashi-port')
            )
                event = 'ashi-port';
            else if (active.id === humanId) event = `human-${action.type}`;
            else if (rival?.id === 'mithra' && action.type !== 'city')
                event = `mithra-${action.type}`;
            else if (rival?.id === 'spenta-armaiti' && action.type !== 'road')
                event = `spenta-${action.type}`;
        } else if (action.kind === 'trade' || action.kind === 'domestic-trade') {
            event =
                active.id === humanId ||
                (action.kind === 'domestic-trade' &&
                    [action.terms.from, action.terms.to].includes(humanId))
                    ? 'human-trade'
                    : 'ashi-trade';
        } else if (action.kind === 'steal' && action.victimId === humanId) event = 'ahriman-hit';
        else if (
            action.kind === 'roll' &&
            after.lastRoll &&
            after.lastRoll[0] + after.lastRoll[1] !== 7
        ) {
            if (
                active.id === humanId &&
                !transition.production.some((grant) => grant.playerId === humanId)
            )
                event = 'drought';
            else if (transition.production.reduce((sum, grant) => sum + grant.amount, 0) >= 5)
                event = 'ashi-income';
        }
        if (event && !this.seen.has(event)) {
            this.offer(event);
            return;
        }
        if (
            action.kind === 'end-turn' &&
            after.players[after.activePlayerIndex].id === humanId &&
            after.turn >= this.lastRound + 3
        ) {
            const id = after.players
                .map((_, seat) => characterForSeat(seat, humanSeat)?.id)
                .filter((id): id is CharacterId => !!id)
                .map((id) => `ambient-${id === 'spenta-armaiti' ? 'spenta' : id}` as DialogueId)
                .find((id) => !this.seen.has(id));
            if (id) this.offer(id);
        }
    }
}

/** Reject corrupt optional narrative data without weakening the existing match validator. */
export function validRivalMemory(value: unknown): value is RivalMemory {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (
        typeof v.enabled !== 'boolean' ||
        !Number.isSafeInteger(v.lastRound) ||
        (v.lastRound as number) < -1 ||
        !Array.isArray(v.seen) ||
        v.seen.length > Object.keys(DIALOGUES).length ||
        !v.seen.every(dialogueId) ||
        new Set(v.seen).size !== v.seen.length ||
        !Array.isArray(v.queue) ||
        v.queue.length > 1
    )
        return false;
    const seen = v.seen;
    return v.queue.every((value: unknown) => {
        if (!value || typeof value !== 'object') return false;
        const item = value as Record<string, unknown>;
        const id = item.id;
        return (
            dialogueId(id) &&
            seen.includes(id) &&
            typeof item.step === 'number' &&
            Number.isInteger(item.step) &&
            item.step >= 0 &&
            item.step < DIALOGUES[id].beats.length &&
            (item.reply === null || item.reply === 'bold' || item.reply === 'curious')
        );
    });
}
