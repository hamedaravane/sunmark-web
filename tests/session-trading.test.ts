import { completeSessionSetup } from './helpers/setup';
import { expect, test, vi } from 'vitest';
import { RESOURCE_TYPES, type ResourceType, type TradeRatio } from '../src/game/core/types';
import { GameSession } from '../src/game/ui/session';
import { sheetContent } from '../src/game/ui/sheets';
import { FA } from '../src/game/ui/messages.fa';

function fixture() {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const session = new GameSession();
    session.start(3, false);
    completeSessionSetup(session);
    const state = session.state!;
    state.phase = 'actions';
    for (const vertex of Object.values(state.board.vertices)) vertex.building = null;
    for (const resource of RESOURCE_TYPES) state.players[0].resources[resource] = 10;
    return session;
}

function grant(session: GameSession, resource: ResourceType | null, playerIndex = 0) {
    const state = session.state!;
    const port = state.board.ports.find((port) => port.resource === resource)!;
    const vertexId = state.board.edges[port.edgeId].vertexIds[0];
    state.board.vertices[vertexId].building = {
        ownerId: state.players[playerIndex].id,
        type: 'settlement',
    };
    return port;
}

test.each<TradeRatio>([2, 3, 4])('the %i:1 quote, payment and transition agree', (ratio) => {
    const session = fixture();
    if (ratio !== 4) grant(session, ratio === 2 ? 'wood' : null);
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'stone');
    session.openSheet({ kind: 'trade' });
    const before = session.state!;
    expect(session.tradeRatio).toBe(ratio);
    expect(sheetContent(session).body).toContain(
        `دارایی پس از مبادله: چوب ${(10 - ratio).toLocaleString('fa-IR')}`,
    );
    session.confirmTrade();
    expect(session.state!.players[0].resources).toMatchObject({ wood: 10 - ratio, stone: 11 });
    expect(before.players[0].resources).toMatchObject({ wood: 10, stone: 10 });
    expect(session.transition?.action).toEqual({
        kind: 'trade',
        give: 'wood',
        receive: 'stone',
        ratio,
    });
    expect(session.history[session.history.length - 1]?.text).toContain(
        `پرداخت: ${ratio.toLocaleString('fa-IR')} چوب`,
    );
    expect(session.sheet).toBeNull();
    expect(session.give).toBeNull();
    expect(session.receive).toBeNull();
});

test('explicit rates survive sheet dismissal and reset when the payment resource changes', () => {
    const session = fixture();
    grant(session, 'wood');
    session.chooseTrade('give', 'wood');
    session.chooseTradeRatio(4);
    session.openSheet({ kind: 'trade' });
    session.closeSheet();
    session.openSheet({ kind: 'trade' });
    expect(session.tradeRatio).toBe(4);
    session.chooseTradeRatio(3);
    expect(session.tradeRatio).toBe(4); // No general port grants this rate.
    session.chooseTrade('give', 'stone');
    expect(session.tradeRatio).toBe(4);
    session.chooseTrade('give', 'wood');
    expect(session.tradeRatio).toBe(2);
});

test('a rejected trade keeps resources, draft and history intact', () => {
    const session = fixture();
    grant(session, 'wood');
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'stone');
    session.openSheet({ kind: 'trade' });
    session.state!.players[0].resources.wood = 1;
    const before = session.state;
    const transition = session.transition;
    const historyCount = session.history.length;
    expect(sheetContent(session).footer).toContain(
        'data-action="confirm-trade" class="button button--primary full-width" disabled',
    );
    session.confirmTrade();
    expect(session.state).toBe(before);
    expect(session.error).toBe(FA.errors['insufficient-resources']);
    expect(session.give).toBe('wood');
    expect(session.receive).toBe('stone');
    expect(session.history).toHaveLength(historyCount);
    expect(session.transition).toBe(transition);
});

test('owned port shortcuts preselect payment; opponent ports remain inspection-only', () => {
    const session = fixture();
    const own = grant(session, 'wood');
    const opponent = grant(session, 'stone', 1);
    session.openSheet({ kind: 'port', id: opponent.id });
    expect(sheetContent(session).body).not.toContain(`data-action="trade-port:${opponent.id}"`);
    session.tradeFromPort(opponent.id);
    expect(session.sheet).toEqual({ kind: 'port', id: opponent.id });
    expect(session.give).toBeNull();
    session.tradeFromPort(own.id);
    expect(session.sheet).toEqual({ kind: 'trade' });
    expect(session.give).toBe('wood');
    expect(session.tradeRatio).toBe(2);
    session.openSheet({ kind: 'port', id: own.id });
    expect(sheetContent(session).body).toContain(`data-action="trade-port:${own.id}"`);
});

test('turn handover discards a draft and its selected rate without transferring port access', () => {
    const session = fixture();
    grant(session, 'wood');
    session.chooseTrade('give', 'wood');
    session.chooseTrade('receive', 'stone');
    session.chooseTradeRatio(4);
    session.primary();
    expect(session.sheet).toEqual({ kind: 'end-turn' });
    expect(session.state!.activePlayerIndex).toBe(0);
    session.confirmEndTurn();
    expect(session.state!.activePlayerIndex).toBe(1);
    expect(session.state!.phase).toBe('roll');
    expect(session.give).toBeNull();
    expect(session.receive).toBeNull();
    session.chooseTrade('give', 'wood');
    expect(session.tradeRatio).toBe(4);
});
