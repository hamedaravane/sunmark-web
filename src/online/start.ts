import { Game, AUTO, Scale } from 'phaser';
import { OnlineClient, type Intent } from './client';
import { OnlineScene } from './scene';
import { newDrafts, onlineMarkup, resources } from './markup';
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
        const focused = semantics.querySelector<HTMLInputElement>('input:focus');
        const key = focused?.dataset.draft;
        const caret = focused?.selectionStart;
        const panel = semantics.querySelector('.online-panel');
        const scroll = panel?.scrollTop ?? 0;
        if (
            client.snapshot &&
            (client.snapshot.id !== matchId || client.snapshot.revision !== revision)
        ) {
            revision = client.snapshot.revision;
            matchId = client.snapshot.id;
            draft.target = -1;
            draft.tool = '';
        }
        semantics.innerHTML = onlineMarkup(client, draft);
        semantics.classList.toggle('has-game', !!client.snapshot?.game);
        const nextPanel = semantics.querySelector('.online-panel');
        if (nextPanel) nextPanel.scrollTop = scroll;
        if (key) {
            const input = semantics.querySelector<HTMLInputElement>(`input[data-draft="${key}"]`);
            input?.focus({ preventScroll: true });
            if (input?.type !== 'number' && caret !== null && caret !== undefined)
                input?.setSelectionRange(caret, caret);
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
            case 'guest':
                void client.guest(draft.name);
                break;
            case 'create':
            case 'rematch':
                void client.create(draft.lobby);
                break;
            case 'join':
                void client.join(draft.code.trim());
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
                void navigator.clipboard?.writeText(url.href).catch(() => {
                    client.error = 'کد دعوت را از بالای صفحه کپی کنید.';
                    render();
                });
                break;
            }
            case 'tool': {
                draft.tool = value;
                draft.target = -1;
                const choices =
                    client.snapshot?.game?.availableIntents.filter(
                        (intent) =>
                            (intent.kind === 'setup' || intent.kind === 'build'
                                ? `${intent.kind}-${intent.type}`
                                : intent.kind === 'play-development'
                                  ? `card-${intent.cardId}`
                                  : intent.kind) === value,
                    ) ?? [];
                if (choices.length === 1)
                    draft.target =
                        client.snapshot?.game?.availableIntents.indexOf(choices[0]) ?? -1;
                render();
                break;
            }
            case 'select':
                select(Number(value));
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
        scene.invalidate();
    };
    semantics.addEventListener('click', click);
    semantics.addEventListener('input', input);
    const resize = new ResizeObserver(() => {
        const layout = responsiveLayout(root.clientWidth, root.clientHeight);
        semantics.classList.toggle('is-wide', layout.wide);
        semantics.classList.toggle('is-desktop', layout.desktop);
        for (const [key, value] of Object.entries(responsiveProperties(layout)))
            semantics.style.setProperty(key, value);
        if (root.clientWidth && root.clientHeight)
            game.scale.resize(root.clientWidth, root.clientHeight);
        scene.invalidate();
    });
    resize.observe(root);
    const disconnect = client.subscribe(render);
    render();
    const invite = new URL(location.href).searchParams.get('invite');
    if (invite) draft.code = invite;
    void client.initialize().then(() => render());
    return {
        client,
        destroy() {
            disconnect();
            client.destroy();
            resize.disconnect();
            semantics.removeEventListener('click', click);
            semantics.removeEventListener('input', input);
            game.destroy(true);
        },
    };
}
