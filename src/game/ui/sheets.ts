import { matchAvatar, matchBot } from './headerModel';
import { scoreAwards } from './scoreMarkup';
import { constructionSheet } from './constructionMarkup';
import { experienceSheet, experienceGuide } from './experienceMarkup';
import { advancedSheet } from './advancedMarkup';
import { getBankTradeError } from './matchState';
import {
    getBankTradeRates,
    getBankTradeRatio,
    getPortOwnerId,
    getPortTradeRatio,
} from '../core/ports';
import { getProductionProbability, type BuildOption } from '../core/queries';
import { getPlayerSummary } from './matchState';
import { RESOURCE_TYPES } from '../core/types';
import {
    artSprite,
    tradeIcon,
    button,
    color,
    escape,
    number,
    playerAvatar,
    resourceIcon,
    resourceValue,
} from './components';
import { FA } from './messages.fa';
import type { MatchSession } from './matchSession';
import type { SheetContent } from './bottomSheet';
import { pauseMenuContent, gameReviewContent, pauseMenuBack } from './pauseMenu';
import { journalContent, tutorialContent } from '../tutorial/markup';
import { ownedPortsMarkup, portDirectory, portIcon, portName, tradeRateLabel } from './ports';
import { domesticContent, tradeTabs } from './domesticSheet';
import { BUILD_LABELS, locationReason, missingLabel, tradeBuildFeedback } from './buildFeedback';
export { BUILD_LABELS } from './buildFeedback';
import { PLAYER_NAME_LIMIT } from './playerIdentity';

export const PHASE_LABELS = {
    'setup-roll': 'تاس تعیین آغازکننده',
    'setup-settlement': 'انتخاب آبادی آغازین',
    'setup-road': 'انتخاب راه آغازین',
    roll: 'آغاز نوبت',
    discard: 'انتخاب منابع دورریختنی',
    steal: 'انتخاب حریف برای گرفتن یک منبع',
    'road-building': 'ساخت راه رایگان',
    robber: 'جابه‌جایی اهریمن',
    actions: 'ساخت و تجارت',
    finished: 'پایان بازی',
};

export function buildReason(option: BuildOption, session: MatchSession): string {
    if (!session.isHumanTurn) return 'ساخت در نوبت خودتان، پس از تاس ممکن است.';
    if (option.reason === 'wrong-phase')
        return session.state?.phase === 'robber'
            ? 'ابتدا اهریمن را جابه‌جا کنید.'
            : 'ابتدا تاس را بیندازید.';
    if (option.reason === 'road-supply') return FA.errors['road-supply'];
    if (option.reason === 'no-legal-targets') return locationReason(option);
    if (option.reason === 'game-finished') return FA.errors['game-finished'];
    const shortage = RESOURCE_TYPES.some((r) => option.missing[r])
        ? `کمبود: ${missingLabel(option.missing)} • `
        : 'منابع کافی است • ';
    return `${shortage}${locationReason(option)}`;
}

export function costRow(option: BuildOption): string {
    return `<span class="cost-row">${RESOURCE_TYPES.filter((r) => option.cost[r])
        .map((r) => resourceValue(r, option.cost[r], option.missing[r]))
        .join('')}</span>`;
}

