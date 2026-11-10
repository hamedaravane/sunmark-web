import {
    domesticTradeError,
    emptyBundle,
    TradeTable,
    type ResourceBundle,
    type TradeMemory,
    type TradeOffer,
    type TradeTerms,
} from '../core/domesticTrade';
import { botTradeValue, evaluateBotTrade, proposeBotTrade } from '../core/botTrading';
import { canAfford } from '../core/building';
import {
    RESOURCE_TYPES,
    type ActionResult,
    type GameState,
    type ResourceType,
} from '../core/types';
import type { MatchAction } from './transitions';
import { FA } from './messages.fa';
import { number } from './components';

type Context = { state: GameState | null; humanId: string | null; interactive: boolean };
export class PlayerTrading {
    readonly table = new TradeTable();
    give = emptyBundle();
    want = emptyBundle();
    target: string | null = null;
    parentId: number | undefined;
    composing = true;
    reviewId: number | null = null;
    message = '';
    constructor(
        private context: () => Context,
        private notify: () => void,
        private commit: (result: ActionResult, text: string, action: MatchAction) => void,
        private show: () => void,
        private settled: (message: string) => void,
    ) {}
    reset(): void {
        this.table.reset();
        this.clearDraft();
    }
    private clearDraft(): void {
        this.give = emptyBundle();
        this.want = emptyBundle();
        this.target = null;
        this.parentId = undefined;
        this.composing = true;
        this.reviewId = null;
        this.message = '';
    }
    restore(memory?: TradeMemory): void {
        this.reset();
        if (memory) this.table.restore(memory);
        this.composing = !this.waitingForHuman;
    }
    sync(): void {
        const { state } = this.context();
        if (state) {
            const before = this.table.contextKey;
            this.table.sync(state);
            if (this.table.contextKey !== before) this.clearDraft();
        }
    }
    get allowed(): boolean {
        return this.context().state?.phase === 'actions';
    }
    get waitingForHuman(): boolean {
        const { humanId } = this.context();
        return !!humanId && this.table.pendingFor(humanId).length > 0;
    }
    get botWork(): boolean {
        const { humanId, interactive } = this.context();
        return this.table.offers.some(
            (o) =>
                (o.status === 'open' && o.to !== humanId && (!interactive || o.from === humanId)) ||
                (o.status === 'accepted' && o.from !== humanId && o.to !== humanId && !interactive),
        );
    }
    get targets(): string[] {
        const { state, humanId } = this.context();
        if (!state || !humanId || !this.allowed) return [];
        const active = state.players[state.activePlayerIndex].id;
        return active === humanId
            ? state.players.filter((p) => p.id !== humanId).map((p) => p.id)
            : [active];
    }
    get draftError(): string | null {
        const { state, humanId } = this.context();
        if (!state || !humanId || !this.allowed)
            return 'بعد از تاس و جابه‌جایی اهریمن می‌تونی معامله کنی.';
        if (!RESOURCE_TYPES.some((r) => this.give[r]) || !RESOURCE_TYPES.some((r) => this.want[r]))
            return 'هر دو طرف معامله باید حداقل یک منبع داشته باشند.';
        if (RESOURCE_TYPES.some((r) => this.give[r] && this.want[r]))
            return 'یک نوع منبع را هم‌زمان نده و درخواست نکن.';
        if (
            RESOURCE_TYPES.some(
                (r) => this.give[r] > state.players.find((p) => p.id === humanId)!.resources[r],
            )
        )
            return 'منابعی که می‌دی از دارایی تو بیشتره.';
        if (this.target && !this.targets.includes(this.target))
            return 'فقط می‌تونی با صاحب نوبت معامله کنی.';
        return null;
    }
    selectTarget(id: string | null): void {
        if (!this.context().interactive) return;
        if (!this.allowed || !this.composing || (id !== null && !this.targets.includes(id))) return;
        this.target = id;
        this.parentId = undefined;
        this.notify();
    }
    adjust(side: 'give' | 'want', resource: ResourceType, delta: number): void {
        if (!this.context().interactive) return;
        if (
            !this.composing ||
            !this.allowed ||
            ![-1, 1].includes(delta) ||
            !RESOURCE_TYPES.includes(resource)
        )
            return;
        const { state, humanId } = this.context();
        if (delta > 0 && (side === 'give' ? this.want[resource] : this.give[resource])) return;
        const next = this[side][resource] + delta;
        const max =
            side === 'give'
                ? state!.players.find((p) => p.id === humanId)!.resources[resource]
                : Number.MAX_SAFE_INTEGER;
        if (!Number.isSafeInteger(next) || next < 0 || (delta > 0 && next > max)) return;
        this[side] = { ...this[side], [resource]: next };
        this.notify();
    }
    send(): void {
        if (!this.context().interactive) return;
        if (!this.composing || this.draftError) return;
        const { state, humanId } = this.context();
        const recipients = this.target ? [this.target] : this.targets;
        // A new announcement replaces earlier human promises, never executes them.
        for (const offer of this.table.pendingFor(humanId!))
            if (offer.id !== this.parentId) this.table.withdraw(offer.id, humanId!);
        for (const to of recipients)
            this.table.propose(
                state!,
                { from: humanId!, to, give: this.give, want: this.want },
                this.parentId,
            );
        this.composing = false;
        this.reviewId = null;
        this.message = 'پیشنهاد ارسال شد؛ منتظر پاسخ ربات‌ها…';
        this.notify();
    }
    edit(id?: number): void {
        if (!this.context().interactive) return;
        const { humanId } = this.context();
        const offer = id === undefined ? null : this.table.find(id);
        if (id !== undefined && !offer) return;
        if (
            offer &&
            (!['open', 'accepted'].includes(offer.status) ||
                (offer.from !== humanId && offer.to !== humanId))
        )
            return;
        if (offer) {
            this.give = { ...(offer.from === humanId ? offer.give : offer.want) };
            this.want = { ...(offer.from === humanId ? offer.want : offer.give) };
            this.target = offer.from === humanId ? offer.to : offer.from;
            this.parentId = offer.from !== humanId ? offer.id : undefined;
        } else {
            this.parentId = undefined;
            this.target = null;
        }
        if (humanId)
            for (const pending of this.table.pendingFor(humanId))
                if (pending.id !== this.parentId) this.table.withdraw(pending.id, humanId);
        this.composing = true;
        this.reviewId = null;
        this.message = '';
        this.notify();
    }
    respond(id: number, accept: boolean): void {
        if (!this.context().interactive) return;
        const { state, humanId } = this.context();
        if (!state || !humanId) return;
        if (this.table.respond(state, id, humanId, accept)) {
            this.reviewId = accept ? id : null;
            this.composing = false;
            this.message = accept
                ? 'هنوز منابع جابه‌جا نشده؛ جزئیات رو بررسی و نهایی کن.'
                : 'پیشنهاد رو رد کردی؛ چیزی جابه‌جا نشد.';
            if (!accept) {
                this.dismiss();
                this.settled('پیشنهاد رد شد؛ منابع جابه‌جا نشد.');
            }
        } else this.message = 'این پیشنهاد با منابع فعلی قابل قبول نیست.';
        this.notify();
    }
    review(id: number): void {
        if (!this.context().interactive) return;
        const { state, humanId } = this.context();
        const offer = this.table.find(id);
        if (
            !state ||
            !offer ||
            offer.status !== 'accepted' ||
            (offer.from !== humanId && offer.to !== humanId)
        )
            return;
        this.reviewId = id;
        this.composing = false;
        this.message = '';
        this.notify();
    }
    withdraw(id: number): void {
        if (!this.context().interactive) return;
        const { humanId } = this.context();
        if (humanId && this.table.withdraw(id, humanId)) {
            this.reviewId = null;
            this.message = 'پیشنهاد بسته شد؛ منابع جابه‌جا نشد.';
            this.notify();
        }
    }
    dismiss(): void {
        const { humanId } = this.context();
        if (humanId)
            for (const offer of this.table.pendingFor(humanId))
                this.table.withdraw(offer.id, humanId);
        this.reviewId = null;
    }
    finish(id: number): void {
        if (!this.context().interactive) return;
        const { state, humanId } = this.context();
        if (!state || !humanId || this.reviewId !== id) return;
        this.complete(state, id, humanId);
    }
    private complete(state: GameState, id: number, actor: string): void {
        const offer = this.table.find(id);
        if (!offer) return;
        const terms: TradeTerms = {
            from: offer.from,
            to: offer.to,
            give: { ...offer.give },
            want: { ...offer.want },
        };
        const result = this.table.confirm(state, id, actor);
        if (!result.ok) {
            this.message = FA.errors[result.reason];
            this.reviewId = null;
            this.notify();
            return;
        }
        const names = terms.from === this.context().humanId || terms.to === this.context().humanId;
        this.reviewId = null;
        this.composing = false;
        if (names) this.message = 'معامله انجام شد؛ منابع هر دو طرف جابه‌جا شد.';
        this.commit(result, describeTrade(state, terms), { kind: 'domestic-trade', terms });
    }
    botStep(): boolean {
        const { state, humanId, interactive } = this.context();
        if (!state || !this.allowed) return false;
        const accepted = this.table.offers.find(
            (o) =>
                o.status === 'accepted' && o.from !== humanId && o.to !== humanId && !interactive,
        );
        if (accepted) {
            this.complete(state, accepted.id, accepted.from);
            return true;
        }
        const offer = this.table.offers.find(
            (o) => o.status === 'open' && o.to !== humanId && (!interactive || o.from === humanId),
        );
        if (!offer) return false;
        const decision = evaluateBotTrade(state, offer.to, offer);
        if (decision.kind === 'counter') {
            const counter = this.table.propose(state, decision.terms, offer.id);
            if (counter) counter.reason = decision.reason;
            else this.table.respond(state, offer.id, offer.to, false, 'protecting-plan');
        } else
            this.table.respond(
                state,
                offer.id,
                offer.to,
                decision.kind === 'accept',
                decision.reason,
            );
        this.message = 'پاسخ‌ها رسید؛ پیشنهادها رو بررسی کن.';
        if (
            offer.from === humanId &&
            !this.table.pendingFor(humanId!).length &&
            !this.table.offers.some((o) => o.from === humanId && o.status === 'accepted')
        ) {
            this.dismiss();
            this.settled('پیشنهاد پذیرفته نشد؛ منابع جابه‌جا نشد.');
        }
        if (this.waitingForHuman) {
            this.composing = false;
            this.show();
        }
        this.notify();
        return true;
    }
    private humanPitch(): TradeTerms | null {
        const { state, humanId } = this.context();
        if (
            !state ||
            !humanId ||
            !this.allowed ||
            state.players[state.activePlayerIndex].id !== humanId ||
            this.table.attempted.includes('pitch')
        )
            return null;
        return (
            state.players
                .filter((p) => p.id !== humanId)
                .map((p) => proposeBotTrade(state, p.id, humanId))
                .filter((terms): terms is TradeTerms => terms !== null)
                .filter((terms) => this.deliverable(terms))
                .sort(
                    (a, b) => botTradeValue(state, b.from, b) - botTradeValue(state, a.from, a),
                )[0] ?? null
        );
    }
    get canPitchHuman(): boolean {
        return this.humanPitch() !== null;
    }
    pitchHuman(): void {
        const { state } = this.context();
        const terms = this.humanPitch();
        if (!state || !terms) return;
        this.table.attempt('pitch');
        if (!this.table.propose(state, terms)) return;
        this.composing = false;
        this.reviewId = null;
        this.message = 'یکی از رقبا یک پیشنهاد داره؛ قبول، رد یا پیشنهاد متقابل بده.';
        this.show();
        this.notify();
    }
    initiateBot(): boolean {
        const { state, humanId } = this.context();
        if (!state || !this.allowed || state.players[state.activePlayerIndex].id === humanId)
            return false;
        const bot = state.players[state.activePlayerIndex];
        for (const partner of state.players.filter((p) => p.id !== bot.id)) {
            const key = `${bot.id}:${partner.id}`;
            if (this.table.attempted.includes(key)) continue;
            this.table.attempt(key);
            const terms = proposeBotTrade(state, bot.id, partner.id);
            if (!terms || !this.deliverable(terms) || !this.table.propose(state, terms)) continue;
            if (partner.id === humanId) {
                this.composing = false;
                this.reviewId = null;
                this.message = `${bot.name} یک پیشنهاد داره؛ قبول، رد یا پیشنهاد تازه بده.`;
                this.show();
            }
            this.notify();
            return true;
        }
        return false;
    }
    errorFor(offer: TradeOffer): string | null {
        const { state } = this.context();
        return state ? domesticTradeError(state, offer) : 'wrong-phase';
    }
    /** Local interruption filter, not knowledge supplied to the bot's planner.
     * Counteroffers and explicitly opened negotiations still allow unaffordable requests.
     */
    private deliverable(terms: TradeTerms): boolean {
        const { state, humanId } = this.context();
        return (
            terms.to !== humanId ||
            (!!state &&
                canAfford(
                    state.players.find((p) => p.id === humanId)!,
                    terms.want,
                ))
        );
    }
}

export function describeBundle(bundle: ResourceBundle): string {
    return RESOURCE_TYPES.filter((r) => bundle[r])
        .map((r) => `${number(bundle[r])} ${FA.resources[r]}`)
        .join(' + ');
}
function describeTrade(state: GameState, terms: TradeTerms): string {
    const from = state.players.find((p) => p.id === terms.from)!.name;
    const to = state.players.find((p) => p.id === terms.to)!.name;
    return `معامله ${from} با ${to}: ${describeBundle(terms.give)} در برابر ${describeBundle(terms.want)}.`;
}
