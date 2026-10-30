import { playerIdentity } from '../../account/identity';
import { awardChanges } from './scoreMarkup';
import {
    buyDevelopment,
    playDevelopment,
    declareVictory,
    type DevelopmentChoice,
} from '../core/development';
import { discardResources, stealResource, resolutionActor } from '../core/robber';
import { RESOURCE_TYPES } from '../core/types';
import { createPractice, type Practice } from '../tutorial/practice';
import { getProduction } from '../core/production';
import {
    getSetupTargets,
    isSetup,
    placeInitialPiece,
    rollForStart,
    setupPlacementType,
} from '../core/setup';
import { chooseBotCommand } from '../core/bot';
import { executeCommand } from '../core/commands';
import type { MatchAction, MatchTransition } from './transitions';
import {
    buildRoad,
    buildSettlement,
    createGame,
    endTurn,
    moveRobber,
    rollDice,
    tradeWithBank,
    upgradeCity,
    getVictoryPoints,
} from '../core/game';
import { getBuildOption } from '../core/queries';
import { getBankTradeRates, getBankTradeRatio, getPortOwnerId } from '../core/ports';
import type { BuildType } from '../core/building';
import type { ActionResult, GameState, ResourceType, TradeRatio } from '../core/types';
import { FA } from './messages.fa';
import { number } from './components';
import { TutorialDirector } from '../tutorial/director';
import type { LessonId } from '../tutorial/lessons.fa';
import type { MatchStore, SavedMatch } from '../persistence/matchStore';
import { PlayerTrading } from './playerTrading';
import { BOT_NAMES, playerName } from './playerIdentity';
import { ExperiencePreferences, type ExperienceOption } from './experiencePreferences';

export type Sheet =
    | {
          kind:
              | 'build'
              | 'trade'
              | 'development'
              | 'experience'
              | 'experience-guide'
              | 'development-rules'
              | 'discard'
              | 'steal'
              | 'domestic'
              | 'history'
              | 'help'
              | 'rules'
              | 'review'
              | 'results'
              | 'end-turn'
              | 'targets'
              | 'inspect'
              | 'opponents'
              | 'tutorial'
              | 'journal';
      }
    | { kind: 'player' | 'tile' | 'port'; id: string }
    | { kind: 'app' | 'update' | 'introduction' }
    | { kind: 'new-match' | 'player-name'; count: 3 | 4; guided: boolean };
export interface Placement {
    kind: BuildType | 'robber';
    targetId: string | null;
}
export interface MatchEvent {
    id: number;
    turn: number;
    player: string;
    text: string;
}

/** One human controller and local bots; drafts never mutate authoritative state. */
export class GameSession {
    readonly preferences = new ExperiencePreferences();
    buildGoal: BuildType | null = null;
    readonly tutorial = new TutorialDirector();
    practice: Practice | null = null;
    readonly trading = new PlayerTrading(
        () => ({
            state: this.state,
            humanId: this.humanPlayer?.id ?? null,
            interactive: this.sheet?.kind === 'domestic',
        }),
        () => this.emit(),
        (result, text, action) => this.apply(result, text, action),
        () => {
            this.sheet = { kind: 'domestic' };
        },
        (message) => {
            this.sheet = null;
            this.trading.table.attempt('pitch');
            this.record(message);
        },
    );
    private tutorialReturnSheet: Sheet | null = null;
    private gameState: GameState | null = null;
    private controlledPlayerId: string | null = null;
    private transitionId = 0;
    transition: MatchTransition | null = null;
    private listeners = new Set<() => void>();
    sheet: Sheet | null = null;
    placement: Placement | null = null;
    give: ResourceType | null = null;
    receive: ResourceType | null = null;
    private requestedTradeRatio: TradeRatio | null = null;
    notice = '';
    error: string | null = null;
    history: MatchEvent[] = [];
    savedMatch: SavedMatch | null = null;
    selectedDevelopmentId: string | null = null;
    developmentResources: [ResourceType, ResourceType] = ['wood', 'brick'];
    discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
    playerNameDraft = '';