export function sheetContent(session: MatchSession, updateReady = false): SheetContent {
    if (session.sheet?.kind === 'player-name')
        return {
            title: 'با چه اسمی وارد جزیره می‌شی؟',
            preserveInput: true,
            body: `<p class="sheet-intro">تو در برابر سه ربات بازی می‌کنی. اسمت کنار آواتار و امتیازت دیده می‌شه.</p>
                <label class="name-label" for="player-name">اسم تو</label>
                <div class="name-entry"><input id="player-name" data-action="player-name" name="player-name" type="text" dir="auto" maxlength="${PLAYER_NAME_LIMIT}" value="${escape(session.playerNameDraft)}" placeholder="اسمت رو بنویس…" autocomplete="nickname" enterkeyhint="go" aria-describedby="name-hint"><span class="name-entry-value${session.playerNameDraft ? '' : ' is-empty'}" dir="auto" aria-hidden="true">${escape(session.playerNameDraft || 'اسمت رو بنویس…')}</span></div>
                <p id="name-hint" class="footnote">تا ${number(PLAYER_NAME_LIMIT)} حرف؛ اگه خالی بذاری، «بازیکن» صدات می‌کنیم.</p>
                ${button('ورود به جزیره', 'confirm-player-name', { className: 'button button--primary full-width' })}`,
        };
    if (session.sheet?.kind === 'new-match')
        return {
            title: 'سفر تازه‌ای شروع کنیم؟',
            body: `<p>با شروع بازی تازه، ذخیره سفر قبلی جایگزین می‌شه. اگه می‌خوای همون سفر رو ادامه بدی، «ادامه سفر قبلی» رو بزن.</p>${button('ادامه سفر قبلی', session.state ? 'close-sheet' : 'resume-match', { className: 'button full-width' })}${button('شروع بازی تازه', 'confirm-new-match', { className: 'button button--primary full-width' })}`,
        };
    const state = session.state!;
    const player = session.humanPlayer!;
    const sheet = session.sheet!;
    const advanced = advancedSheet(session);
    if (advanced) return advanced;
    if (sheet.kind === 'help') return pauseMenuContent(session, updateReady);
    if (sheet.kind === 'review') return gameReviewContent(session);
    if (sheet.kind === 'domestic') return domesticContent(session);
    if (sheet.kind === 'tutorial') return tutorialContent(session);
    if (sheet.kind === 'journal') return journalContent(session);
    if (sheet.kind === 'targets' || sheet.kind === 'inspect') {
        const inspecting = sheet.kind === 'inspect';
        const ids = inspecting ? state.board.tiles.map((tile) => tile.id) : session.targets;
        return {
            title: inspecting ? 'بررسی خانه‌های جزیره' : 'انتخاب محل روی جزیره',
            key: inspecting ? 'island-inspection' : 'placement-targets',
            footer: inspecting ? pauseMenuBack() : undefined,
            body: `<p class="sheet-intro">${inspecting ? 'برای دیدن تولید و ساختمان‌های مجاور، یک خانه را انتخاب کنید.' : 'انتخاب محل فقط پیش‌نمایش است؛ تأیید نهایی روی صفحه بازی انجام می‌شود.'}</p><div class="target-list">${ids
                .map((id, i) => {
                    const tile = state.board.tiles.find((candidate) => candidate.id === id);
                    const vertex =
                        !inspecting && session.placement?.kind !== 'road'
                            ? state.board.vertices[id]
                            : undefined;
                    const surroundings = vertex
                        ? state.board.tiles
                              .filter((t) => vertex.tileIds.includes(t.id))
                              .map(
                                  (t) =>
                                      `${t.resource ? FA.resources[t.resource] : FA.desert}${t.number === null ? '' : ` ${number(t.number)}`}`,
                              )
                              .join(' • ')
                        : '';
                    const label = vertex
                        ? `محل ${number(i + 1)} • ${surroundings}`
                        : tile
                          ? `${tile.resource ? FA.resources[tile.resource] : FA.desert}${tile.number === null ? '' : ` • ${number(tile.number)}`} (${number(tile.q + 3)}، ${number(tile.r + 3)})`
                          : `محل ${number(i + 1)}`;
                    return button(label, `${inspecting ? 'inspect' : 'preview-target'}:${id}`, {
                        className: 'button full-width',
                        pressed: !inspecting && session.placement?.targetId === id,
                    });
                })
                .join('')}</div>`,
        };
    }
    if (sheet.kind === 'end-turn')
        return {
            title: 'پایان نوبت؟',
            body: `<p>مبادله تأییدنشده دارید. با پایان نوبت این انتخاب کنار گذاشته می‌شود.</p>${button('بازگشت به مبادله', 'open:trade', { className: 'button full-width' })}${button('کنارگذاشتن مبادله و پایان نوبت', 'confirm-end-turn', { className: 'button button--primary full-width' })}`,
        };
    if (sheet.kind === 'build') return constructionSheet(session);
    if (sheet.kind === 'experience') return experienceSheet(session);
    if (sheet.kind === 'experience-guide') return experienceGuide();
    if (sheet.kind === 'development-rules')
        return {
            title: 'قوانین کارت‌های توسعه',
            body: '<p>دستهٔ ۲۵ کارتی: ۱۴ شوالیه، ۵ امتیاز مخفی، و از راه‌سازی، انحصار و سال فراوانی هرکدام ۲ کارت.</p><p>خرید: ۱ سنگ، ۱ گندم و ۱ پشم. در هر نوبت یک کارت غیرامتیازی، پیش از تاس یا بعد از پایان مراحل اجباری. کارت تازه تا نوبت بعد بازی نمی‌شود. امتیازهای مخفی، حتی تازه‌خریداری‌شده، هنگام اعلام پیروزی حساب می‌شوند.</p>',
            footer: button('بازگشت به کارت‌های تو', 'open:development', {
                className: 'button full-width',
            }),
        };
    if (sheet.kind === 'trade') {
        const ratio = session.tradeRatio;
        const rates = session.give ? getBankTradeRates(state.board, player.id, session.give) : [];
        const error =
            session.give && session.receive
                ? getBankTradeError(state, session.give, session.receive, ratio)
                : null;
        const hint = session.practice
            ? 'تمرین: پس از ساخت راه، ۴ چوب بده و ۱ پشم بگیر؛ انتخاب‌های دیگر فقط برای مقایسه‌اند.'
            : state.phase !== 'actions'
              ? state.phase === 'robber'
                  ? 'ابتدا اهریمن را جابه‌جا کنید.'
                  : state.phase === 'finished'
                    ? FA.errors['game-finished']
                    : 'ابتدا تاس را بیندازید.'
              : error
                ? FA.errors[error]
                : !session.give || !session.receive
                  ? 'هر دو سوی مبادله را انتخاب کنید.'
                  : 'مبادله آماده تأیید است.';
        const selector = (side: 'give' | 'receive', title: string) =>
            `<section class="trade-side trade-side--${side}" aria-label="${title}"><h3>${title} <span class="muted">${side === 'give' && !session.give ? 'نرخ هر منبع روی کارت' : `${number(side === 'give' ? ratio : 1)} واحد`}</span></h3><div class="resource-selector">${RESOURCE_TYPES.map(
                (r) => {
                    const best = getBankTradeRatio(state.board, player.id, r);
                    return button(
                        `${resourceIcon(r)}<span>${FA.resources[r]}</span>${side === 'give' ? `<span class="trade-card-rate">${tradeRateLabel(best)}</span>` : ''}<span class="muted">دارایی ${number(player.resources[r])}</span>`,
                        `trade:${side}:${r}`,
                        {
                            className: 'resource-choice',
                            pressed: session[side] === r,
                            label: `${title}: ${FA.resources[r]}، دارایی ${number(player.resources[r])}${side === 'give' ? `، بهترین نرخ ${number(best)} به ۱` : ''}`,
                        },
                    );
                },
            ).join('')}</div></section>`;
        const source =
            ratio === 2
                ? `بندر تخصصی ${session.give ? FA.resources[session.give] : ''}`
                : ratio === 3
                  ? 'بندر عمومی'
                  : 'بانک';
        const rateChoices =
            rates.length > 1
                ? `<div class="trade-rates" role="group" aria-label="نرخ مبادله">${rates.map((rate, i) => button(`${tradeRateLabel(rate)}${i === 0 ? ' • بهترین' : ''}`, `trade-rate:${rate}`, { className: 'button button--quiet', pressed: ratio === rate })).join('')}</div>`
                : '';
        let review = '';
        if (session.give && session.receive) {
            const give = session.give,
                receive = session.receive;
            review = `<section class="trade-review" aria-label="مرور مبادله"><p>می‌دهید: ${resourceValue(give, ratio)} ${FA.resources[give]}</p><p>می‌گیرید: ${resourceValue(receive, 1)} ${FA.resources[receive]}</p><p class="muted">نرخ ${tradeRateLabel(ratio)} • ${source}</p>${!error ? `<p class="muted">دارایی پس از مبادله: ${FA.resources[give]} ${number(player.resources[give] - ratio)}، ${FA.resources[receive]} ${number(player.resources[receive] + 1)}</p>${tradeBuildFeedback(session, { ...player.resources, [give]: player.resources[give] - ratio, [receive]: player.resources[receive] + 1 })}` : ''}</section>`;
        }
        return {
            title: 'بانک و بندرها',
            body: `${tradeTabs(session, false)}<div class="trade-intro">${tradeIcon(64)}<p class="sheet-intro">${escape(player.name)} • بهترین نرخ هر منبع با بندرهای شما محاسبه می‌شود.</p></div>${ownedPortsMarkup(state.board, player.id)}${selector('give', 'می‌دهید')}${rateChoices}${selector('receive', 'می‌گیرید')}${review}<p class="availability" role="status">${hint}</p>${button('تأیید مبادله', 'confirm-trade', { className: 'button button--primary full-width', disabled: !session.give || !session.receive || error !== null || (!!session.practice && (session.practice.stage !== 'trade' || session.give !== 'wood' || session.receive !== 'wool' || ratio !== 4)) })}${portDirectory(state)}`,
        };
    }
    if (sheet.kind === 'port') {
        const port = state.board.ports.find((candidate) => candidate.id === sheet.id)!;
        const ownerId = getPortOwnerId(state.board, port);
        const owner = state.players.find((candidate) => candidate.id === ownerId);
        const tile = state.board.tiles.find(
            (candidate) => candidate.id === state.board.edges[port.edgeId].tileIds[0],
        )!;
        const access =
            port.resource === null
                ? 'سه واحد از یک منبع یکسان برای یک واحد از منبعی دیگر.'
                : `دو واحد ${FA.resources[port.resource]} برای یک واحد از هر منبع دیگر؛ این نرخ فقط برای پرداخت ${FA.resources[port.resource]} است.`;
        return {
            title: portName(port),
            body: `<div class="port-detail-heading">${portIcon(port)}<span>${tradeRateLabel(getPortTradeRatio(port))}</span></div><p>${access}</p><dl class="detail-list"><div><dt>دسترسی بندر</dt><dd>${owner ? escape(owner.name) : 'هنوز بدون آبادی یا شهر'}</dd></div><div><dt>ساحل کنار بندر</dt><dd>${tile.resource ? FA.resources[tile.resource] : FA.desert}${tile.number === null ? '' : ` • ${number(tile.number)}`}</dd></div></dl><p class="footnote">با ساخت آبادی یا شهر در یکی از دو تقاطع متصل به اسکله، این نرخ فعال می‌شود. راه به‌تنهایی کافی نیست. شهر نرخ را بهتر نمی‌کند و اهریمنِ زمین بندر را مسدود نمی‌کند.</p>${ownerId === player.id ? button('مبادله با این بندر', `trade-port:${port.id}`, { className: 'button button--primary full-width', disabled: !session.isHumanTurn || state.phase !== 'actions' }) : '<p class="muted">برای استفاده از این بندر باید در یکی از دو تقاطع اسکله آبادی داشته باشید.</p>'}`,
        };
    }
    if (sheet.kind === 'player') {
        const selected = state.players.find(({ id }) => id === sheet.id)!;
        const summary = getPlayerSummary(state, selected.id, player.id);
        const own = selected.id === player.id;
        return {
            title: selected.name,
            body: `<div class="player-detail" style="--owner:${color(selected.color)}"><span class="owner-badge">${number(state.players.findIndex((p) => p.id === selected.id) + 1)}</span><p class="score-large">${number(summary.score)} <span>از ${number(state.victoryTarget)} امتیاز</span></p></div><dl class="detail-list"><div><dt>راه</dt><dd>${number(summary.roads)}</dd></div><div><dt>آبادی</dt><dd>${number(summary.settlements)}</dd></div><div><dt>شهر</dt><dd>${number(summary.cities)}</dd></div><div><dt>مجموع منابع</dt><dd>${number(summary.resources)}</dd></div>${own ? `<div><dt>امتیاز کارت‌های مخفی تو</dt><dd>${number((state.development?.hands[selected.id] ?? []).filter((c) => c.kind === 'victory-point').length)}</dd></div>` : ''}</dl>${scoreAwards(state, selected.id, player.id)}<h3>بندرهای در دسترس</h3>${ownedPortsMarkup(state.board, selected.id)}<p class="footnote">هر آبادی ۱ و هر شهر ۲ امتیاز دارد؛ عنوان‌های راه و ارتش هرکدام ۲ امتیاز می‌دهند. کارت‌های امتیازی حریف‌ها مخفی‌اند. راه‌ها به ۱۵ قطعه محدودند.</p>`,
            footer:
                own && ['roll', 'actions'].includes(state.phase)
                    ? button('کارت‌های تو', 'open:development', {
                          className: 'button full-width',
                          disabled: !!session.practice,
                      }) +
                      button('برنامهٔ ساخت', 'open:build', {
                          className: 'button button--quiet full-width',
                      })
                    : button('بازگشت به جزیره', 'close-sheet', {
                          className: 'button button--quiet full-width',
                      }),
        };
    }
    if (sheet.kind === 'tile') {
        const tile = state.board.tiles.find(({ id }) => id === sheet.id)!;
        const probability = tile.number === null ? null : getProductionProbability(tile.number);
        const adjacent = tile.vertexIds
            .map((id) => state.board.vertices[id].building)
            .filter((building) => building !== null);
        return {
            title: tile.resource ? `خانه ${FA.resources[tile.resource]}` : FA.desert,
            body: `<dl class="detail-list"><div><dt>شماره</dt><dd>${tile.number === null ? '—' : number(tile.number)}</dd></div><div><dt>احتمال تولید در هر تاس</dt><dd>${probability ? `${number(probability.outcomes)} از ${number(probability.total)}` : 'بدون تولید'}</dd></div><div><dt>اهریمن</dt><dd>${tile.robber ? 'تولید این خانه مسدود است' : 'در این خانه نیست'}</dd></div></dl><h3>ساختمان‌های مجاور</h3>${adjacent.length ? `<ul class="plain-list">${adjacent.map((building) => `<li>${escape(state.players.find(({ id }) => id === building.ownerId)!.name)} • ${BUILD_LABELS[building.type]} • تولید ${number(building.type === 'city' ? 2 : 1)} واحد</li>`).join('')}</ul>` : '<p class="muted">ساختمانی در کنار این خانه نیست.</p>'}`,
        };
    }
    if (sheet.kind === 'opponents')
        return {
            title: 'رقبای جزیره',
            body: `<p class="sheet-intro">${session.online ? 'بازیکنان و ربات‌ها با هویت خودشان بازی می‌کنند.' : 'رقبا نوبت‌هاشون رو خودکار بازی می‌کنن.'} رنگ هرکدوم رو روی نقشه دنبال کن.</p><div class="results-list">${state.players
                .filter((p) => p.id !== player.id)
                .map((p) => {
                    const summary = getPlayerSummary(state, p.id);
                    const avatar = matchAvatar(state, p.id, player.id);
                    return `<article style="--owner:${color(p.color)}"><div class="rival-detail-heading">${playerAvatar(avatar)}<h3>${escape(p.name)} <span class="bot-label">${matchBot(state, p.id, player.id) ? 'ربات' : 'بازیکن'}</span>${state.players[state.activePlayerIndex].id === p.id && state.phase !== 'finished' ? ' • در حال بازی' : ''}</h3></div><p>${number(summary.score)} از ${number(state.victoryTarget)} امتیاز</p><p class="muted">${number(summary.settlements)} آبادی • ${number(summary.cities)} شهر • ${number(summary.roads)} راه</p></article>`;
                })
                .join('')}</div>`,
        };
    if (sheet.kind === 'history')
        return {
            title: 'رویدادهای بازی',
            key: 'game-history',
            footer: pauseMenuBack(),
            body: `<ol class="history-list">${[...session.history]
                .reverse()
                .map(
                    (event) =>
                        `<li><span class="muted">دور ${number(event.turn)} • ${escape(event.player)}</span><p>${escape(event.text)}</p></li>`,
                )
                .join(
                    '',
                )}</ol><p class="footnote">آخرین ۱۰۰ رویداد این بازی روی همین دستگاه نگه داشته می‌شود.</p>`,
        };
    if (sheet.kind === 'results') {
        const winner = state.players.find(({ id }) => id === state.winnerId)!;
        return {
            title: FA.winnerTitle,
            body: `<div class="victory-art">${artSprite('victory', 112, 'victory-emblem')}</div><p class="winner-name" style="--owner:${color(winner.color)}">${escape(winner.name)} ${FA.winnerSuffix}</p><p class="victory-score">${number(getPlayerSummary(state, winner.id).score)}<small>امتیاز · پایان این ماجراجویی</small></p><div class="results-list">${state.players
                .map((p) => {
                    const s = getPlayerSummary(state, p.id);
                    return `<article><div class="row-between"><h3>${escape(p.name)}</h3><span>${number(s.score)} امتیاز</span></div><p class="muted">${number(s.settlements)} آبادی + ${number(s.cities)} شهر</p></article>`;
                })
                .join(
                    '',
                )}</div>${button('دفتر سفر آناهیتا', 'open:journal', { className: 'button full-width' })}`,
            footer: `<div class="result-actions">${button('دیدن جزیره', 'close-sheet', { className: 'button button--quiet' })}${button(FA.newGame, 'new-game', { className: 'button button--primary' })}</div>`,
        };
    }
    if (session.practice)
        return {
            title: 'راهنمای تمرین',
            key: 'practice-rules',
            footer: pauseMenuBack(),
            body: `<p>این صفحهٔ تمرین جدا از بازی اصلی است؛ تاس و دارایی آماده‌اند و رقبا حرکت نمی‌کنند. با دکمهٔ اصلی قدم بعدی را انجام بده: تاس، ساخت راه، بانک برای پشم، ساخت آبادی. مسیر روشن یک نمونه است، نه بهترین حرکت. امتیازت از ۱ به ۲ می‌رسد؛ هدف بازی واقعی ۱۰ امتیاز است.</p>${button('بازگشت به تمرین', 'close-sheet', { className: 'button button--primary full-width' })}${button('خروج از تمرین و بازگشت به منو', 'new-game', { className: 'button full-width' })}`,
        };
    return {
        title: 'قوانین بازی',
        key: 'game-rules',
        footer: button('بازگشت به آموزش', 'open:journal', { className: 'button full-width' }),
        body: `<p>هدف رسیدن به ${number(state.victoryTarget)} امتیاز است: هر آبادی ۱ و هر شهر ۲ امتیاز دارد. تاس از زمین‌های کنار ساختمان‌ها منابع می‌دهد؛ منابع هزینهٔ ساخت هستند. راه به محل آبادی تازه دسترسی می‌دهد و معامله کمبود ساخت بعدی را جبران می‌کند.</p><p>${session.online ? 'در این اتاق با بازیکنان و ربات‌های انتخاب‌شده بازی می‌کنی؛ سرور نتیجه‌ها را ثبت می‌کند.' : 'تو با سه رقیب خودکار بازی می‌کنی.'} برای معاملهٔ توافقی، «معامله» رو باز کن؛ بعد از تاس، هر معامله باید با صاحب نوبت باشه و هر دو طرف منابع بدهند. منابع پایین صفحه و اطلاعات بالای صفحه همیشه مال توئه. ${session.online ? 'پس از پایان نوبتت، بازی روی دستگاه دیگران ادامه دارد. بازکردن منو بازی آنلاین را متوقف نمی‌کند.' : 'بعد از پایان نوبتت، رقبا به‌ترتیب بازی می‌کنن؛ لازم نیست گوشی رو به کسی بدی.'}</p><h3>جانمایی آغازین</h3><p>بالاترین تاس، شروع‌کننده رو مشخص می‌کنه. هرکس یک آبادی و یک راه کنار هم می‌ذاره؛ دور دوم از نفر آخر به عقب برمی‌گردیم. فاصلهٔ آبادی‌ها همیشه لازمه. جانمایی رایگانه و فقط آبادی دوم منابع آغازین می‌ده.</p><ol class="help-list"><li>تاس را بیندازید. خانه‌های هم‌شماره برای آبادی‌های مجاور یک منبع و برای شهرها دو منبع تولید می‌کنند.</li><li>با تاس هفت تولیدی نداریم. اول هرکس بیش از ۷ منبع دارد، نصف آن را رو به پایین و به انتخاب خود دور می‌ریزد؛ بعد اهریمن را به خانهٔ متفاوتی (حتی بیابان) ببرید و سپس یک حریف مجاورِ دارای منبع را برای گرفتن یک کارت تصادفی انتخاب کنید.</li><li>ساخت‌وساز را باز کنید تا هزینه و محل‌های مجاز را ببینید. محل را انتخاب و سپس ساخت را تأیید کنید.</li><li>در بانک، چهار منبع یکسان را با یک منبع دیگر مبادله کنید. آبادی یا شهر کنار بندر عمومی نرخ ۳ به ۱ می‌دهد؛ بندر تخصصی فقط منبع نشان‌داده‌شده را با نرخ ۲ به ۱ می‌پذیرد. ساخت راه کافی نیست. پس از ساخت آبادی بندری، همان نوبت می‌توانید از نرخ آن استفاده کنید.</li><li>پس از انجام کارها، پایان نوبت را بزنید. با ${number(state.victoryTarget)} امتیاز یا بیشتر در نوبت خودت برنده می‌شوی؛ کارت امتیاز مخفی را فقط با اعلام پیروزی نشان بده.</li></ol><h3>کارت‌های توسعه و عنوان‌ها</h3><p>خرید کارت: ۱ سنگ، ۱ گندم و ۱ پشم. در هر نوبت فقط یک کارت غیرامتیازی از نوبت‌های قبل بازی کن؛ شوالیه قبل یا بعد از تاس، اهریمن را بدون دورریختن جابه‌جا می‌کند. راه‌سازی دو راه رایگان می‌دهد؛ انحصار همهٔ یک نوع منبع حریف‌ها را می‌گیرد؛ اختراع دو منبع از بانک می‌دهد. کارت امتیاز مخفی تا اعلام پیروزی رو نمی‌شود.</p><p>طولانی‌ترین راه پیوستهٔ دست‌کم ۵ قطعه، و بزرگ‌ترین ارتش با دست‌کم ۳ شوالیهٔ بازی‌شده، هرکدام ۲ امتیاز دارند. صاحب فعلی در تساوی عنوان را نگه می‌دارد؛ اگر راهش قطع شود و چند نفر در بالاترین طول مساوی شوند، عنوان بی‌صاحب می‌ماند تا یک نفر جلو بزند.</p><p>راه باید به شبکه شما وصل باشد؛ ساختمان حریف ادامه راه را قطع می‌کند. بین آبادی‌ها یک تقاطع خالی لازم است. شهر فقط آبادی خودتان را ارتقا می‌دهد.</p><p class="footnote">برای جزئیات خانه آن را لمس کنید. برای انتخاب دقیق‌تر از فهرست محل‌ها استفاده کنید؛ محل انتخاب‌شده را پیش از تأیید بررسی کنید.</p>`,
    };
}
