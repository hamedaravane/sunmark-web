import type { OnlineClient, Intent } from './client';
import type { GameView } from './shared/src/online/wire';
import {
    resources,
    resourceLabels,
    cardLabels,
    validOffer,
    validDiscard,
    type Drafts,
} from './model';
import { label, button, input, escape } from './components';
import { roomMarkup } from './rooms';
export { resources, newDrafts, validOffer, validDiscard, type Drafts } from './model';
export function intentLabel(intent: Intent, game: GameView): string {
    switch (intent.kind) {
        case 'setup-roll':
            return 'تاس برای آغاز';
        case 'roll':
            return 'تاس بریز';
        case 'end-turn':
            return 'پایان نوبت';
        case 'buy-development':
            return 'خرید کارت';
        case 'declare-victory':
            return 'اعلام پیروزی';
        case 'setup':
            return intent.type === 'road' ? 'راه آغازین' : 'آبادی آغازین';
        case 'build':
            return { road: 'راه بساز', settlement: 'آبادی بساز', city: 'شهر بساز' }[intent.type];
        case 'robber':
            return 'جابجایی اهریمن';
        case 'steal':
            return `برداشت از ${game.players.find((p) => p.id === intent.victimId)?.name ?? ''}`;
        case 'trade':
            return `${intent.ratio} ${resourceLabels[intent.give]} ← ۱ ${resourceLabels[intent.receive]}`;
        case 'play-development':
            return `${cardLabels[game.self.developmentCards.find((c) => c.id === intent.cardId)?.kind ?? 'knight']}${intent.choice?.resource ? ` · ${resourceLabels[intent.choice.resource]}` : ''}${intent.choice?.resources ? ` · ${intent.choice.resources.map((r) => resourceLabels[r]).join(' و ')}` : ''}`;
        default:
            return 'تأیید';
    }
}
export function actionGroup(intent: Intent) {
    return intent.kind === 'setup' || intent.kind === 'build'
        ? `${intent.kind}-${intent.type}`
        : intent.kind === 'play-development'
          ? `card-${intent.cardId}`
          : intent.kind;
}
export function onlineMarkup(client: OnlineClient, draft: Drafts) {
    const snapshot = client.snapshot;
    const busy = client.busy || !!client.pending;
    let body = '';
    if (!snapshot?.game || snapshot.status === 'lobby') body = roomMarkup(client, draft);
    else if (snapshot.game) {
        const game = snapshot.game;
        const actor = game.players.find((p) => p.id === game.actorId);
        const phases = {
            'setup-roll': 'انتخاب آغازگر',
            'setup-settlement': 'آبادی آغازین',
            'setup-road': 'راه آغازین',
            roll: 'تاس',
            actions: 'ساخت و تجارت',
            discard: 'دورریختن منابع',
            robber: 'جابجایی اهریمن',
            steal: 'انتخاب حریف',
            'road-building': 'راه رایگان',
            finished: 'پایان بازی',
        };
        const player = (p: GameView['players'][number]) =>
            `<button data-online="player:${escape(p.id)}" class="online-player ${p.id === game.actorId ? 'is-acting' : ''}" data-surface="${p.id === game.actorId ? 'lapis' : 'inset'}"><span data-avatar="${snapshot.seats.find((seat) => seat.playerId === p.id)?.bot ? 'atlas' : 'human'}" data-owner="${p.color.toString(16).padStart(6, '0')}" aria-hidden="true"></span><div>${label(`${p.name}${p.id === game.self.id ? ' · شما' : ''}`, 'strong')}${label(`${p.id === game.self.id ? game.self.score : p.publicScore} / ${game.victoryTarget} امتیاز`, 'small')}</div></button>`;
        body =
            `<div class="online-match-header">${player(game.players.find((p) => p.id === game.self.id) ?? game.players[0])}<div class="online-turn">${label(game.winnerId ? `پیروز: ${game.players.find((p) => p.id === game.winnerId)?.name ?? ''}` : game.actorId === game.self.id ? 'نوبت شماست' : `نوبت ${actor?.name ?? ''}`, 'strong')}${label(phases[game.phase], 'small')}</div><div class="online-dice" aria-label="${game.lastRoll ? `تاس ${game.lastRoll.join(' و ')}` : 'تاس هنوز ریخته نشده'}">${(game.lastRoll ?? [0, 0]).map((value) => `<span data-die="${value}" aria-hidden="true"></span>`).join('')}</div></div>` +
            `<div class="online-standings">${game.players
                .filter((p) => p.id !== game.self.id)
                .map(player)
                .join('')}</div>` +
            `<div class="online-hand">${resources.map((r) => `<div class="online-resource" data-surface="${{ wood: 'emerald', brick: 'coral', wheat: 'honey', wool: 'turquoise', stone: 'lapis' }[r]}"><span data-resource="${r}" aria-hidden="true"></span>${label(String(game.self.resources[r]), 'strong')}${label(resourceLabels[r], 'small')}</div>`).join('')}</div>`;
        body += `<div class="online-workspace" data-surface="inset">`;
        const groups = [
            ...new Map(
                game.availableIntents.map((intent) => [actionGroup(intent), intent]),
            ).entries(),
        ];
        const category = (intent: Intent) =>
            intent.kind === 'build' ||
            intent.kind === 'setup' ||
            intent.kind === 'robber' ||
            intent.kind === 'steal'
                ? 'build'
                : intent.kind === 'trade'
                  ? 'bank'
                  : intent.kind === 'play-development' || intent.kind === 'buy-development'
                    ? 'cards'
                    : 'primary';
        const primary = groups.filter(([, intent]) => category(intent) === 'primary');
        body += `<div class="online-actions">${primary.map(([key, intent]) => button(intentLabel(intent, game), `tool:${key}`, busy)).join('')}${(['build', 'bank', 'cards'] as const).map((key) => (groups.some(([, intent]) => category(intent) === key) ? button({ build: 'ساخت و مقصد', bank: 'بانک و بندر', cards: 'کارت‌ها' }[key], `workspace:${key}`, busy) : '')).join('')}${game.phase === 'actions' || snapshot.offers.some((offer) => ['open', 'accepted'].includes(offer.status)) ? button(`تجارت${snapshot.offers.some((offer) => offer.to === game.self.id && offer.status === 'open') ? ' · پیشنهاد تازه' : ' با بازیکنان'}`, 'workspace:trade', busy) : ''}</div>`;
        body += `<div class="online-details">`;
        if (draft.selected) body += button('بستن پنل', 'workspace:');
        if (draft.selected.startsWith('player:')) {
            const selectedPlayer = game.players.find((p) => `player:${p.id}` === draft.selected);
            if (selectedPlayer)
                body +=
                    label(selectedPlayer.name, 'h3') +
                    label(
                        `${selectedPlayer.publicScore} امتیاز آشکار · ${selectedPlayer.resourceCount} منبع · ${selectedPlayer.developmentCount} کارت پیشرفت · ${selectedPlayer.playedKnights} شوالیه بازی‌شده`,
                    ) +
                    label('دست و امتیاز پنهان حریفان خصوصی است.', 'small');
        }
        if (['build', 'bank', 'cards'].includes(draft.selected)) {
            body +=
                label(
                    {
                        build: 'ساخت و انتخاب مقصد',
                        bank: 'مبادله با بانک و بندر',
                        cards: 'کارت‌های پیشرفت',
                    }[draft.selected] ?? '',
                    'h3',
                ) +
                `<div class="online-choices">${groups
                    .filter(([, intent]) => category(intent) === draft.selected)
                    .map(([key, intent]) => button(intentLabel(intent, game), `tool:${key}`, busy))
                    .join('')}</div>`;
            if (draft.selected === 'cards')
                body += game.self.developmentCards
                    .map((card) =>
                        label(
                            `${cardLabels[card.kind]} · ${card.boughtOnRound === game.turn ? 'از نوبت بعد قابل بازی' : 'در دست'}`,
                        ),
                    )
                    .join('');
        }
        if (draft.tool) {
            const choices = game.availableIntents.filter(
                (intent) => actionGroup(intent) === draft.tool,
            );
            if (choices.length) {
                body += label('مقصد یا گزینه را انتخاب و سپس تأیید کنید.');
                if (
                    choices.some(
                        (c) => c.kind === 'build' || c.kind === 'setup' || c.kind === 'robber',
                    )
                )
                    body +=
                        button('فهرست مقصدها', 'destinations') +
                        (draft.selected === 'destinations'
                            ? `<div class="online-choices">${choices.map((intent, i) => button(`مقصد ${(i + 1).toLocaleString('fa-IR')}`, `select:${game.availableIntents.indexOf(intent)}`, busy)).join('')}</div>`
                            : '');
                else
                    body += `<div class="online-choices">${choices.map((intent) => button(intentLabel(intent, game), `select:${game.availableIntents.indexOf(intent)}`, busy)).join('')}</div>`;
            }
        }
        if (draft.tool && draft.target < 0) body += button('لغو انتخاب', 'cancel');
        const chosen = game.availableIntents[draft.target];
        if (chosen)
            body +=
                label(`انتخاب: ${intentLabel(chosen, game)}`) +
                button('تأیید حرکت', 'confirm', busy || !!client.pending) +
                button('لغو انتخاب', 'cancel');
        const discard = game.discardObligations[game.self.id] ?? 0;
        if (discard > 0)
            body +=
                label(`دقیقاً ${discard} منبع را انتخاب کنید.`) +
                resources
                    .map((r) =>
                        input(
                            resourceLabels[r],
                            `discard.${r}`,
                            draft.discard[r] ?? 0,
                            'number',
                            String(game.self.resources[r]),
                        ),
                    )
                    .join('') +
                button('تأیید دورریختن', 'discard', busy || !validDiscard(game, draft));
        if (game.phase === 'actions' && ['trade', 'offer'].includes(draft.selected)) {
            body += button('پیشنهاد تجارت', 'offer-form', busy || !!client.pending);
            if (draft.selected === 'offer')
                body +=
                    label('برای پیشنهاد یا پیشنهاد متقابل، منابع پرداختی و دریافتی را مشخص کنید.') +
                    game.players
                        .filter(
                            (p) =>
                                p.id !== game.self.id &&
                                (p.id === game.activePlayerId ||
                                    game.activePlayerId === game.self.id),
                        )
                        .map((p) => button(`مخاطب: ${p.name}`, `recipient:${p.id}`))
                        .join('') +
                    label(
                        `مخاطب انتخاب‌شده: ${game.players.find((p) => p.id === draft.to)?.name ?? 'انتخاب نشده'}`,
                    ) +
                    resources
                        .map(
                            (r) =>
                                input(
                                    `پرداخت ${resourceLabels[r]}`,
                                    `offerGive.${r}`,
                                    draft.offerGive[r] ?? 0,
                                    'number',
                                ) +
                                input(
                                    `دریافت ${resourceLabels[r]}`,
                                    `offerWant.${r}`,
                                    draft.offerWant[r] ?? 0,
                                    'number',
                                ),
                        )
                        .join('') +
                    button('ارسال پیشنهاد', 'offer', busy || !validOffer(game, draft));
        }
        for (const offer of snapshot.offers.filter(() =>
            ['trade', 'offer'].includes(draft.selected),
        )) {
            body += `<section class="online-card">${label(`پیشنهاد ${offer.id} · ${game.players.find((p) => p.id === offer.from)?.name ?? ''} ← ${game.players.find((p) => p.id === offer.to)?.name ?? ''}`)}${label(
                `پرداخت: ${resources
                    .filter((r) => offer.give[r])
                    .map((r) => `${offer.give[r]} ${resourceLabels[r]}`)
                    .join('، ')} · دریافت: ${resources
                    .filter((r) => offer.want[r])
                    .map((r) => `${offer.want[r]} ${resourceLabels[r]}`)
                    .join('، ')}`,
            )}${label({ open: 'منتظر پاسخ', accepted: 'پذیرفته‌شده؛ در انتظار تأیید نهایی', rejected: 'رد شد', countered: 'پیشنهاد متقابل', withdrawn: 'پس گرفته شد', completed: 'انجام شد', expired: 'نامعتبر' }[offer.status])}${offer.status === 'open' && offer.to === game.self.id ? button('قبول', `accept:${offer.id}`, busy || !!client.pending) + button('رد', `reject:${offer.id}`, busy || !!client.pending) + button('پیشنهاد متقابل', `counter:${offer.id}`) : ''}${offer.status === 'accepted' && [offer.from, offer.to].includes(game.self.id) ? button('تأیید نهایی مبادله', `trade-confirm:${offer.id}`, busy || !!client.pending) : ''}${['open', 'accepted'].includes(offer.status) && [offer.from, offer.to].includes(game.self.id) ? button('انصراف', `withdraw:${offer.id}`, busy || !!client.pending) : ''}</section>`;
        }
        if (game.winnerId)
            body +=
                label('بازی به پایان رسید. برای یک سفر تازه اتاق دیگری بساز.', 'p') +
                button('بازی دوباره با اتاق تازه', 'rematch', busy);
        body += '</div></div>';
    }
    const status = client.busy
        ? 'در حال انجام…'
        : client.connected
          ? 'متصل به بازی'
          : snapshot
            ? 'در حال اتصال مجدد…'
            : 'اتاق خصوصی با دوستان';
    return `<header data-surface="inset">${label('بازی آنلاین', 'h1')}${button(snapshot ? 'اتاق‌ها' : 'منو', snapshot ? 'back' : 'exit')}${label(status, 'small')}</header><section class="online-board" aria-label="جزیره بازی" ${snapshot?.game ? '' : 'hidden'}></section><main class="online-panel" aria-label="${snapshot?.game ? 'کنترل بازی' : 'تالار بازی'}"><aside class="online-feedback" aria-live="polite" data-surface="inset">${client.error ? `<p data-paint role="alert">${escape(client.error)}</p>` : ''}${draft.notice ? `<p class="online-notice" data-paint role="status">${escape(draft.notice)}</p>` : ''}${client.pending ? label('پاسخ حرکت قبلی نرسیده است. برای جلوگیری از حرکت تکراری، همان درخواست را پیگیری کن.') + button('پیگیری حرکت قبلی', 'retry', client.busy) : ''}</aside>${body}</main>`;
}
