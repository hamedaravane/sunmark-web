import { OnlineSession } from '../src/online/session';
import { actionDock } from '../src/game/ui/turnMarkup';
import { humanHeader, humanHand } from '../src/game/ui/humanHud';
import { advancedSheet } from '../src/game/ui/advancedMarkup';
import { domesticContent } from '../src/game/ui/domesticSheet';
import { sheetContent } from '../src/game/ui/sheets';
import { viewerResources } from '../src/game/ui/matchState';
import { menuContent } from '../src/game/ui/menu';
import { GameSession } from '../src/game/ui/session';
import { AppPlatform } from '../src/pwa/app';
import { describe, it, expect, vi } from 'vitest';
import { io } from 'socket.io-client';
import { createGame } from '../src/game/core/game';
import { OnlineClient } from '../src/online/client';
import { onlineMarkup, newDrafts } from '../src/online/markup';
import { matchSnapshotSchema } from '../src/online/shared/src/online/wire';
import type { paths } from '../src/online/shared/http';
const matchId = '10000000-0000-4000-8000-000000000000';
const sessionId = '20000000-0000-4000-8000-000000000000';
const commandId = '30000000-0000-4000-8000-000000000000';
const snapshot = () => {
    const state = createGame(['A', 'B', 'C', 'D'], () => 0.42);
    return matchSnapshotSchema.parse({
        protocolVersion: 1,
        rulesVersion: '3ef03a7fd848e16137e06445c4927cec5f89d3c2',
        id: matchId,
        name: 'Room',
        code: '0123456789ab',
        status: 'playing',
        revision: 0,
        host: true,
        seats: state.players.map((p, i) => ({
            playerId: p.id,
            name: p.name,
            bot: false,
            ready: true,
            occupied: true,
            isYou: i === 0,
        })),
        offers: [],
        game: {
            protocolVersion: 1,
            board: state.board,
            phase: state.phase,
            turn: 1,
            actorId: 'player-1',
            activePlayerId: 'player-1',
            lastRoll: null,
            winnerId: null,
            victoryTarget: 10,
            setup: state.setup,
            awards: state.awards,
            discardObligations: {},
            eligibleVictims: [],
            developmentDeckCount: 25,
            playedDevelopment: [],
            availableIntents: [{ kind: 'setup-roll' }],
            players: state.players.map((p) => ({
                id: p.id,
                name: p.name,
                color: p.color,
                resourceCount: 0,
                developmentCount: 0,
                playedKnights: 0,
                publicScore: 0,
            })),
            self: {
                id: 'player-1',
                resources: state.players[0].resources,
                developmentCards: [],
                score: 0,
            },
        },
    });
};
const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const noNetworkSocket = () => {
    const socket = io('http://localhost:1/online', { autoConnect: false });
    vi.spyOn(socket, 'connect').mockReturnValue(socket);
    return socket;
};
describe('online frontend', () => {
    it('uses the browser fetch receiver for first entry, guest creation and session restore', async () => {
        let created = false;
        const request = vi.spyOn(globalThis, 'fetch').mockImplementation(function (
            this: unknown,
            input,
            init,
        ) {
            if (this !== globalThis) throw new TypeError('Illegal invocation');
            if (String(input).endsWith('/session')) {
                if (init?.method === 'POST') created = true;
                return Promise.resolve(
                    created
                        ? json({ id: sessionId, name: 'New guest' })
                        : json({ message: 'Guest session required' }, 401),
                );
            }
            return Promise.resolve(json([]));
        });
        const client = new OnlineClient('https://game.example.test', null);
        try {
            await client.initialize();
            expect(client.error).toBe('');
            expect(client.session).toBeNull();
            await client.guest('New guest');
            expect(client.error).toBe('');
            expect(client.session).toEqual({ id: sessionId, name: 'New guest' });
            await client.initialize();
            expect(client.error).toBe('');
            expect(client.matches).toEqual([]);
            expect(request).toHaveBeenCalledTimes(5);
        } finally {
            client.destroy();
            request.mockRestore();
        }
    });
    it('hides online play in an explicitly offline-only build', () => {
        vi.stubEnv('VITE_ONLINE_ENABLED', 'false');
        const markup = menuContent(new AppPlatform(), new GameSession());
        expect(markup).not.toContain('data-action="online"');
        expect(markup).toContain('data-action="play"');
    });
    it('keeps the runtime match contract compatible with the generated HTTP response type', () => {
        const response: paths['/api/v1/online/matches/{id}']['get']['responses'][200]['content']['application/json'] =
            snapshot();
        expect(response.game?.board.tiles).toHaveLength(19);
    });
    it('renders lobby readiness, explicit bot selection, and escaped player names', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: '<img src=x onerror=attack>' };
        expect(onlineMarkup(client, newDrafts())).not.toContain('<img');
        client.snapshot = snapshot();
        client.snapshot.status = 'lobby';
        client.snapshot.game = null;
        client.snapshot.seats[1] = { ...client.snapshot.seats[1], occupied: false, ready: false };
        const markup = onlineMarkup(client, newDrafts());
        expect(markup).toContain('data-online="bot:1:true"');
        expect(markup).toContain('data-online="start"');
        expect(markup).toContain('data-online="invite"');
    });
    it('exposes confirmation, mandatory discards, trade consent and rematch controls', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        client.snapshot = snapshot();
        client.snapshot.game!.phase = 'setup-settlement';
        const session = new OnlineSession(client, () => {});
        session.placement = { kind: 'settlement', targetId: 'selected' };
        expect(actionDock(session)).toContain('data-action="primary"');
        const game = client.snapshot.game;
        if (!game) throw new Error('Missing fixture');
        game.phase = 'discard';
        game.discardObligations = { 'player-1': 4 };
        session.state!.phase = 'discard';
        session.state!.robberResolution = { discards: game.discardObligations, victims: [] };
        session.sheet = { kind: 'discard' };
        expect(advancedSheet(session)?.footer).toContain('data-action="confirm-discard"');
        game.phase = 'actions';
        session.state!.phase = 'actions';
        session.sheet = { kind: 'domestic' };
        session.trading.composing = false;
        client.snapshot.offers = [
            {
                id: 1,
                from: 'player-2',
                to: 'player-1',
                give: { wood: 1, brick: 0, wheat: 0, wool: 0, stone: 0 },
                want: { wood: 0, brick: 1, wheat: 0, wool: 0, stone: 0 },
                status: 'open',
            },
        ];
        expect(domesticContent(session).body).toContain('data-action="deal-accept:1"');
        expect(domesticContent(session).body).toContain('data-action="deal-counter:1"');
        client.snapshot.offers[0].status = 'accepted';
        expect(domesticContent(session).body).toContain('data-action="deal-review:1"');
        game.winnerId = 'player-1';
        game.phase = 'finished';
        client.snapshot.status = 'finished';
        session.state!.phase = 'finished';
        session.state!.winnerId = 'player-1';
        session.sheet = { kind: 'results' };
        expect(sheetContent(session).footer).toContain('data-action="new-game"');
        session.destroy();
        client.destroy();
    });
    it('keeps room entry separate and sends started games to the shared match runtime', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        const draft = newDrafts();
        expect(onlineMarkup(client, draft)).not.toContain('data-draft="code"');
        draft.screen = 'join';
        expect(onlineMarkup(client, draft)).toContain('data-draft="code"');
        client.snapshot = snapshot();
        expect(onlineMarkup(client, draft)).toBe('');
    });
    it('uses the common HUD and keeps remote private data out of public players', () => {
        const client = new OnlineClient('http://unused', null);
        client.snapshot = snapshot();
        const session = new OnlineSession(client, () => {});
        expect(humanHeader(session)).toContain('header-personal');
        expect(humanHand(session)).toContain('hand-resource');
        expect(actionDock(session)).toContain('dock-roll-options');
        expect(session.state?.board).toBe(client.snapshot.game?.board);
        expect(session.state?.players[1]).not.toHaveProperty('resources');
        expect(session.state?.development.hands).not.toHaveProperty('player-2');
        expect(() => viewerResources(session.state!, 'player-2')).toThrow('private');
        session.destroy();
        client.destroy();
    });
    it('renders identical header, hand and dock from equivalent local and remote views', () => {
        const local = new GameSession();
        local.start(4, false, 'A');
        const state = local.state!;
        const remote = snapshot();
        if (!remote.game) throw new Error('Missing view');
        remote.game.board = state.board;
        remote.game.turn = state.turn;
        remote.game.setup = state.setup ?? null;
        remote.game.players = remote.game.players.map((p, i) => ({
            ...p,
            name: state.players[i].name,
            color: state.players[i].color,
        }));
        remote.seats = remote.seats.map((seat, i) => ({
            ...seat,
            name: state.players[i].name,
            bot: i !== 0,
        }));
        const client = new OnlineClient('http://unused', null);
        client.snapshot = remote;
        const online = new OnlineSession(client, () => {});
        expect(humanHeader(online)).toBe(humanHeader(local));
        expect(humanHand(online)).toBe(humanHand(local));
        expect(actionDock(online)).toBe(actionDock(local));
        online.destroy();
        client.destroy();
    });
    it('validates remote trades using only this seat and never guesses opponent balances', () => {
        const client = new OnlineClient('http://unused', null);
        client.snapshot = snapshot();
        const view = client.snapshot.game!;
        view.phase = 'actions';
        view.self.resources.wood = 2;
        const session = new OnlineSession(client, () => {});
        session.trading.selectTarget('player-2');
        session.trading.adjust('give', 'wood', 1);
        session.trading.adjust('want', 'brick', 1);
        expect(session.trading.draftError).toBeNull();
        session.trading.adjust('give', 'wood', 1);
        session.trading.adjust('give', 'wood', 1);
        expect(session.trading.give.wood).toBe(2);
        session.trading.adjust('want', 'wood', 1);
        expect(session.trading.want.wood).toBe(0);
        session.destroy();
        client.destroy();
    });
    it('does not replay shared feedback when the socket snapshot arrives before its HTTP receipt', async () => {
        const before = snapshot();
        const after = snapshot();
        before.game!.phase = 'roll';
        before.game!.availableIntents = [{ kind: 'roll' }];
        after.revision = 1;
        after.game!.phase = 'actions';
        after.game!.lastRoll = [3, 4];
        const request = vi.fn<typeof fetch>();
        request
            .mockResolvedValueOnce(json(after))
            .mockResolvedValueOnce(json({ commandId, revision: 1, snapshot: after }));
        const client = new OnlineClient('http://unused', null, request, noNetworkSocket);
        client.snapshot = before;
        const session = new OnlineSession(client, () => {});
        await client.open(matchId);
        const shown = session.transition;
        expect(shown?.action.kind).toBe('roll');
        client.pending = {
            protocolVersion: 1,
            matchId,
            commandId,
            expectedRevision: 0,
            intent: { kind: 'roll' },
        };
        await client.retry();
        expect(client.pending).toBeNull();
        expect(session.transition).toBe(shown);
        session.destroy();
        client.destroy();
    });
    it('restores pending commands without replaying them, then explicitly retries the same UUID', async () => {
        const pending = {
            protocolVersion: 1,
            matchId,
            commandId,
            expectedRevision: 0,
            intent: { kind: 'setup-roll' },
        };
        const saved = JSON.stringify({ matchId, pending });
        const request = vi.fn<typeof fetch>();
        request
            .mockResolvedValueOnce(json({ id: sessionId, name: 'A' }))
            .mockResolvedValueOnce(json([]))
            .mockResolvedValueOnce(json(snapshot()));
        const client = new OnlineClient(
            'http://unused',
            { getItem: () => saved, setItem: () => {}, removeItem: () => {} },
            request,
            noNetworkSocket,
        );
        try {
            await client.initialize();
            expect(client.pending?.commandId).toBe(commandId);
            expect(request.mock.calls.some(([url]) => String(url).endsWith('/commands'))).toBe(
                false,
            );
            const next = { ...snapshot(), revision: 1 };
            request.mockResolvedValueOnce(json({ commandId, revision: 1, snapshot: next }));
            await client.retry();
            const call = request.mock.calls.at(-1);
            expect(JSON.parse(String(call?.[1]?.body))).toEqual(pending);
            expect(client.pending).toBeNull();
            expect(client.snapshot?.revision).toBe(1);
        } finally {
            client.destroy();
        }
    });
    it('rejects an incompatible snapshot without displaying it as a match', async () => {
        const request = vi
            .fn<typeof fetch>()
            .mockResolvedValue(json({ ...snapshot(), protocolVersion: 999 }));
        const client = new OnlineClient('http://unused', null, request, noNetworkSocket);
        try {
            await client.open(matchId);
            expect(client.snapshot).toBeNull();
            expect(client.error).not.toBe('');
        } finally {
            client.destroy();
        }
    });
});

