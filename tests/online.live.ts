import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { OnlineClient, type Intent } from '../src/online/client';
import { createGame } from '../src/game/core/game';
import { chooseBotCommand } from '../src/game/core/bot';
import type { GameState } from '../src/game/core/types';
import { commandEnvelopeSchema } from '../src/online/shared/src/game/protocol';
import type { GameView } from '../src/online/shared/src/online/wire';
import { onlineMarkup, newDrafts } from '../src/online/markup';
const base = process.env.SUNMARK_TEST_API_URL;
if (!base) throw new Error('SUNMARK_TEST_API_URL is required for live integration');
const origin = process.env.SUNMARK_TEST_WEB_ORIGIN ?? 'http://localhost:8080';
const wait = async (check: () => boolean, timeout = 10000) => {
    const end = Date.now() + timeout;
    while (!check()) {
        if (Date.now() > end) throw new Error('Live synchronization timed out');
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
};
function browser() {
    let cookie = '';
    let dropAck = false;
    let socket: Socket | null = null;
    const storage = new Map<string, string>();
    const request: typeof fetch = async (input, init) => {
        const response = await fetch(input, {
            ...init,
            headers: { ...init?.headers, Cookie: cookie, Origin: origin },
        });
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(';')[0];
        if (dropAck && String(input).endsWith('/commands')) {
            dropAck = false;
            await response.arrayBuffer();
            throw new Error('Simulated lost acknowledgement');
        }
        return response;
    };
    const client = new OnlineClient(
        base ?? '',
        {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => {
                storage.set(key, value);
            },
            removeItem: (key) => {
                storage.delete(key);
            },
        },
        request,
        (url, options) => {
            socket = io(url, {
                ...options,
                forceNew: true,
                extraHeaders: { cookie, origin },
                transports: ['websocket'],
                reconnectionDelay: 50,
            });
            return socket;
        },
    );
    return {
        client,
        request,
        loseAck() {
            dropAck = true;
        },
        disconnect() {
            socket?.disconnect();
        },
        reconnect() {
            socket?.connect();
        },
        get cookie() {
            return cookie;
        },
    };
}
/** Test planner uses public board/standings and this seat's private hand only.
 * Opponent resource inventories are deliberately empty placeholders. */
function plan(view: GameView): Intent {
    const initial = createGame(
        view.players.map((p) => p.name),
        () => 0.42,
    );
    const dev = initial.development;
    if (!dev) throw new Error('Missing test deck');
    const state: GameState = {
        ...initial,
        board: view.board,
        players: view.players.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            resources:
                p.id === view.self.id
                    ? { ...view.self.resources }
                    : { wood: 0, brick: 0, wheat: 0, wool: 0, stone: 0 },
        })),
        activePlayerIndex: view.players.findIndex((p) => p.id === view.activePlayerId),
        turn: view.turn,
        phase: view.phase,
        lastRoll: view.lastRoll,
        winnerId: view.winnerId,
        setup: view.setup ?? null,
        awards: view.awards ?? { longestRoad: null, largestArmy: null },
        robberResolution: {
            source: 'seven',
            returnPhase: 'actions',
            discards: view.discardObligations,
            victims: view.eligibleVictims,
        },
        roadBuilding: { remaining: 1, returnPhase: 'actions' },
        development: {
            deck: dev.deck.slice(0, view.developmentDeckCount),
            discard: [],
            hands: Object.fromEntries(
                view.players.map((p) => [
                    p.id,
                    p.id === view.self.id ? view.self.developmentCards : [],
                ]),
            ),
            knights: Object.fromEntries(view.players.map((p) => [p.id, p.playedKnights])),
            playedThisTurn: !view.availableIntents.some((i) => i.kind === 'play-development'),
        },
    };
    const command = chooseBotCommand(state);
    if (!command || command.kind === 'domestic-trade') throw new Error('No test move');
    if (command.kind === 'discard') return { kind: 'discard', resources: command.resources };
    // Validate the planner's wire payload, without accepting any fabricated state.
    const parsed = commandEnvelopeSchema.parse({
        protocolVersion: 1,
        matchId: 'test',
        commandId: crypto.randomUUID(),
        expectedRevision: 0,
        intent: command,
    });
    return parsed.intent;
}
test('four real frontend clients complete an online match, recover a lost acknowledgement, reconnect and create a rematch', async () => {
    const browsers = Array.from({ length: 4 }, browser);
    const clients = browsers.map((b) => b.client);
    try {
        for (let i = 0; i < clients.length; i++) {
            await clients[i].guest(`Live ${i}`);
            expect(clients[i].error).toBe('');
        }
        await clients[0].create('Live full match');
        const id = clients[0].snapshot?.id,
            code = clients[0].snapshot?.code;
        if (!id || !code) throw new Error('Missing lobby');
        for (const client of clients.slice(1)) await client.join(code);
        for (const client of clients) await client.lobby({ kind: 'ready', ready: true });
        await clients[0].lobby({ kind: 'start' });
        expect(clients[0].error).toBe('');
        for (const client of clients) await client.open(id);
        await wait(() => clients.every((c) => c.connected));
        const initial = clients[0].snapshot;
        if (!initial?.game) throw new Error('Game missing');
        expect(onlineMarkup(clients[0], newDrafts())).toContain('جزیره بازی');
        browsers[0].loseAck();
        await clients[0].command({ kind: 'setup-roll' });
        expect(clients[0].pending).not.toBeNull();
        await clients[0].retry();
        expect(clients[0].pending).toBeNull();
        expect(clients[0].snapshot?.revision).toBe(initial.revision + 1);
        browsers[1].disconnect();
        browsers[1].reconnect();
        await wait(() => clients[1].connected);
        let snapshot = clients[0].snapshot;
        let steps = 0;
        while (snapshot?.game && !snapshot.game.winnerId) {
            const actor = snapshot.game.actorId;
            const index = Number(actor.split('-')[1]) - 1;
            const client = clients[index];
            if (!client) throw new Error('Invalid acting seat');
            await client.open(id);
            const game = client.snapshot?.game;
            if (!game) throw new Error('Missing live view');
            await client.command(plan(game));
            if (client.error || client.pending)
                throw new Error(`Live move failed at ${game.phase}: ${client.error}`);
            snapshot = client.snapshot;
            if (++steps > 6000) throw new Error('Full-match test did not reach victory');
            if (steps % 200 === 0)
                console.log(`Online match: ${steps} committed moves, turn ${snapshot?.game?.turn}`);
        }
        expect(snapshot?.status).toBe('finished');
        expect(snapshot?.game?.winnerId).toBeTruthy();
        await wait(() => clients.every((client) => client.snapshot?.status === 'finished'));
        for (const client of clients) {
            const game = client.snapshot?.game;
            if (!game) throw new Error('View missing');
            expect(game.players.every((p) => !('resources' in p))).toBe(true);
            expect(game).not.toHaveProperty('development');
        }
        await clients[0].create('Live rematch');
        expect(clients[0].snapshot?.status).toBe('lobby');
        expect(clients[0].snapshot?.id).not.toBe(id);
        console.log(
            `Online full match completed in ${steps} moves; winner ${snapshot?.game?.winnerId}`,
        );
    } finally {
        clients.forEach((client) => client.destroy());
    }
});
test('HTTP and socket boundaries reject outsiders, incompatible protocol versions and foreign origins', async () => {
    const owner = browser(),
        outsider = browser();
    let socket: Socket | null = null;
    try {
        await owner.client.guest('Owner');
        await outsider.client.guest('Outsider');
        await owner.client.create('Private');
        const id = owner.client.snapshot?.id;
        if (!id) throw new Error('Missing match');
        const denied = await outsider.request(`${base}/api/v1/online/matches/${id}`);
        expect(denied.status).toBe(403);
        const crossOrigin = await fetch(`${base}/api/v1/online/matches`, {
            method: 'POST',
            headers: {
                Cookie: owner.cookie,
                Origin: 'https://untrusted.example',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'Attack' }),
        });
        expect(crossOrigin.status).toBe(403);
        socket = io(`${base}/online`, {
            extraHeaders: { Cookie: outsider.cookie, Origin: origin },
            transports: ['websocket'],
            reconnection: false,
        });
        await new Promise<void>((resolve, reject) => {
            socket?.once('connect', resolve);
            socket?.once('connect_error', reject);
        });
        const reply: unknown = await socket
            .timeout(3000)
            .emitWithAck('subscribe', { protocolVersion: 1, matchId: id });
        expect(reply).toMatchObject({ ok: false });
        const version: unknown = await socket
            .timeout(3000)
            .emitWithAck('subscribe', { protocolVersion: 999, matchId: id });
        expect(version).toMatchObject({ ok: false });
    } finally {
        socket?.disconnect();
        owner.client.destroy();
        outsider.client.destroy();
    }
});

