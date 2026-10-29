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
    return `<header data-surface="inset">${label('بازی آنلاین', 'h1')}${button(client.snapshot ? 'اتاق‌ها' : 'منو', client.snapshot ? 'back' : 'exit')}${label(status, 'small')}</header><main class="online-panel">${client.error ? `<p data-paint role="alert">${escape(client.error)}</p>` : ''}${draft.notice ? label(draft.notice) : ''}${roomMarkup(client, draft)}</main>`;
}
