import type { SavedMatch } from '../persistence/matchStore';
import type { MatchSession } from './matchSession';
import { getPlayerSummary, type MatchState } from './matchState';
import { getProductionProbability } from '../core/queries';
import { getPortOwnerId } from '../core/ports';
import { FA } from './messages.fa';
import { escape, number } from './components';

/** Public board facts only; never scores a site or recommends an optimal move. */
export function siteDescription(state: MatchState, owner: string, id: string): string {
    const vertex = state.board.vertices[id];
    if (!vertex) return '';
    const tiles = state.board.tiles.filter((tile) => vertex.tileIds.includes(tile.id));
    const income = tiles.filter((tile) => tile.resource);
    const odds = income.map(
        (tile) =>
            `${FA.resources[tile.resource!]} ${number(tile.number!)}: ${number(getProductionProbability(tile.number!).outcomes)} از ۳۶ حالت`,
    );
    const existing = new Set(
        state.board.tiles
            .filter((tile) =>
                tile.vertexIds.some((v) => state.board.vertices[v].building?.ownerId === owner),
            )
            .map((tile) => tile.resource),
    );
    const fresh = [...new Set(income.map((tile) => tile.resource!))].filter(
        (r) => !existing.has(r),
    );
    const port = state.board.ports.find((p) => state.board.edges[p.edgeId].vertexIds.includes(id));
    return `${odds.join('؛ ')}${fresh.length ? `؛ پوشش تازه: ${fresh.map((r) => FA.resources[r]).join('، ')}` : ''}${port ? `؛ دسترسی بندر ${port.resource ? FA.resources[port.resource] : 'عمومی'}` : ''}؛ احتمال تولید، تضمین دریافت نیست`;
}

export function openingGuidance(session: MatchSession): string {
    const state = session.state!;
    const owner = session.humanPlayer!.id;
    const count = Object.values(state.board.vertices).filter(
        (v) => v.building?.ownerId === owner,
    ).length;
    const road = session.placement?.kind === 'road';
    const step = road ? count * 2 : count * 2 + 1;
    const label = road
        ? `راه کنار آبادی ${count === 1 ? 'اول' : 'دوم'}`
        : `آبادی ${count === 0 ? 'اول' : 'دوم'}`;
    return `قدم ${number(step)} از ۴ · ${label} · ${session.placement?.targetId ? 'محل انتخاب شد؛ تأیید کن' : 'محل روشن را انتخاب کن'} · رایگان`;
}

export function resumeSummary(saved: SavedMatch): string {
    const state = saved.state;
    const human = saved.humanPlayerId ?? state.players[0].id;
    const score = getPlayerSummary(state, human, human).score;
    const active = state.players[state.activePlayerIndex];
    const phase = state.phase.startsWith('setup-')
        ? 'جانمایی آغازین'
        : active.id === human
          ? 'نوبت تو'
          : `نوبت ${active.name}`;
    const goal = saved.buildGoal
        ? `؛ هدف: ${{ road: 'راه', settlement: 'آبادی', city: 'شهر' }[saved.buildGoal]}`
        : '';
    return `${number(score)} از ${number(state.victoryTarget)} امتیاز؛ ${phase}${goal} · روی همین دستگاه`;
}

/** A reflection of the final public board, not a causal explanation of the result. */
export function matchReflection(state: MatchState, owner: string): string {
    const summary = getPlayerSummary(state, owner, owner);
    const ports = state.board.ports.filter((p) => getPortOwnerId(state.board, p) === owner).length;
    return `<section aria-label="بازبینی سفر"><h3>رد تو روی جزیره</h3><p>${number(summary.settlements)} آبادی، ${number(summary.cities)} شهر و ${number(summary.roads)} راه ساختی؛ به ${number(ports)} بندر دسترسی داری.</p><p>${escape(ports ? 'سفر بعدی: گسترش آبادی‌ها را با ارتقای شهر مقایسه کن.' : 'سفر بعدی: ببین دسترسی به یک بندر چطور کمبود ساختت را جبران می‌کند.')}</p></section>`;
}