describe('simple online entry', () => {
    it('exposes quick/private actions without a room-name field', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        const markup = onlineMarkup(client, newDrafts());
        expect(markup).toContain('data-online="quick"');
        expect(markup).toContain('data-online="create"');
        expect(markup).toContain('data-online="screen:join"');
        expect(markup).not.toContain('data-draft="lobby"');
        const draft = newDrafts();
        draft.screen = 'join';
        expect(onlineMarkup(client, draft)).toContain('inputmode="numeric"');
    });
    it('shows queue progress, allows cancellation and opens an automatically assigned match', async () => {
        vi.useFakeTimers();
        const request = vi.fn(async (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
            const action = JSON.parse(String(init?.body)) as { kind: string };
            return json(
                action.kind === 'cancel'
                    ? { state: 'idle', count: 0, snapshot: null }
                    : { state: 'waiting', count: 3, snapshot: null },
            );
        });
        const client = new OnlineClient('http://unused', null, request, noNetworkSocket);
        try {
            client.session = { id: sessionId, name: 'A' };
            await client.quickMatch();
            expect(onlineMarkup(client, newDrafts())).toContain('data-online="cancel-search"');
            await client.quickMatch('cancel');
            await vi.advanceTimersByTimeAsync(5000);
            expect(request).toHaveBeenCalledTimes(2);
            request.mockResolvedValueOnce(
                json({ state: 'matched', count: 4, snapshot: snapshot() }),
            );
            await client.quickMatch();
            expect(client.snapshot?.game?.self.id).toBe('player-1');
        } finally {
            client.destroy();
            vi.useRealTimers();
        }
    });
});

it('expired online cookies return to sign-in without erasing saved seat recovery', async () => {
    const storage = new Map<string, string>();
    const client = new OnlineClient(
        'http://unused',
        {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => {
                storage.set(key, value);
            },
            removeItem: (key) => {
                storage.delete(key);
            },
        },
        async () => json({ message: 'Expired' }, 401),
    );
    client.session = { id: sessionId, name: 'A' };
    await client.create();
    expect(client.session).toBeNull();
    expect(onlineMarkup(client, newDrafts())).toContain('data-online="account"');
    client.destroy();
});
