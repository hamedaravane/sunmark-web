import type { MatchState } from './matchState';
import { getOwnedPorts, getPortOwnerId, getPortTradeRatio } from '../core/ports';
import type { Board, Port, TradeRatio } from '../core/types';
import { button, escape, number, resourceIcon } from './components';
import { FA } from './messages.fa';

export function portName(port: Port): string {
    return port.resource === null ? 'بندر عمومی' : `بندر ${FA.resources[port.resource]}`;
}

export function tradeRateLabel(ratio: TradeRatio): string {
    return `<bdi dir="ltr">${number(ratio)}:۱</bdi>`;
}

export function portIcon(port: Port): string {
    return port.resource === null
        ? '<span class="port-exchange" aria-hidden="true">⇄</span>'
        : resourceIcon(port.resource);
}

export function ownedPortsMarkup(board: Board, playerId: string): string {
    const ports = getOwnedPorts(board, playerId);
    return ports.length
        ? `<div class="owned-ports">${ports.map((port) => button(`${portIcon(port)}${portName(port)} ${tradeRateLabel(getPortTradeRatio(port))}`, `port:${port.id}`, { className: 'port-chip' })).join('')}</div>`
        : '<p class="muted">هنوز به بندری دسترسی ندارید؛ نرخ بانک ۴ به ۱ است.</p>';
}

export function portDirectory(state: MatchState): string {
    return `<details class="port-directory"><summary>بندرهای جزیره (${number(state.board.ports.length)})</summary><div class="port-list">${state.board.ports
        .map((port) => {
            const owner = state.players.find(
                (player) => player.id === getPortOwnerId(state.board, port),
            );
            return button(
                `${portIcon(port)}<span>${portName(port)} ${tradeRateLabel(getPortTradeRatio(port))}<small>${owner ? escape(owner.name) : 'بدون آبادی یا شهر'}</small></span>`,
                `port:${port.id}`,
                {
                    className: `port-list-item${owner ? ' is-owned' : ''}`,
                    ownerColor: owner?.color,
                },
            );
        })
        .join('')}</div></details>`;
}
