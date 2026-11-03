import { icon } from '../ui/icons';
import type { OnlineClient } from './client';
import type { Drafts } from './model';
import { label, button, escape } from './components';
import { roomMarkup } from './rooms';
export { newDrafts, type Drafts } from './model';

/** Entry and lobby only. A started match always mounts the shared match runtime. */
export function onlineMarkup(client: OnlineClient, draft: Drafts): string {
    if (client.snapshot?.game) return '';
    const status = client.busy
        ? 'در حال انجام…'
        : client.connected
          ? 'متصل به اتاق'
          : 'اتاق خصوصی با دوستان';
    const view = !client.session
        ? 'guest'
        : client.snapshot
          ? 'lobby'
          : client.matchmaking?.state === 'waiting'
            ? 'search'
            : draft.screen;
    return `<header class="online-header" data-surface="inset"><div class="online-brand">${icon('online', 28)}<div>${label('هم‌سفران جزیره', 'h1')}${label(status, 'small')}</div></div>${button(client.snapshot ? 'اتاق‌ها' : 'خانه', client.snapshot ? 'back' : 'exit')}</header><main class="online-panel" data-view="${view}">${client.error ? `<p data-paint role="alert">${escape(client.error)}</p>` : ''}${draft.notice ? label(draft.notice) : ''}${roomMarkup(client, draft)}</main>`;
}
