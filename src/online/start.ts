import { canvasPixelSize } from '../game/rendering/displayGeometry';
import { Game, AUTO, Scale } from 'phaser';
import { OnlineClient, type Intent } from './client';
import { OnlineScene } from './scene';
import {
    validOffer,
    validDiscard,
    actionGroup,
    newDrafts,
    onlineMarkup,
    resources,
} from './markup';
import './style.css';
import { responsiveLayout, responsiveProperties } from '../game/ui/responsiveLayout';
export function startOnline(root: HTMLElement, onExit: () => void) {
    let storage: Storage | null = null;
    try {
        storage = localStorage;
    } catch {
        /* Optional storage. */
    }
    const configured = import.meta.env.VITE_API_BASE_URL;
    const base = String(
        configured ||
            (import.meta.env.DEV
                ? `${location.protocol}//${location.hostname}:3000`
                : location.origin),
    ).replace(/\/$/, '');
    const client = new OnlineClient(base, storage);
    const draft = newDrafts();
    let revision = -1;
    let matchId = '';
    let parentId: number | undefined;
    const canvas = document.createElement('div');
    canvas.className = 'online-canvas';
    const semantics = document.createElement('div');
    semantics.className = 'online-semantics';
    semantics.dir = 'rtl';
    root.className = 'online-root';
    root.append(canvas, semantics);
    const select = (index: number) => {
        draft.target = index;
        render();
    };
    const scene = new OnlineScene(semantics, client, draft, select);
    const game = new Game({
        type: AUTO,
        parent: canvas,
        width: root.clientWidth || 390,
        height: root.clientHeight || 844,
        backgroundColor: '#111b3b',
        scale: { mode: Scale.NONE },
        scene,
    });
    const render = () => {
        const actionFocus =
            semantics.querySelector<HTMLButtonElement>('button:focus')?.dataset.online;
        const focused = semantics.querySelector<HTMLInputElement>('input:focus');
        const key = focused?.dataset.draft;
        const caret = focused?.selectionStart;
        const panel = semantics.querySelector('.online-panel');
        const scroll = panel?.scrollTop ?? 0;
        const detailsScroll = semantics.querySelector('.online-details')?.scrollTop ?? 0;
        if (
            client.snapshot &&
            (client.snapshot.id !== matchId || client.snapshot.revision !== revision)
        ) {
            if (client.snapshot.id !== matchId) draft.selected = '';
            draft.notice = '';
            revision = client.snapshot.revision;
            matchId = client.snapshot.id;
            draft.target = -1;
            draft.tool = '';
        }
        semantics.innerHTML = onlineMarkup(client, draft);
        semantics.classList.toggle('has-game', !!client.snapshot?.game);
        const nextPanel = semantics.querySelector('.online-panel');
        if (nextPanel) nextPanel.scrollTop = scroll;
        const details = semantics.querySelector('.online-details');
        if (details) details.scrollTop = detailsScroll;
        if (key) {
            const input = semantics.querySelector<HTMLInputElement>(`input[data-draft="${key}"]`);
            input?.focus({ preventScroll: true });
            if (input?.type !== 'number' && caret !== null && caret !== undefined)
                input?.setSelectionRange(caret, caret);
        }
        if (!key && actionFocus) {
            [...semantics.querySelectorAll<HTMLButtonElement>('button')]
                .find((button) => button.dataset.online === actionFocus)
                ?.focus({ preventScroll: true });
        }
        scene.invalidate();
    };
    const execute = (intent: Intent) => {
        draft.target = -1;
        draft.tool = '';
        void client.command(intent);
    };
    const bundle = (value: Record<string, number>) => ({
        wood: value.wood ?? 0,
        brick: value.brick ?? 0,
        wheat: value.wheat ?? 0,
        wool: value.wool ?? 0,
        stone: value.stone ?? 0,
    });
    const click = (event: MouseEvent) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLButtonElement>('button[data-online]');
        if (!button || button.disabled) return;
        const [action, ...parts] = (button.dataset.online ?? '').split(':');
        const value = parts.join(':');
        switch (action) {
            case 'exit':
                onExit();
                break;
            case 'screen':
                if (value === 'home' || value === 'create' || value === 'join')
                    draft.screen = value;
                draft.notice = '';
                render();
                semantics.querySelector<HTMLInputElement>('input')?.focus();
                break;
            case 'guest':
                void client.guest(draft.name.trim());
                break;
            case 'create':
            case 'rematch':
                void client.create(draft.lobby);
                break;
            case 'join':
                void client.join(draft.code.trim().toLowerCase());
                break;
            case 'open':
                void client.open(value);
                break;
            case 'back':
                client.back();
                break;
            case 'retry':
                void client.retry();
                break;
            case 'ready':
                void client.lobby({
                    kind: 'ready',
                    ready: !client.snapshot?.seats.find((s) => s.isYou)?.ready,
                });
                break;
            case 'bot':
                void client.lobby({
                    kind: 'bot',
                    seat: Number(parts[0]),
                    enabled: parts[1] === 'true',
                });
                break;
            case 'start':
                void client.lobby({ kind: 'start' });
                break;
            case 'invite': {
                const url = new URL(location.href);
                url.searchParams.set('invite', client.snapshot?.code ?? '');
                void (async () => {
                    try {
                        if (!navigator.clipboard) throw new Error('clipboard unavailable');
                        await navigator.clipboard.writeText(url.href);
                        draft.notice = 'پیوند دعوت کپی شد. برای دوستانت بفرست.';
                    } catch {
                        draft.notice = `کپی خودکار ممکن نشد. کد دعوت: ${client.snapshot?.code ?? ''}`;
                    }
                    render();
                })();
                break;
            }
            case 'player':
                draft.selected = `player:${value}`;
                render();
                break;
            case 'workspace':
                draft.selected = value;
                draft.tool = '';
                draft.target = -1;
                render();
                break;
            case 'tool': {
                draft.tool = value;
                draft.target = -1;
                const choices =
                    client.snapshot?.game?.availableIntents.filter(
                        (intent) => actionGroup(intent) === value,
                    ) ?? [];
                if (choices.some((intent) => 'targetId' in intent)) draft.selected = '';
                if (choices.length === 1)
                    draft.target =
                        client.snapshot?.game?.availableIntents.indexOf(choices[0]) ?? -1;
                render();
                break;
            }
            case 'select':
                select(Number(value));
                break;
            case 'destinations':
                draft.selected = draft.selected === 'destinations' ? '' : 'destinations';
                render();
                break;
            case 'cancel':
                draft.target = -1;
                draft.tool = '';
                render();
                break;
            case 'confirm': {
                const intent = client.snapshot?.game?.availableIntents[draft.target];
                if (intent) execute(intent);
                break;
            }
            case 'discard':
                if (!client.snapshot?.game || !validDiscard(client.snapshot.game, draft)) break;
                execute({ kind: 'discard', resources: bundle(draft.discard) });
                break;
            case 'offer-form':
                draft.selected = 'offer';
                parentId = undefined;
                render();
                break;
            case 'recipient':
                draft.to = value;
                render();
                break;
            case 'offer':
                if (!client.snapshot?.game || !validOffer(client.snapshot.game, draft)) break;
                execute({
                    kind: 'offer',
                    to: draft.to,
                    give: bundle(draft.offerGive),
                    want: bundle(draft.offerWant),
                    ...(parentId === undefined ? {} : { parentId }),
                });
                draft.selected = '';
                break;
            case 'accept':
            case 'reject':
                execute({ kind: 'respond', offerId: Number(value), accept: action === 'accept' });
                break;
            case 'trade-confirm':
                execute({ kind: 'confirm', offerId: Number(value) });
                break;
            case 'withdraw':
                execute({ kind: 'withdraw', offerId: Number(value) });
                break;
            case 'counter': {
                const offer = client.snapshot?.offers.find((o) => o.id === Number(value));
                if (offer) {
                    parentId = offer.id;
                    draft.selected = 'offer';
                    draft.to = offer.from;
                    draft.offerGive = { ...offer.want };
                    draft.offerWant = { ...offer.give };
                    render();
                }
                break;
            }
        }
    };
    const input = (event: Event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        const [key, resource] = event.target.dataset.draft?.split('.') ?? [];
        if (key === 'name' || key === 'code' || key === 'lobby') draft[key] = event.target.value;
        else if (
            (key === 'discard' || key === 'offerGive' || key === 'offerWant') &&
            resources.some((r) => r === resource) &&
            resource
        )
            draft[key][resource] = Math.max(0, Math.floor(Number(event.target.value) || 0));
        // Recompute validation without replacing the focused native input.
        semantics.querySelectorAll<HTMLButtonElement>('button[data-online]').forEach((button) => {
            const action = button.dataset.online;
            if (client.snapshot?.game && (action === 'offer' || action === 'discard'))
                button.disabled =
                    client.busy ||
                    !!client.pending ||
                    !(action === 'offer'
                        ? validOffer(client.snapshot.game, draft)
                        : validDiscard(client.snapshot.game, draft));
            if (action === 'guest' || action === 'create' || action === 'join')
                button.disabled =
                    client.busy ||
                    !(
                        action === 'guest'
                            ? draft.name
                            : action === 'create'
                              ? draft.lobby
                              : draft.code
                    ).trim();
        });
        scene.invalidate();
    };
    const keydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && (draft.selected || draft.tool)) {
            draft.selected = '';
            draft.tool = '';
            draft.target = -1;
            render();
        }
    };
    semantics.addEventListener('keydown', keydown);
    semantics.addEventListener('click', click);
    semantics.addEventListener('input', input);
    const resize = new ResizeObserver(() => {
        const layout = responsiveLayout(root.clientWidth, root.clientHeight);
        semantics.classList.toggle('is-wide', layout.wide);
        semantics.classList.toggle('is-desktop', layout.desktop);
        for (const [key, value] of Object.entries(responsiveProperties(layout)))
            semantics.style.setProperty(key, value);
        if (root.clientWidth && root.clientHeight) {
            const size = canvasPixelSize(
                root.clientWidth,
                root.clientHeight,
                window.devicePixelRatio,
            );
            game.scale.resize(size.width, size.height);
        }
        scene.invalidate();
    });
    resize.observe(root);
    const refreshDensity = () => {
        const size = canvasPixelSize(root.clientWidth, root.clientHeight, window.devicePixelRatio);
        game.scale.resize(size.width, size.height);
        scene.invalidate();
    };
    window.addEventListener('resize', refreshDensity);
    const disconnect = client.subscribe(render);
    render();
    const invite = new URL(location.href).searchParams.get('invite');
    if (invite) {
        draft.code = invite;
        draft.screen = 'join';
    }
    void client.initialize().then(() => render());
    return {
        client,
        destroy() {
            disconnect();
            client.destroy();
            resize.disconnect();
            window.removeEventListener('resize', refreshDensity);
            semantics.removeEventListener('keydown', keydown);
            semantics.removeEventListener('click', click);
            semantics.removeEventListener('input', input);
            game.destroy(true);
        },
    };
}
