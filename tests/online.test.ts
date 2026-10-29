import { menuContent } from '../src/game/ui/menu';
import { GameSession } from '../src/game/ui/session';
import { AppPlatform } from '../src/pwa/app';
import { describe, it, expect, vi } from 'vitest';
import { io } from 'socket.io-client';
import { createGame } from '../src/game/core/game';
import { OnlineClient } from '../src/online/client';
import { onlineMarkup, newDrafts, validOffer, validDiscard } from '../src/online/markup';
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
        expect(markup).toContain('data-online="ready"');
        expect(markup).toContain('data-online="invite"');
    });
    it('exposes confirmation, mandatory discards, trade consent and rematch controls', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        client.snapshot = snapshot();
        const draft = newDrafts();
        draft.target = 0;
        expect(onlineMarkup(client, draft)).toContain('data-online="confirm"');
        const game = client.snapshot.game;
        if (!game) throw new Error('Missing fixture');
        game.phase = 'discard';
        game.discardObligations = { 'player-1': 4 };
        expect(onlineMarkup(client, draft)).toContain('data-online="discard"');
        draft.selected = 'trade';
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
        expect(onlineMarkup(client, draft)).toContain('data-online="accept:1"');
        expect(onlineMarkup(client, draft)).toContain('data-online="counter:1"');
        client.snapshot.offers[0].status = 'accepted';
        expect(onlineMarkup(client, draft)).toContain('data-online="trade-confirm:1"');
        game.winnerId = 'player-1';
        game.phase = 'finished';
        client.snapshot.status = 'finished';
        expect(onlineMarkup(client, draft)).toContain('data-online="rematch"');
        client.destroy();
    });
    it('keeps room entry separate and validates a private hand without opponent data', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        const draft = newDrafts();
        expect(onlineMarkup(client, draft)).not.toContain('data-draft="code"');
        draft.screen = 'join';
        expect(onlineMarkup(client, draft)).toContain('data-draft="code"');
        expect(onlineMarkup(client, draft)).not.toContain('data-draft="lobby"');
        const game = snapshot().game;
        if (!game) throw new Error('Missing fixture');
        game.self.resources.wood = 2;
        game.discardObligations[game.self.id] = 2;
        draft.discard.wood = 3;
        expect(validDiscard(game, draft)).toBe(false);
        draft.discard.wood = 2;
        expect(validDiscard(game, draft)).toBe(true);
        draft.to = 'player-2';
        draft.offerGive.wood = 1;
        draft.offerWant.brick = 1;
        expect(validOffer(game, draft)).toBe(true);
        draft.offerWant.wood = 1;
        expect(validOffer(game, draft)).toBe(false);
        draft.offerWant.wood = 0;
        draft.offerGive.wood = 3;
        expect(validOffer(game, draft)).toBe(false);
        client.destroy();
    });
    it('keeps destination IDs out of player-facing choices and hides idle board targets', () => {
        const client = new OnlineClient('http://unused', null);
        client.session = { id: sessionId, name: 'A' };
        client.snapshot = snapshot();
        const game = client.snapshot.game;
        if (!game) throw new Error('Missing fixture');
        game.availableIntents = [
            { kind: 'setup', type: 'settlement', targetId: 'private-internal-vertex' },
        ];
        const draft = newDrafts();
        draft.tool = 'setup-settlement';
        expect(onlineMarkup(client, draft)).not.toContain('private-internal-vertex');
        draft.selected = 'destinations';
        expect(onlineMarkup(client, draft)).toContain('data-online="select:0"');
        expect(onlineMarkup(client, draft)).not.toContain('private-internal-vertex');
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
