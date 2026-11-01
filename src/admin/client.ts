import type { z } from 'zod';
import {
    analyticsSummarySchema,
    analyticsTimelineSchema,
} from '../online/shared/src/analytics/analytics.schemas';
import { adminUsersSchema, overviewSchema } from '../online/shared/src/admin/admin.schemas';
import { accountResponseSchema, loginSchema } from '../online/shared/src/online/account.schemas';

export type AdminUser = z.infer<typeof adminUsersSchema>['users'][number];
export type Overview = z.infer<typeof overviewSchema>;
export type UserPage = z.infer<typeof adminUsersSchema>;

export class AdminRequestError extends Error {
    constructor(public readonly status: number) {
        super(
            status === 403
                ? 'دسترسی مدیریت برای این حساب فعال نیست.'
                : status === 401
                  ? 'برای ادامه وارد حساب مدیر شوید.'
                  : status === 429
                    ? 'درخواست‌ها زیاد است. کمی صبر کنید و دوباره تلاش کنید.'
                    : 'دریافت اطلاعات ممکن نشد. دوباره تلاش کنید.',
        );
    }
}

export class AdminClient {
    constructor(private readonly request: typeof fetch = fetch.bind(globalThis)) {}

    private async json(path: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
        const response = await this.request('/api/v1/' + path, {
            method: body === undefined ? 'GET' : 'POST',
            credentials: 'same-origin',
            cache: 'no-store',
            signal,
            ...(body === undefined
                ? {}
                : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
        });
        if (!response.ok) throw new AdminRequestError(response.status);
        return response.json();
    }
    async login(username: string, password: string, signal: AbortSignal) {
        const input = loginSchema.parse({ username, password });
        accountResponseSchema.parse(await this.json('online/account/login', signal, input));
    }
    async logout(signal: AbortSignal) {
        await this.json('online/account/logout', signal, {});
    }
    async overview(signal: AbortSignal) {
        return overviewSchema.parse(await this.json('admin/overview', signal));
    }
    async analytics(signal: AbortSignal) {
        return analyticsSummarySchema.parse(await this.json('admin/analytics', signal));
    }
    async timeline(id: string, signal: AbortSignal) {
        return analyticsTimelineSchema.parse(
            await this.json('admin/users/' + encodeURIComponent(id) + '/analytics', signal),
        );
    }
    async users(q: string, page: number, signal: AbortSignal) {
        const params = new URLSearchParams({ q, page: String(page), limit: '25' });
        return adminUsersSchema.parse(await this.json('admin/users?' + params, signal));
    }
}
