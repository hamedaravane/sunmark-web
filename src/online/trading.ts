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
    private publishing = false;
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
        if (!this.targets.length) return 'بازیکن مجازی برای معامله نیست.';
        if (this.parentId !== undefined && (!this.target || !this.targets.includes(this.target)))
            return 'طرف پیشنهاد متقابل دیگر مجاز نیست.';
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
        if (
            !this.composing ||
            this.publishing ||
            this.client.busy ||
            this.client.pending ||
            this.draftError
        )
            return;
        const game = this.client.snapshot!.game!;
        const context = {
            matchId: this.client.snapshot!.id,
            turn: game.turn,
            active: game.activePlayerId,
            self: game.self.id,
        };
        const recipients =
            this.parentId !== undefined && this.target ? [this.target] : this.targets;
        const terms = { give: { ...this.give }, want: { ...this.want }, parentId: this.parentId };
        this.publishing = true;
        this.composing = false;
        this.message = 'در حال ارسال پیشنهاد…';
        this.notify();
        void (async () => {
            let delivered = 0;
            try {
                for (const to of recipients) {
                    const current = this.client.snapshot?.game;
                    if (
                        !current ||
                        current.turn !== context.turn ||
                        current.activePlayerId !== context.active ||
                        current.self.id !== context.self ||
                        this.client.snapshot?.id !== context.matchId ||
                        !this.allowed ||
                        !this.targets.includes(to) ||
                        this.client.busy ||
                        this.client.pending ||
                        RESOURCE_TYPES.some((r) => terms.give[r] > current.self.resources[r])
                    )
                        break;
                    const previousReceipt = this.client.receipt?.commandId;
                    await this.client.command({
                        kind: 'offer',
                        to,
                        give: terms.give,
                        want: terms.want,
                        ...(terms.parentId === undefined ? {} : { parentId: terms.parentId }),
                    });
                    const receipt = this.client.receipt;
                    if (
                        !receipt ||
                        receipt.commandId === previousReceipt ||
                        receipt.intent.kind !== 'offer' ||
                        receipt.intent.to !== to
                    )
                        break;
                    delivered++;
                    if (this.client.error || this.client.pending) break;
                }
            } catch {
                // The transport retains any uncertain command for its ordinary idempotent retry.
            } finally {
                this.publishing = false;
                this.message =
                    delivered === recipients.length
                        ? 'پیشنهاد به همهٔ طرف‌های مجاز ارسال شد؛ منتظر پاسخ‌ها باش.'
                        : delivered > 0
                          ? `پیشنهاد فقط به ${delivered.toLocaleString('fa-IR')} از ${recipients.length.toLocaleString('fa-IR')} طرف رسید؛ اتصال یا نوبت تغییر کرد. پیشنهادهای رسیده را بررسی کن.`
                          : 'ارسال کامل نشد؛ اتصال و وضعیت نوبت را بررسی کن.';
                if (!delivered) this.composing = true;
                this.notify();
            }
        })();
    }
    edit(id?: number) {
        if (this.publishing || this.client.busy || this.client.pending) return;
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
        this.message = '';
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