    constructor(private store?: MatchStore) {
        this.savedMatch = store?.read() ?? null;
    }
    get saveStatus() {
        return this.store?.status ?? 'empty';
    }
    requestPlay(guided = false): void {
        if (this.state) return;
        if (guided) {
            this.startPractice();
        } else if (this.savedMatch && this.savedMatch.state.phase !== 'finished') {
            this.resumeSaved();
        } else this.requestStart(4);
    }
    private startPractice(): void {
        this.buildGoal = null;
        const { state, practice } = createPractice();
        this.gameState = state;
        const identity = playerIdentity();
        if (identity) state.players[0].name = identity.name;
        this.practice = practice;
        this.controlledPlayerId = state.players[0].id;
        this.trading.reset();
        this.history = [];
        this.transition = null;
        this.placement = null;
        this.give = this.receive = null;
        this.requestedTradeRatio = null;
        this.error = null;
        this.sheet = null;
        this.tutorialReturnSheet = null;
        this.tutorial.start(false);
        this.tutorial.enabled = true;
        this.tutorial.replay('practice-intro');
        this.record('صفحهٔ تمرین • تاس و دارایی آماده؛ ذخیرهٔ بازی اصلی محفوظ است.');
        this.emit();
    }
    requestStart(count: 3 | 4, guided = true): void {
        if (this.practice) return;
        if (this.state || this.savedMatch) this.openSheet({ kind: 'new-match', count, guided });
        else this.requestName(count, guided);
    }
    confirmNewMatch(): void {
        if (this.sheet?.kind !== 'new-match') return;
        this.requestName(this.sheet.count, this.sheet.guided);
    }
    private requestName(count: 3 | 4, guided: boolean): void {
        const identity = playerIdentity();
        if (identity) {
            this.start(count, guided, identity.name, true);
            return;
        }
        const saved = this.savedMatch;
        const previous =
            this.humanPlayer?.name ??
            saved?.state.players.find(
                (p) => p.id === (saved.humanPlayerId ?? saved.state.players[0].id),
            )?.name;
        this.playerNameDraft = previous && previous !== 'شما' ? previous : '';
        this.openSheet({ kind: 'player-name', count, guided });
    }
    confirmPlayerName(): void {
        if (this.sheet?.kind !== 'player-name') return;
        this.start(this.sheet.count, this.sheet.guided, this.playerNameDraft, true);
    }
    resumeSaved(): void {
        if (this.state || !this.savedMatch) return;
        // The save is JSON data; keep resume compatible with the ES2020 browser target.
        const saved = JSON.parse(JSON.stringify(this.savedMatch)) as SavedMatch;
        this.gameState = saved.state;
        this.controlledPlayerId = saved.humanPlayerId ?? saved.state.players[0].id;
        const identity = playerIdentity();
        const self = this.gameState.players.find((p) => p.id === this.controlledPlayerId);
        if (self && identity) self.name = identity.name;
        this.history = saved.history;
        // Old automatic-opening saves may still have an obsolete setup instruction queued.
        const tutorial =
            !isSetup(saved.state) && !saved.tutorial.replaying
                ? {
                      ...saved.tutorial,
                      queue: saved.tutorial.queue.filter(
                          (id) =>
                              !['setup', 'setup-order', 'setup-road', 'setup-second'].includes(id),
                      ),
                  }
                : saved.tutorial;
        this.tutorial.restore(
            !saved.humanPlayerId && !this.isHumanTurn
                ? { ...tutorial, queue: [], replaying: false }
                : tutorial,
        );
        this.trading.restore(saved.trading);
        this.buildGoal = saved.buildGoal ?? null;
        this.transition = null;
        this.transitionId = 0;
        this.tutorialReturnSheet = null;
        this.sheet =
            saved.state.phase === 'finished'
                ? { kind: 'results' }
                : this.trading.waitingForHuman
                  ? { kind: 'domestic' }
                  : null;
        this.placement = this.requiredPlacement();
        this.give = this.receive = null;
        this.discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
        this.selectedDevelopmentId = null;
        this.requestedTradeRatio = null;
        this.error = null;
        this.notice = 'خوش برگشتی؛ از همون‌جا ادامه می‌دیم.';
        this.emit();
    }
    save(): void {
        if (!this.state || this.practice) return;
        this.trading.sync();
        this.savedMatch = {
            version: 2,
            buildGoal: this.buildGoal,
            humanPlayerId: this.humanPlayer!.id,
            state: this.state,
            tutorial: this.tutorial.snapshot(),
            trading: this.trading.table.snapshot(),
            history: [...this.history],
        };
        this.store?.write(this.savedMatch);
    }