test('a host can explicitly add three server bots and complete setup through realtime updates', async () => {
    const owner = browser();
    const client = owner.client;
    try {
        await client.guest('Human with bots');
        await client.create('Bots live setup');
        const id = client.snapshot?.id;
        if (!id) throw new Error('Missing lobby');
        for (let seat = 1; seat < 4; seat++)
            await client.lobby({ kind: 'bot', seat, enabled: true });
        await client.lobby({ kind: 'ready', ready: true });
        await client.lobby({ kind: 'start' });
        await wait(() => client.connected);
        for (let steps = 0; client.snapshot?.game?.phase.startsWith('setup-'); steps++) {
            if (steps > 40) throw new Error('Bot setup stalled');
            const game = client.snapshot.game;
            const revision = client.snapshot.revision;
            if (game.actorId === game.self.id) {
                await client.command(plan(game));
                if (client.error) throw new Error(client.error);
            } else
                await wait(() => Boolean(client.snapshot && client.snapshot.revision > revision));
        }
        expect(
            Object.values(client.snapshot?.game?.board.vertices ?? {}).filter((v) => v.building),
        ).toHaveLength(8);
        expect(client.snapshot?.seats.filter((seat) => seat.bot)).toHaveLength(3);
    } finally {
        client.destroy();
    }
});

test('the live HTTP contract matches the frontend-pinned OpenAPI baseline', async () => {
    const response = await fetch(`${base}/docs-json`);
    expect(response.status).toBe(200);
    const expected: unknown = JSON.parse(
        readFileSync(new URL('../contracts/openapi.json', import.meta.url), 'utf8'),
    );
    const actual: unknown = await response.json();
    expect(actual).toEqual(expected);
});
