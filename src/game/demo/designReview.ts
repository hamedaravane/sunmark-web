/** Development-only visual review. Never reads/writes saves or contacts a server. */
import { GameSession, type Sheet } from '../ui/session';
import { ProgressionStore } from '../progression/progression';
import { ExperiencePreferences } from '../ui/experiencePreferences';
import { mountMatch } from '../matchRuntime';
import { AppPlatform } from '../../pwa/app';
import { createDevelopment } from '../core/developmentDeck';
import { RESOURCE_TYPES } from '../core/types';

declare global {
    interface Window {
        sunmarkReview?: {
            show(name: string): void;
            screens: string[];
            pause(sleep?: boolean): void;
            ready(): boolean;
        };
    }
}
const sheets = [
    'build',
    'trade',
    'domestic',
    'development',
    'development-rules',
    'help',
    'rules',
    'review',
    'history',
    'turn-review',
    'inspect',
    'opponents',
    'experience',
    'experience-guide',
    'journal',
    'characters',
    'profile',
    'profile-name',
    'achievements',
    'cosmetics',
    'competitive',
    'app',
    'update',
    'end-turn',
    'player-name',
    'new-match',
    'introduction',
];
export function startDesignReview(parent: HTMLElement) {
    const preferences = new ExperiencePreferences(null);
    preferences.set('introduced', true);
    preferences.set('anahita', false);
    preferences.set('rivals', false);
    preferences.set('anahitaChosen', true);
    preferences.set('rivalsChosen', true);
    const memory = new Map<string, string>();
    const storage = {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => {
            memory.set(key, value);
        },
        removeItem: (key: string) => {
            memory.delete(key);
        },
    };
    const session = new GameSession(undefined, new ProgressionStore(storage), preferences);
    const app = new AppPlatform();
    const game = mountMatch(parent, session, app);
    const show = (name: string) => {
        session.returnToMenu();
        if (name === 'home') return;
        session.requestPlay(true);
        session.tutorial.pause();
        session.sheet = null;
        session.practice = null;
        session.botPaused = true;
        const state = session.state!;
        state.phase = 'actions';
        state.turn = 4;
        ['میترا', 'اَشی', 'سپنتا آرمیتی'].forEach((name, index) => {
            if (state.players[index + 1]) state.players[index + 1].name = name;
        });
        session.buildFocus = 'road';
        state.lastRoll = [3, 5];
        for (const player of state.players)
            for (const resource of RESOURCE_TYPES) player.resources[resource] = 8;
        state.development = createDevelopment(state.players, () => 0.42);
        const kinds = new Set<string>();
        for (const card of [...state.development.deck]) {
            if (kinds.has(card.kind)) continue;
            kinds.add(card.kind);
            state.development.deck.splice(state.development.deck.indexOf(card), 1);
            state.development.hands[state.players[0].id].push(card);
        }
        session.history = [
            { id: 1, turn: 3, player: state.players[0].id, text: 'آبادی تازه‌ای در جزیره بنا شد.' },
            {
                id: 2,
                turn: 4,
                player: state.players[1].id,
                text: 'میترا تاس ریخت؛ گندم به دارایی تو رسید.',
            },
        ];
        let sheet: Sheet | null = null;
        if (sheets.includes(name)) sheet = { kind: name } as Sheet;
        if (name === 'player' || name === 'rival')
            sheet = { kind: 'player', id: state.players[name === 'rival' ? 1 : 0].id };
        if (name === 'tile') sheet = { kind: 'tile', id: state.board.tiles[0].id };
        if (name === 'port') sheet = { kind: 'port', id: state.board.ports[0].id };
        if (['deal-incoming', 'deal-confirm', 'deal-counter'].includes(name)) {
            session.openSheet({ kind: 'domestic' });
            const offer = session.trading.table.propose(state, {
                from: state.players[1].id,
                to: state.players[0].id,
                give: { wood: 0, brick: 1, wheat: 0, wool: 0, stone: 0 },
                want: { wood: 1, brick: 0, wheat: 0, wool: 0, stone: 0 },
            })!;
            session.trading.composing = false;
            if (name === 'deal-confirm') {
                session.trading.table.respond(state, offer.id, state.players[0].id, true);
                session.trading.review(offer.id);
            } else if (name === 'deal-counter') session.trading.edit(offer.id);
            else session.setBuildGoal(null);
            return;
        }
        if (name === 'roll') state.phase = 'roll';
        if (name === 'bot') state.activePlayerIndex = 1;
        if (name === 'placement') {
            session.chooseBuild('road');
            return;
        }
        if (name === 'results') {
            let added = 0;
            for (const vertex of Object.values(state.board.vertices)) {
                if (added === 4) break;
                if (
                    !vertex.building &&
                    !vertex.neighborIds.some((id) => state.board.vertices[id].building)
                ) {
                    vertex.building = { type: 'city', ownerId: state.players[0].id };
                    added++;
                }
            }
            state.phase = 'finished';
            state.winnerId = state.players[0].id;
            sheet = { kind: 'results' };
        }
        if (name === 'steal') {
            const tile = state.board.tiles.find((t) =>
                [t.vertexIds[0], t.vertexIds[3]].every(
                    (id) =>
                        !state.board.vertices[id].building &&
                        state.board.vertices[id].neighborIds.every(
                            (next) => !state.board.vertices[next].building,
                        ),
                ),
            )!;
            state.board.tiles.forEach((t) => {
                t.robber = t === tile;
            });
            [0, 3].forEach((corner, index) => {
                state.board.vertices[tile.vertexIds[corner]].building = {
                    type: 'settlement',
                    ownerId: state.players[index + 1].id,
                };
            });
        }
        if (name === 'discard' || name === 'steal' || name === 'robber') {
            state.phase = name;
            state.robberResolution = {
                source: 'seven',
                returnPhase: 'actions',
                discards: name === 'discard' ? { [state.players[0].id]: 20 } : {},
                victims: name === 'steal' ? [state.players[1].id, state.players[2].id] : [],
            };
            session.sheet = name === 'robber' ? null : { kind: name };
            session.setBuildGoal(null);
            return;
        }
        if (name === 'player-name' || name === 'new-match')
            sheet = { kind: name, count: 4, guided: false };
        if (sheet) session.openSheet(sheet);
        else session.setBuildGoal(null);
    };
    window.sunmarkReview = {
        ready: () =>
            !!game.scene.getScene('InterfaceScene')?.scene.isActive() &&
            [...parent.querySelectorAll<HTMLElement>('[data-art]')]
                .filter((n) => n.getClientRects().length > 0)
                .every((n) => game.textures.exists(`ui-${n.dataset.art}`)),
        pause: (sleep = true) => {
            if (sleep) game.loop.sleep();
            else game.loop.wake();
        },
        show,
        screens: [
            'home',
            'board',
            'roll',
            'bot',
            'placement',
            ...sheets,
            'player',
            'rival',
            'tile',
            'port',
            'discard',
            'robber',
            'steal',
            'results',
            'deal-incoming',
            'deal-confirm',
            'deal-counter',
        ],
    };
    show(new URL(location.href).searchParams.get('screen') ?? 'home');
}