    get state(): GameState | null {
        return this.gameState;
    }
    get humanPlayer() {
        return this.state?.players.find((player) => player.id === this.controlledPlayerId) ?? null;
    }
    get isHumanTurn(): boolean {
        return (
            !!this.state &&
            this.state.players[this.state.activePlayerIndex].id === this.controlledPlayerId
        );
    }
    get botReady(): boolean {
        if (this.practice || !this.state || this.state.phase === 'finished') return false;
        if (['discard', 'robber', 'steal', 'road-building'].includes(this.state.phase))
            return !this.sheet && resolutionActor(this.state) !== this.humanPlayer!.id;
        if (this.sheet && this.sheet.kind !== 'domestic') return false;
        if (this.trading.botWork) return true;
        if (this.isHumanTurn && !this.sheet) return this.trading.canPitchHuman;
        return !this.isHumanTurn && !this.sheet && !this.trading.waitingForHuman;
    }
    get tradeRatio(): TradeRatio {
        if (!this.state || !this.give) return 4;
        return (
            this.requestedTradeRatio ??
            getBankTradeRatio(this.state.board, this.humanPlayer!.id, this.give)
        );
    }
    private requiredPlacement(): Placement | null {
        if (!this.state || !this.isHumanTurn) return null;
        const openingType = setupPlacementType(this.state);
        if (openingType) return { kind: openingType, targetId: null };
        return this.state.phase === 'road-building'
            ? { kind: 'road', targetId: null }
            : this.state.phase === 'robber'
              ? { kind: 'robber', targetId: null }
              : null;
    }
    get targets(): string[] {
        if (!this.state || !this.isHumanTurn || !this.placement) return [];
        if (this.practice) {
            return this.placement.kind === 'road' && this.practice.stage === 'road'
                ? [this.practice.roadId]
                : this.placement.kind === 'settlement' && this.practice.stage === 'settlement'
                  ? [this.practice.settlementId]
                  : [];
        }
        if (isSetup(this.state)) return getSetupTargets(this.state);
        return this.placement.kind === 'robber'
            ? this.state.board.tiles.filter(({ robber }) => !robber).map(({ id }) => id)
            : getBuildOption(this.state, this.placement.kind).legalTargetIds;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private emit(): void {
        if (this.state) {
            this.trading.sync();
            if (
                !this.practice &&
                !['discard', 'steal', 'road-building'].includes(this.state.phase) &&
                this.state.robberResolution?.source !== 'knight'
            )
                this.tutorial.observe(this.tutorialContext());
            if (
                ['discard', 'steal'].includes(this.state.phase) &&
                resolutionActor(this.state) === this.humanPlayer!.id &&
                (!this.sheet || ['discard', 'steal'].includes(this.sheet.kind))
            ) {
                this.sheet = { kind: this.state.phase === 'discard' ? 'discard' : 'steal' };
            }
            if (
                this.tutorial.current &&
                !['discard', 'steal', 'road-building'].includes(this.state.phase) &&
                this.sheet?.kind !== 'tutorial' &&
                this.sheet?.kind !== 'introduction'
            ) {
                this.tutorialReturnSheet = this.sheet;
                this.sheet = { kind: 'tutorial' };
            }
        }
        this.save();
        this.listeners.forEach((listener) => listener());
    }
    private tutorialContext() {
        return {
            state: this.state!,
            sheet: this.sheet,
            placement: this.placement,
            transition: this.transition,
            humanPlayerId: this.humanPlayer!.id,
            reviewingTrade: !!this.give && !!this.receive && this.give !== this.receive,
        };
    }
    continueTutorial(): void {
        if (this.sheet?.kind !== 'tutorial') return;
        this.tutorial.acknowledge();
        if (!this.tutorial.current) {
            this.sheet = this.tutorialReturnSheet;
            this.tutorialReturnSheet = null;
        }
        this.emit();
    }
    setTutorialEnabled(enabled: boolean): void {
        if (!this.state) return;
        if (this.practice) {
            if (!enabled) this.returnToMenu();
            return;
        }
        if (!enabled) {
            this.tutorial.pause();
            if (this.sheet?.kind === 'tutorial') {
                this.sheet = this.tutorialReturnSheet;
                this.tutorialReturnSheet = null;
            }
        } else this.tutorial.resume(this.tutorialContext());
        this.emit();
    }
    replayLesson(id: LessonId): void {
        if (!this.state || this.sheet?.kind !== 'journal') return;
        this.tutorial.replay(id);
        this.emit();
    }
    private record(
        text: string,
        actor = this.state?.players[this.state.activePlayerIndex].name,
    ): void {
        if (!this.state) return;
        this.notice = text;
        this.history.push({
            id: (this.history[this.history.length - 1]?.id ?? 0) + 1,
            turn: this.state.turn,
            player: actor!,
            text,
        });
        if (this.history.length > 100) this.history.shift();
    }

    start(count: 3 | 4, guided = true, name = 'بازیکن', introduce = false): void {
        this.buildGoal = null;
        this.practice = null;
        this.gameState = createGame([playerName(name), ...BOT_NAMES].slice(0, count));
        this.controlledPlayerId = this.gameState.players[0].id;
        this.trading.reset();
        this.sheet = introduce ? { kind: 'introduction' } : null;
        this.placement = this.requiredPlacement();
        this.give = this.receive = null;
        this.discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
        this.selectedDevelopmentId = null;
        this.requestedTradeRatio = null;
        this.history = [];
        this.transition = null;
        this.error = null;
        this.tutorialReturnSheet = null;
        this.tutorial.start(guided);
        this.record(FA.startNote);
        this.emit();
    }
    returnToMenu(): void {
        this.save();
        this.buildGoal = null;
        this.practice = null;
        this.trading.reset();
        this.tutorial.start(false);
        this.tutorialReturnSheet = null;
        this.gameState = null;
        this.controlledPlayerId = null;
        this.sheet = this.placement = null;
        this.give = this.receive = null;
        this.discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
        this.selectedDevelopmentId = null;
        this.requestedTradeRatio = null;
        this.history = [];
        this.transition = null;
        this.notice = '';
        this.error = null;
        this.emit();
    }
    openSheet(sheet: Sheet): void {
        if (
            this.state &&
            ['discard', 'steal', 'road-building', 'robber'].includes(this.state.phase) &&
            ![
                'targets',
                'tile',
                'help',
                'rules',
                'review',
                'history',
                'inspect',
                'app',
                'update',
                'experience',
                'experience-guide',
                'player',
            ].includes(sheet.kind)
        )
            return;
        if (this.practice && ['domestic', 'end-turn', 'journal', 'results'].includes(sheet.kind))
            return;
        if (sheet.kind === 'domestic' && !this.state) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (
            this.state &&
            isSetup(this.state) &&
            ['build', 'trade', 'domestic', 'end-turn'].includes(sheet.kind)
        )
            return;
        if (!this.isHumanTurn && ['trade', 'targets', 'end-turn'].includes(sheet.kind)) return;
        if (sheet.kind === 'player' && !this.state?.players.some((p) => p.id === sheet.id)) return;
        if (this.sheet?.kind === 'domestic' && sheet.kind !== 'domestic') this.trading.dismiss();
        this.sheet = sheet;
        this.emit();
    }
    closeSheet(): void {
        if (this.sheet?.kind === 'domestic') this.trading.dismiss();
        if (this.sheet?.kind === 'experience-guide') this.preferences.set('introduced', true);
        if (this.sheet?.kind === 'tutorial') {
            this.setTutorialEnabled(false);
            return;
        }
        this.sheet = null;
        this.emit();
    }
    setBuildGoal(type: BuildType | null): void {
        if (
            !this.state ||
            this.practice ||
            (type !== null && !['road', 'settlement', 'city'].includes(type))
        )
            return;
        this.buildGoal = this.buildGoal === type ? null : type;
        this.emit();
    }
    setExperienceOption(key: ExperienceOption): void {
        if (
            this.sheet?.kind !== 'experience' &&
            !(this.sheet?.kind === 'introduction' && ['sound', 'haptics'].includes(key))
        )
            return;
        this.preferences.set(key, !this.preferences.snapshot[key]);
        this.emit();
    }
    tradeForResource(resource: ResourceType): void {
        if (
            !this.state ||
            !this.isHumanTurn ||
            this.state.phase !== 'actions' ||
            this.practice ||
            !RESOURCE_TYPES.includes(resource)
        )
            return;
        this.give = null;
        this.receive = resource;
        this.requestedTradeRatio = null;
        this.openSheet({ kind: 'trade' });
    }
    chooseBuild(kind: BuildType): void {
        if (this.practice && this.practice.stage !== kind) return;
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (!this.state || getBuildOption(this.state, kind).reason) return;
        this.placement = { kind, targetId: null };
        this.error = null;
        this.sheet = null;
        this.emit();
    }
    preview(targetId: string): void {
        if (!this.isHumanTurn) return;
        if (this.sheet || !this.placement || !this.targets.includes(targetId)) return;
        this.placement = { ...this.placement, targetId };
        this.error = null;
        this.emit();
    }
    chooseTargetFromSheet(targetId: string): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind !== 'targets' || !this.targets.includes(targetId)) return;
        this.sheet = null;
        this.preview(targetId);
    }
    cancelPlacement(): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        this.placement = this.requiredPlacement();
        this.error = null;
        this.emit();
    }
    chooseTrade(side: 'give' | 'receive', resource: ResourceType): void {
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (side === 'give') this.requestedTradeRatio = null;
        this[side] = resource;
        this.emit();
    }
    chooseTradeRatio(ratio: TradeRatio): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (
            !this.state ||
            !this.give ||
            !getBankTradeRates(this.state.board, this.humanPlayer!.id, this.give).includes(ratio)
        )
            return;
        this.requestedTradeRatio = ratio;
        this.emit();
    }
    tradeFromPort(id: string): void {
        if (this.practice) return;
        if (this.state && isSetup(this.state)) return;
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (!this.state) return;
        const port = this.state.board.ports.find((candidate) => candidate.id === id);
        if (
            !port ||
            getPortOwnerId(this.state.board, port) !==
                this.state.players[this.state.activePlayerIndex].id
        )
            return;
        this.give = port.resource ?? this.give;
        this.requestedTradeRatio = null;
        this.error = null;
        this.sheet = { kind: 'trade' };
        this.emit();
    }
    confirmTrade(): void {
        if (!this.isHumanTurn) return;
        if (this.sheet?.kind === 'tutorial') return;
        if (!this.state || !this.give || !this.receive) return;
        const ratio = this.tradeRatio;
        if (
            this.practice &&
            (this.practice.stage !== 'trade' ||
                this.give !== 'wood' ||
                this.receive !== 'wool' ||
                ratio !== 4)
        ) {
            this.error =
                'در این تمرین، بعد از راه‌سازی ۴ چوب را با ۱ پشم عوض کن؛ اثر انتخاب‌های دیگر را می‌توانی در پیش‌نمایش ببینی.';
            this.emit();
            return;
        }
        this.apply(
            tradeWithBank(this.state, this.give, this.receive, ratio),
            `${FA.tradeCompleted} پرداخت: ${number(ratio)} ${FA.resources[this.give]}؛ دریافت: ۱ ${FA.resources[this.receive]}`,
            { kind: 'trade', give: this.give, receive: this.receive, ratio },
        );
    }
    buyCard(): void {
        if (!this.isHumanTurn || this.practice || this.sheet?.kind !== 'development') return;
        const result = buyDevelopment(this.state!);
        this.apply(result, 'یک کارت توسعه خریدی؛ نوع آن برای حریف‌ها مخفی است.', {
            kind: 'buy-development',
        });
    }
    selectDevelopment(id: string): void {
        if (
            this.sheet?.kind !== 'development' ||
            !this.state?.development?.hands[this.humanPlayer!.id].some((c) => c.id === id)
        )
            return;
        this.selectedDevelopmentId = id;
        this.emit();
    }
    chooseDevelopmentResource(index: 0 | 1, resource: ResourceType): void {
        if (this.sheet?.kind !== 'development' || !RESOURCE_TYPES.includes(resource)) return;
        this.developmentResources[index] = resource;
        this.emit();
    }
    playCard(): void {
        if (
            !this.isHumanTurn ||
            this.practice ||
            this.sheet?.kind !== 'development' ||
            !this.selectedDevelopmentId
        )
            return;
        const cardId = this.selectedDevelopmentId;
        const choice: DevelopmentChoice = {
            resource: this.developmentResources[0],
            resources: [...this.developmentResources],
        };
        this.apply(playDevelopment(this.state!, cardId, choice), 'کارت توسعه بازی شد.', {
            kind: 'play-development',
            cardId,
            choice,
        });
    }
    declareVictory(): void {
        if (!this.isHumanTurn || !this.state || this.practice) return;
        this.apply(declareVictory(this.state), 'پیروزی اعلام شد؛ کارت‌های امتیازی برنده رو شدند.', {
            kind: 'declare-victory',
        });
    }
    adjustDiscard(resource: ResourceType, delta: number): void {
        if (
            this.sheet?.kind !== 'discard' ||
            this.state?.phase !== 'discard' ||
            resolutionActor(this.state) !== this.humanPlayer?.id ||
            ![-1, 1].includes(delta) ||
            !RESOURCE_TYPES.includes(resource)
        )
            return;
        const next = this.discardDraft[resource] + delta;
        if (next < 0 || next > this.humanPlayer.resources[resource]) return;
        this.discardDraft = { ...this.discardDraft, [resource]: next };
        this.emit();
    }
    confirmDiscard(): void {
        if (
            this.sheet?.kind !== 'discard' ||
            !this.state ||
            resolutionActor(this.state) !== this.humanPlayer?.id
        )
            return;
        const resources = { ...this.discardDraft };
        const playerId = this.humanPlayer.id;
        this.apply(
            discardResources(this.state, playerId, resources),
            'منابع انتخاب‌شده دور ریخته شد.',
            { kind: 'discard', playerId, resources },
        );
    }
    stealFrom(victimId: string): void {
        if (!this.isHumanTurn || this.state?.phase !== 'steal' || this.sheet?.kind !== 'steal')
            return;
        this.apply(stealResource(this.state, victimId), 'یک منبع تصادفی گرفتی.', {
            kind: 'steal',
            victimId,
        });
    }

    confirmEndTurn(): void {
        if (this.practice) return;
        if (!this.isHumanTurn) return;
        if (this.state && this.sheet?.kind === 'end-turn')
            this.apply(endTurn(this.state), FA.nextTurn, { kind: 'end-turn' });
    }
    primary(): void {
        if (
            this.state?.phase === 'discard' &&
            resolutionActor(this.state) === this.humanPlayer?.id
        ) {
            this.sheet = { kind: 'discard' };
            this.emit();
            return;
        }
        if (this.state?.phase === 'steal' && this.isHumanTurn) {
            this.sheet = { kind: 'steal' };
            this.emit();
            return;
        }
        if (!this.isHumanTurn && this.state?.phase !== 'finished') return;
        if (!this.state || this.sheet) return;
        const state = this.state;
        if (this.practice && !this.placement && this.practice.stage !== 'roll') {
            if (this.practice.stage === 'complete') this.returnToMenu();
            else this.openSheet({ kind: this.practice.stage === 'trade' ? 'trade' : 'build' });
            return;
        }
        if (state.phase === 'setup-roll') {
            const result = rollForStart(state);
            const dice = result.ok ? result.state.setup!.lastRoll!.dice : null;
            this.apply(result, dice ? `تاس تعیین آغازکننده: ${number(dice[0] + dice[1])}` : '', {
                kind: 'setup-roll',
            });
        } else if (this.placement) {
            const { kind, targetId } = this.placement;
            if (!targetId) return;
            if (isSetup(state) && (kind === 'settlement' || kind === 'road')) {
                this.apply(
                    placeInitialPiece(state, kind, targetId),
                    kind === 'road' ? 'راه آغازینت ثبت شد.' : 'آبادی آغازینت ثبت شد.',
                    { kind: 'setup', type: kind, targetId },
                );
                return;
            }
            if (kind === 'robber')
                this.apply(moveRobber(state, targetId), FA.robberMoved, {
                    kind: 'robber',
                    targetId,
                });
            if (kind === 'road')
                this.apply(buildRoad(state, targetId), FA.roadBuilt, {
                    kind: 'build',
                    type: 'road',
                    targetId,
                });
            if (kind === 'settlement')
                this.apply(buildSettlement(state, targetId), FA.settlementBuilt, {
                    kind: 'build',
                    type: 'settlement',
                    targetId,
                });
            if (kind === 'city')
                this.apply(upgradeCity(state, targetId), FA.cityBuilt, {
                    kind: 'build',
                    type: 'city',
                    targetId,
                });
        } else if (state.phase === 'roll') {
            let dieIndex = 0;
            const practiceDice = this.practice?.dice;
            const result = rollDice(
                state,
                practiceDice ? () => (practiceDice[dieIndex++] - 0.5) / 6 : Math.random,
            );
            let text = '';
            if (result.ok) {
                const dice = result.state.lastRoll!;
                text =
                    dice[0] + dice[1] === 7
                        ? FA.seven
                        : `${FA.rolled}: ${number(dice[0] + dice[1])}`;
                const before = state.players[state.activePlayerIndex].resources;
                const after = result.state.players[state.activePlayerIndex].resources;
                const gains = (Object.keys(before) as ResourceType[])
                    .filter((r) => after[r] > before[r])
                    .map((r) => `${number(after[r] - before[r])} ${FA.resources[r]}`);
                if (gains.length) text += `؛ دریافت شما: ${gains.join('، ')}`;
            }
            this.apply(result, text, { kind: 'roll' });
        } else if (state.phase === 'actions') {
            if (this.give || this.receive) this.openSheet({ kind: 'end-turn' });
            else this.apply(endTurn(state), FA.nextTurn, { kind: 'end-turn' });
        } else if (state.phase === 'finished') {
            this.openSheet({ kind: 'results' });
        }
    }
    /** The dice object has a dedicated guarded command; a second tap can never end a turn. */
    roll(): void {
        if (
            !this.state ||
            this.sheet ||
            !this.isHumanTurn ||
            !['roll', 'setup-roll'].includes(this.state.phase)
        )
            return;
        if (
            !this.practice &&
            this.state.phase === 'roll' &&
            getVictoryPoints(this.state, this.humanPlayer!.id) >= this.state.victoryTarget
        )
            return;
        this.primary();
    }
    advanceBot(expectedState: GameState = this.state!): void {
        if (!this.botReady || this.state !== expectedState) return;
        const state = this.state!;
        if (this.trading.botStep()) return;
        if (
            this.isHumanTurn &&
            !['discard', 'robber', 'steal', 'road-building'].includes(state.phase)
        ) {
            this.trading.pitchHuman();
            return;
        }
        const command = chooseBotCommand(state);
        if (command && ['trade', 'end-turn'].includes(command.kind) && this.trading.initiateBot())
            return;
        if (!command) return;
        const result = executeCommand(state, command);
        const actor = state.players.find((p) => p.id === resolutionActor(state))!.name;
        const text = [
            'buy-development',
            'play-development',
            'discard',
            'steal',
            'declare-victory',
        ].includes(command.kind)
            ? command.kind === 'buy-development'
                ? 'یک کارت توسعه خرید.'
                : command.kind === 'play-development'
                  ? 'یک کارت توسعه بازی کرد.'
                  : command.kind === 'discard'
                    ? 'منابع لازم را دور ریخت.'
                    : command.kind === 'steal'
                      ? 'یک منبع تصادفی گرفت.'
                      : 'پیروزی را اعلام کرد.'
            : command.kind === 'setup-roll' && result.ok
              ? `تاس تعیین آغازکننده: ${number(result.state.setup!.lastRoll!.dice[0] + result.state.setup!.lastRoll!.dice[1])}`
              : command.kind === 'setup'
                ? command.type === 'road'
                    ? 'راه آغازین رو گذاشت.'
                    : 'آبادی آغازین رو گذاشت.'
                : command.kind === 'roll' && result.ok
                  ? `تاس ${number(result.state.lastRoll![0] + result.state.lastRoll![1])}${result.state.phase === 'robber' ? '؛ جابه‌جایی اهریمن' : ''}`
                  : command.kind === 'build'
                    ? { road: FA.roadBuilt, settlement: FA.settlementBuilt, city: FA.cityBuilt }[
                          command.type
                      ]
                    : command.kind === 'robber'
                      ? FA.robberMoved
                      : command.kind === 'trade'
                        ? FA.tradeCompleted
                        : 'نوبتش رو تموم کرد.';
        this.apply(result, `${actor}: ${text}`, command);
    }
    private apply(result: ActionResult, text: string, action: MatchAction): void {
        if (!result.ok) {
            this.tutorial.explainError(result.reason, this.state ? isSetup(this.state) : false);
            this.notice = FA.errors[result.reason];
            this.error = this.notice;
        } else {
            this.error = null;
            const before = this.gameState!;
            this.gameState = result.state;
            if (before.players[before.activePlayerIndex].id === this.humanPlayer!.id) {
                if (action.kind === 'roll' || action.kind === 'setup-roll')
                    this.preferences.set('introduced', true);
                if (action.kind === 'roll') this.tutorial.practiced.add('roll');
                if (
                    ['robber', 'steal'].includes(action.kind) &&
                    before.robberResolution?.source === 'seven' &&
                    !result.state.robberResolution
                )
                    this.tutorial.practiced.add('seven');
            }
            this.transition = {
                id: ++this.transitionId,
                action,
                before,
                after: result.state,
                production:
                    action.kind === 'roll' && result.state.lastRoll
                        ? getProduction(before, result.state.lastRoll[0] + result.state.lastRoll[1])
                        : [],
            };
            const boughtCard =
                action.kind === 'buy-development' &&
                before.players[before.activePlayerIndex].id === this.humanPlayer!.id;
            this.sheet =
                result.state.phase === 'finished'
                    ? { kind: 'results' }
                    : boughtCard
                      ? { kind: 'development' }
                      : null;
            this.discardDraft = { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 };
            const hand = result.state.development?.hands[this.humanPlayer!.id] ?? [];
            this.selectedDevelopmentId = boughtCard ? (hand[hand.length - 1]?.id ?? null) : null;
            this.placement = this.requiredPlacement();
            this.give = this.receive = null;
            this.requestedTradeRatio = null;
            if (action.kind === 'setup-roll') {
                if (result.state.phase === 'setup-settlement')
                    text += `؛ ${result.state.players[result.state.activePlayerIndex].name} جانمایی رو شروع می‌کنه.`;
                else if (
                    result.state.setup?.kind === 'starter' &&
                    !Object.keys(result.state.setup.rolls).length
                )
                    text += '؛ بالاترین تاس مساوی شد، دوباره تاس می‌ندازن.';
            }
            const awards = awardChanges(before, result.state);
            if (awards) text += `؛ ${awards}`;
            this.record(
                text,
                action.kind === 'discard'
                    ? before.players.find((p) => p.id === action.playerId)!.name
                    : before.players[before.activePlayerIndex].name,
            );
            if (this.practice) {
                const practice = this.practice;
                if (action.kind === 'roll' && practice.stage === 'roll') {
                    practice.stage = 'road';
                    this.tutorial.practiced.add('roll');
                    this.tutorial.practiced.add('production');
                    this.tutorial.replay('practice-income');
                } else if (
                    action.kind === 'build' &&
                    action.type === 'road' &&
                    practice.stage === 'road'
                ) {
                    practice.stage = 'trade';
                    this.tutorial.practiced.add('road');
                    this.tutorial.replay('practice-market');
                } else if (action.kind === 'trade' && practice.stage === 'trade') {
                    practice.stage = 'settlement';
                    this.tutorial.practiced.add('bank');
                    this.tutorial.replay('practice-build');
                } else if (
                    action.kind === 'build' &&
                    action.type === 'settlement' &&
                    practice.stage === 'settlement'
                ) {
                    practice.stage = 'complete';
                    this.tutorial.practiced.add('settlement');
                    this.tutorial.replay('practice-complete');
                }
            }
        }
        this.emit();
    }
}
