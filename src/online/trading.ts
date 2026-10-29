import { emptyBundle, type TradeOffer } from '../game/core/domesticTrade';
import { RESOURCE_TYPES, type ResourceType } from '../game/core/types';
import type { OnlineClient } from './client';

/** UI drafts only. The server remains the sole consent ledger and transfer authority. */
export class OnlineTrading {
    give = emptyBundle();
    want = emptyBundle();
    target: string | null = null;
    parentId: number | undefined;
    composing = true;
    reviewId: number | null = null;
    message = '';
    readonly table;
    constructor(
        private client: OnlineClient,
        private notify: () => void,
    ) {
        this.table = {
            get offers() {
                return client.snapshot?.offers ?? [];
            },
            find: (id: number) => client.snapshot?.offers.find((o) => o.id === id),
        };
    }
    get allowed() {
        return this.client.snapshot?.game?.phase === 'actions';
    }
    get waitingForHuman() {
        return this.table.offers.some(
            (o) =>
                (o.from === this.self || o.to === this.self) &&
                ['open', 'accepted'].includes(o.status),
        );
    }
    private get self() {
        return this.client.snapshot?.game?.self.id;
    }
    get targets() {
        const game = this.client.snapshot?.game;
        return !game || !this.allowed
            ? []
            : game.players
                  .filter(
                      (p) =>
                          p.id !== this.self &&
                          (game.activePlayerId === this.self || p.id === game.activePlayerId),
                  )
                  .map((p) => p.id);
    }
    get draftError(): string | null {
        if (!this.allowed) return 'معامله پس از تاس و مراحل اجباری ممکن است.';
        if (!this.target || !this.targets.includes(this.target)) return 'طرف معامله را انتخاب کن.';
        if (!RESOURCE_TYPES.some((r) => this.give[r]) || !RESOURCE_TYPES.some((r) => this.want[r]))
            return 'هر دو طرف باید منبع بدهند.';
        if (RESOURCE_TYPES.some((r) => this.give[r] && this.want[r]))
            return 'یک منبع نمی‌تواند در هر دو طرف باشد.';
        return RESOURCE_TYPES.some(
            (r) => this.give[r] > (this.client.snapshot?.game?.self.resources[r] ?? 0),
        )
            ? 'منابع پرداختی از دارایی تو بیشتر است.'
            : null;
    }
    adjust(side: 'give' | 'want', resource: ResourceType, delta: number) {
        if (
            !this.composing ||
            !this.allowed ||
            ![-1, 1].includes(delta) ||
            this.client.busy ||
            this.client.pending
        )
            return;
        if (delta > 0 && (side === 'give' ? this.want[resource] : this.give[resource])) return;
        const n = this[side][resource] + delta;
        const max =
            side === 'give' ? (this.client.snapshot?.game?.self.resources[resource] ?? 0) : 999;
        if (n < 0 || n > max) return;
        this[side] = { ...this[side], [resource]: n };
        this.notify();
    }
    selectTarget(id: string | null) {
        if (id && this.targets.includes(id)) {
            this.target = id;
            this.notify();
        }
    }
    send() {
        if (this.client.busy || this.client.pending || this.draftError || !this.target) return;
        void this.client.command({
            kind: 'offer',
            to: this.target,
            give: { ...this.give },
            want: { ...this.want },
            ...(this.parentId === undefined ? {} : { parentId: this.parentId }),
        });
        this.composing = false;
        this.notify();
    }
    edit(id?: number) {
        const offer = id === undefined ? undefined : this.table.find(id);
        if (offer && offer.to === this.self && offer.status === 'open') {
            this.give = { ...offer.want };
            this.want = { ...offer.give };
            this.target = offer.from;
            this.parentId = offer.id;
        } else {
            this.give = emptyBundle();
            this.want = emptyBundle();
            this.parentId = undefined;
            this.target = null;
        }
        this.reviewId = null;
        this.composing = true;
        this.notify();
    }
    respond(id: number, accept: boolean) {
        const o = this.table.find(id);
        if (o && o.to === this.self && o.status === 'open') {
            this.composing = false;
            if (accept) this.reviewId = id;
            void this.client.command({ kind: 'respond', offerId: id, accept });
        }
    }
    review(id: number) {
        const o = this.table.find(id);
        if (o && [o.from, o.to].includes(this.self ?? '') && o.status === 'accepted') {
            this.reviewId = id;
            this.notify();
        }
    }
    withdraw(id: number) {
        const o = this.table.find(id);
        if (o && [o.from, o.to].includes(this.self ?? ''))
            void this.client.command({ kind: 'withdraw', offerId: id });
    }
    finish(id: number) {
        const o = this.table.find(id);
        if (o && !this.errorFor(o) && o.status === 'accepted')
            void this.client.command({ kind: 'confirm', offerId: id });
    }
    errorFor(o: TradeOffer): string | null {
        if (
            !this.allowed ||
            ![o.from, o.to].includes(this.self ?? '') ||
            !['open', 'accepted'].includes(o.status)
        )
            return 'پیشنهاد معتبر نیست.';
        const outgoing = o.from === this.self ? o.give : o.want;
        return RESOURCE_TYPES.some(
            (r) => outgoing[r] > (this.client.snapshot?.game?.self.resources[r] ?? 0),
        )
            ? 'منابع کافی نیست.'
            : null;
    }
    sync() {
        if (
            this.waitingForHuman &&
            !this.parentId &&
            !RESOURCE_TYPES.some((r) => this.give[r] || this.want[r])
        )
            this.composing = false;
    }
}
