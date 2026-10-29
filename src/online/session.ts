import { transitionReceipt } from '../game/ui/turnSurface';
import { number } from '../game/ui/components';
import { publicAction } from './presentation';
import { getProduction } from '../game/core/production';
import type { MatchSession } from '../game/ui/matchSession';
import type { RemoteMatchState } from '../game/ui/matchState';
import { getBuildOption, getBankTradeError } from '../game/ui/matchState';
import type { PresentedTransition } from '../game/ui/transitions';
import type { Placement, Sheet, MatchEvent } from '../game/ui/session';
import { ExperiencePreferences, type ExperienceOption } from '../game/ui/experiencePreferences';
import { TutorialDirector } from '../game/tutorial/director';
import type { LessonId } from '../game/tutorial/lessons.fa';
import { getBankTradeRatio, getBankTradeRates, getPortOwnerId } from '../game/core/ports';
import {
    RESOURCE_TYPES,
    type Player,
    type ResourceType,
    type TradeRatio,
} from '../game/core/types';
import type { BuildType } from '../game/core/building';
import type { OnlineClient, Intent } from './client';
import { OnlineTrading } from './trading';

/** Remote authority adapter for the same match runtime used by GameSession. */
export class OnlineSession implements MatchSession {
    readonly preferences = new ExperiencePreferences();
    readonly tutorial = new TutorialDirector();
    readonly practice = null;
    readonly savedMatch = null;
    readonly trading: OnlineTrading;
    state: RemoteMatchState | null = null;
    transition: PresentedTransition | null = null;
    buildGoal: BuildType | null = null;
    sheet: Sheet | null = null;
    placement: Placement | null = null;
    give: ResourceType | null = null;
    receive: ResourceType | null = null;
    selectedDevelopmentId: string | null = null;
    developmentResources: [ResourceType, ResourceType] = ['wood', 'brick'];
    discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    playerNameDraft = '';
    notice = '';
    error: string | null = null;
    history: MatchEvent[] = [];
    private ratio: TradeRatio | null = null;
    private listeners = new Set<() => void>();
    private unsubscribe: () => void;
    private revision = -1;
    private matchId = '';
    private receiptId = '';
    private previous: RemoteMatchState | null = null;
    private transitionId = 0;
    constructor(
        readonly client: OnlineClient,
        private exit: () => void,
    ) {
        this.trading = new OnlineTrading(client, () => this.emit());
        this.tutorial.start(false);
        this.refresh();
        this.unsubscribe = client.subscribe(() => this.refresh());
    }
    get online() {
        return {
            connected: this.client.connected,
            busy: this.client.busy,
            pending: !!this.client.pending,
            retry: () => {
                void this.client.retry();
            },
        };
    }
    get saveStatus(): 'saved' {
        return 'saved';
    } // confirmed remote state is already persisted by the server
    get humanPlayer(): Player | null {
        const v = this.state?.projection;
        return v
            ? { ...v.players.find((p) => p.id === v.self.id)!, resources: v.self.resources }
            : null;
    }
    get isHumanTurn() {
        return (
            !!this.state && this.state.projection.activePlayerId === this.state.projection.self.id
        );
    }
    get tradeRatio() {
        return (
            this.ratio ??
            (this.state && this.give
                ? getBankTradeRatio(this.state.board, this.humanPlayer!.id, this.give)
                : 4)
        );
    }
    get targets() {
        return this.state && this.placement
            ? this.state.projection.availableIntents
                  .filter(
                      (i) =>
                          'targetId' in i &&
                          (this.placement?.kind === 'robber'
                              ? i.kind === 'robber'
                              : (i.kind === 'build' || i.kind === 'setup') &&
                                i.type === this.placement?.kind),
                  )
                  .map((i) => ('targetId' in i ? i.targetId : ''))
            : [];
    }
    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private tutorialContext() {
        return {
            state: this.state!,
            humanPlayerId: this.humanPlayer!.id,
            sheet: this.sheet,
            placement: this.placement,
            transition: this.transition,
            reviewingTrade: !!this.give && !!this.receive && this.give !== this.receive,
        };
    }
    private tutorialReturn: Sheet | null = null;
    private emit() {
        if (
            this.state &&
            this.tutorial.enabled &&
            !['discard', 'steal', 'road-building'].includes(this.state.phase)
        ) {
            this.tutorial.observe(this.tutorialContext());
            if (this.tutorial.current && this.sheet?.kind !== 'tutorial') {
                this.tutorialReturn = this.sheet;
                this.sheet = { kind: 'tutorial' };
            }
        }
        this.listeners.forEach((listener) => listener());
    }
    private refresh() {
        this.error = this.client.error || null;
        const snapshot = this.client.snapshot,
            view = snapshot?.game;
        const newSnapshot =
            !!snapshot &&
            !!view &&
            (snapshot.id !== this.matchId || snapshot.revision !== this.revision);
        if (snapshot && view && newSnapshot) {
            const before = this.state;
            this.state = {
                projection: view,
                bots: Object.fromEntries(snapshot.seats.map((s) => [s.playerId, s.bot])),
                board: view.board,
                players: view.players.map(({ id, name, color }) => ({ id, name, color })),
                phase: view.phase,
                turn: view.turn,
                lastRoll: view.lastRoll,
                winnerId: view.winnerId,
                victoryTarget: view.victoryTarget,
                setup: view.setup,
                awards: view.awards ?? undefined,
                activePlayerIndex: view.players.findIndex((p) => p.id === view.activePlayerId),
                development: {
                    deckCount: view.developmentDeckCount,
                    hands: { [view.self.id]: view.self.developmentCards },
                    knights: Object.fromEntries(view.players.map((p) => [p.id, p.playedKnights])),
                },
                robberResolution: ['discard', 'robber', 'steal'].includes(view.phase)
                    ? { discards: view.discardObligations, victims: view.eligibleVictims }
                    : null,
                roadBuilding: null,
            };
            const contiguous =
                this.matchId === snapshot.id && this.revision + 1 === snapshot.revision;
            this.matchId = snapshot.id;
            this.revision = snapshot.revision;
            // Only an acknowledged local intent gets a command-specific effect.
            // Remote/coalesced snapshots remain a synchronization, never guessed moves.
            if (before) {
                this.previous = before;
                this.transition = {
                    id: ++this.transitionId,
                    before,
                    after: this.state,
                    action: contiguous ? publicAction(before, this.state) : { kind: 'synchronize' },
                    production:
                        contiguous && before.phase === 'roll' && this.state.lastRoll
                            ? getProduction(
                                  before,
                                  this.state.lastRoll[0] + this.state.lastRoll[1],
                              ).filter((g) => g.playerId === view.self.id)
                            : [],
                };
                const receiptText = transitionReceipt(this.transition, view.self.id);
                this.notice =
                    receiptText ||
                    (this.transition.action.kind === 'setup-roll' && view.setup?.lastRoll
                        ? `تاس تعیین آغازکننده: ${number(view.setup.lastRoll.dice[0] + view.setup.lastRoll.dice[1])}`
                        : this.transition.action.kind === 'end-turn'
                          ? 'نوبت بعد آغاز شد.'
                          : 'وضعیت تازهٔ بازی دریافت شد.');
                this.history.push({
                    id: snapshot.revision,
                    turn: view.turn,
                    player: before.players[before.activePlayerIndex].name,
                    text: this.notice,
                });
                this.history = this.history.slice(-100);
            }
            this.placement = this.requiredPlacement();
            this.give = this.receive = null;
            this.ratio = null;
            this.discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
            if (view.phase === 'finished') this.sheet = { kind: 'results' };
            else if (view.actorId === view.self.id && ['discard', 'steal'].includes(view.phase))
                this.sheet = { kind: view.phase === 'discard' ? 'discard' : 'steal' };
            this.trading.sync();
        }
        const receipt = this.client.receipt;
        if (receipt && receipt.commandId !== this.receiptId) {
            this.receiptId = receipt.commandId;
            const before = this.previous,
                after = this.state;
            if (
                before &&
                after &&
                receipt.revision === this.revision &&
                receipt.expectedRevision === receipt.revision - 1
            ) {
                const intent = receipt.intent;
                const action =
                    intent.kind === 'discard'
                        ? { ...intent, playerId: after.projection.self.id }
                        : ['offer', 'respond', 'withdraw', 'confirm'].includes(intent.kind)
                          ? null
                          : intent;
                if (
                    action &&
                    action.kind !== 'offer' &&
                    action.kind !== 'respond' &&
                    action.kind !== 'withdraw' &&
                    action.kind !== 'confirm'
                ) {
                    if (newSnapshot)
                        this.transition = {
                            id: ++this.transitionId,
                            before,
                            after,
                            action,
                            production:
                                action.kind === 'roll' && after.lastRoll
                                    ? getProduction(
                                          before,
                                          after.lastRoll[0] + after.lastRoll[1],
                                      ).filter((g) => g.playerId === after.projection.self.id)
                                    : [],
                        };
                    if (!['discard', 'steal', 'finished'].includes(after.phase))
                        this.sheet =
                            action.kind === 'buy-development' ? { kind: 'development' } : null;
                    if (action.kind === 'buy-development') {
                        this.sheet = { kind: 'development' };
                        const old = new Set(
                            before.projection.self.developmentCards.map((c) => c.id),
                        );
                        this.selectedDevelopmentId =
                            after.projection.self.developmentCards.find((c) => !old.has(c.id))
                                ?.id ?? null;
                    }
                }
            }
        }
        this.emit();
    }
    private requiredPlacement(): Placement | null {
        const v = this.state?.projection;
        if (!v || v.actorId !== v.self.id) return null;
        return v.phase === 'setup-settlement'
            ? { kind: 'settlement', targetId: null }
            : v.phase === 'setup-road' || v.phase === 'road-building'
              ? { kind: 'road', targetId: null }
              : v.phase === 'robber'
                ? { kind: 'robber', targetId: null }
                : null;
    }
    private submit(intent: Intent) {
        const v = this.state?.projection;
        if (!v || this.client.busy || this.client.pending) return;
        if (
            !['discard'].includes(intent.kind) &&
            !v.availableIntents.some(
                (i) =>
                    Object.keys(i).length === Object.keys(intent).length &&
                    Object.entries(intent).every(
                        ([key, value]) =>
                            JSON.stringify(Reflect.get(i, key)) === JSON.stringify(value),
                    ),
            )
        )
            return;
        void this.client.command(intent);
    }
    openSheet(sheet: Sheet) {
        if (!this.state) return;
        if (
            (sheet.kind === 'player' && !this.state.players.some((p) => p.id === sheet.id)) ||
            (sheet.kind === 'tile' && !this.state.board.tiles.some((t) => t.id === sheet.id)) ||
            (sheet.kind === 'port' && !this.state.board.ports.some((p) => p.id === sheet.id))
        )
            return;
        this.sheet = sheet;
        this.emit();
    }
    closeSheet() {
        if (this.sheet?.kind === 'experience-guide') this.preferences.set('introduced', true);
        if (this.sheet?.kind === 'tutorial') {
            this.setTutorialEnabled(false);
            return;
        }
        this.sheet = null;
        this.emit();
    }
    setBuildGoal(kind: BuildType | null) {
        this.buildGoal = kind;
        this.emit();
    }
    setExperienceOption(key: ExperienceOption) {
        this.preferences.set(key, !this.preferences.snapshot[key]);
        this.emit();
    }
    chooseBuild(kind: BuildType) {
        if (!this.state || getBuildOption(this.state, kind, this.humanPlayer!.id).reason) return;
        this.placement = { kind, targetId: null };
        this.sheet = null;
        this.emit();
    }
    preview(id: string) {
        if (!this.client.busy && !this.client.pending && !this.sheet && this.targets.includes(id)) {
            this.placement = { kind: this.placement!.kind, targetId: id };
            this.emit();
        }
    }
    chooseTargetFromSheet(id: string) {
        if (this.targets.includes(id)) {
            this.sheet = null;
            this.preview(id);
        }
    }
    cancelPlacement() {
        this.placement = this.requiredPlacement();
        this.emit();
    }
    chooseTrade(side: 'give' | 'receive', r: ResourceType) {
        this[side] = r;
        if (side === 'give') this.ratio = null;
        this.emit();
    }
    chooseTradeRatio(ratio: TradeRatio) {
        if (
            this.state &&
            this.give &&
            getBankTradeRates(this.state.board, this.humanPlayer!.id, this.give).includes(ratio)
        ) {
            this.ratio = ratio;
            this.emit();
        }
    }
    tradeForResource(r: ResourceType) {
        this.receive = r;
        this.give = null;
        this.ratio = null;
        this.openSheet({ kind: 'trade' });
    }
    tradeFromPort(id: string) {
        const p = this.state?.board.ports.find((p) => p.id === id);
        if (p && getPortOwnerId(this.state!.board, p) === this.humanPlayer!.id) {
            this.give = p.resource;
            this.openSheet({ kind: 'trade' });
        }
    }
    confirmTrade() {
        if (
            this.state &&
            this.give &&
            this.receive &&
            !getBankTradeError(this.state, this.give, this.receive, this.tradeRatio)
        )
            this.submit({
                kind: 'trade',
                give: this.give,
                receive: this.receive,
                ratio: this.tradeRatio,
            });
    }
    buyCard() {
        this.submit({ kind: 'buy-development' });
    }
    selectDevelopment(id: string) {
        if (this.state?.projection.self.developmentCards.some((c) => c.id === id)) {
            this.selectedDevelopmentId = id;
            this.emit();
        }
    }
    chooseDevelopmentResource(index: 0 | 1, r: ResourceType) {
        this.developmentResources[index] = r;
        this.emit();
    }
    playCard() {
        const candidate = this.state?.projection.availableIntents.find(
            (i) =>
                i.kind === 'play-development' &&
                i.cardId === this.selectedDevelopmentId &&
                (!i.choice?.resource || i.choice.resource === this.developmentResources[0]) &&
                (!i.choice?.resources ||
                    i.choice.resources.every((r, j) => r === this.developmentResources[j])),
        );
        if (candidate) this.submit(candidate);
    }
    declareVictory() {
        this.submit({ kind: 'declare-victory' });
    }
    adjustDiscard(r: ResourceType, delta: number) {
        const n = this.discardDraft[r] + delta;
        if ([-1, 1].includes(delta) && n >= 0 && n <= (this.humanPlayer?.resources[r] ?? 0)) {
            this.discardDraft = { ...this.discardDraft, [r]: n };
            this.emit();
        }
    }
    confirmDiscard() {
        const v = this.state?.projection;
        if (
            v &&
            v.actorId === v.self.id &&
            RESOURCE_TYPES.reduce((n, r) => n + this.discardDraft[r], 0) ===
                (v.discardObligations[v.self.id] ?? 0)
        )
            this.submit({ kind: 'discard', resources: { ...this.discardDraft } });
    }
    stealFrom(id: string) {
        this.submit({ kind: 'steal', victimId: id });
    }
    confirmEndTurn() {
        this.submit({ kind: 'end-turn' });
    }
    primary() {
        const v = this.state?.projection;
        if (!v || this.sheet) return;
        if (v.phase === 'finished') {
            this.openSheet({ kind: 'results' });
            return;
        }
        if (v.phase === 'discard' || v.phase === 'steal') {
            if (v.actorId === v.self.id) this.openSheet({ kind: v.phase });
            return;
        }
        const p = this.placement;
        if (p?.targetId) {
            const i = v.availableIntents.find(
                (i) =>
                    'targetId' in i &&
                    i.targetId === p.targetId &&
                    (p.kind === 'robber'
                        ? i.kind === 'robber'
                        : (i.kind === 'setup' || i.kind === 'build') && i.type === p.kind),
            );
            if (i) this.submit(i);
        } else if (v.phase === 'roll' || v.phase === 'setup-roll') this.roll();
        else if (v.phase === 'actions') {
            if (this.give || this.receive) this.openSheet({ kind: 'end-turn' });
            else this.confirmEndTurn();
        }
    }
    roll() {
        const i = this.state?.projection.availableIntents.find(
            (i) => i.kind === 'roll' || i.kind === 'setup-roll',
        );
        if (i) this.submit(i);
    }
    returnToMenu() {
        this.exit();
    }
    requestStart() {
        this.exit();
    }
    confirmNewMatch() {
        this.exit();
    }
    requestPlay() {
        this.exit();
    }
    confirmPlayerName() {
        this.exit();
    }
    resumeSaved() {
        this.exit();
    }
    save() {
        /* Server acknowledgement is the persistence boundary. */
    }
    continueTutorial() {
        this.tutorial.acknowledge();
        if (!this.tutorial.current) {
            this.sheet = this.tutorialReturn;
            this.tutorialReturn = null;
        }
        this.emit();
    }
    setTutorialEnabled(enabled: boolean) {
        if (!enabled) {
            this.tutorial.pause();
            if (this.sheet?.kind === 'tutorial') this.sheet = this.tutorialReturn;
            this.tutorialReturn = null;
        } else if (this.state) this.tutorial.resume(this.tutorialContext());
        this.emit();
    }
    replayLesson(id: LessonId) {
        this.tutorial.replay(id);
        this.sheet = { kind: 'tutorial' };
        this.emit();
    }
    destroy() {
        this.unsubscribe();
        this.listeners.clear();
    }
}
