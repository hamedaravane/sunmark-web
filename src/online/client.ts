import { io, type Socket } from 'socket.io-client';
import { z } from 'zod';
import {
    guestResponseSchema,
    matchListSchema,
    matchSnapshotSchema,
    commandResponseSchema,
    type MatchSnapshot,
} from './shared/src/online/wire';
import { onlineCommandSchema } from './shared/src/online/schemas';
export type Intent = z.infer<typeof onlineCommandSchema>['intent'];
class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}
const pendingSchema = onlineCommandSchema;
export class OnlineClient {
    snapshot: MatchSnapshot | null = null;
    session: z.infer<typeof guestResponseSchema> | null = null;
    matches: z.infer<typeof matchListSchema> = [];
    connected = false;
    busy = false;
    error = '';
    pending: z.infer<typeof pendingSchema> | null = null;
    private socket: Socket | null = null;
    private listeners = new Set<() => void>();
    private matchId: string | null = null;
    private disposed = false;
    constructor(
        readonly base: string,
        private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
        private readonly request: typeof fetch = (...args) => fetch(...args),
        private readonly socketFactory: (
            uri: string,
            options: { withCredentials: boolean; autoConnect: boolean },
        ) => Socket = io,
    ) {}
    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private emit() {
        if (!this.disposed) this.listeners.forEach((listener) => listener());
    }
    private get key() {
        return `sunmark-online:${this.base}:${this.session?.id ?? ''}`;
    }
    private remember() {
        try {
            this.storage?.setItem(
                this.key,
                JSON.stringify({ matchId: this.matchId, pending: this.pending }),
            );
        } catch {
            /* Storage is optional. */
        }
    }
    private accept(input: unknown) {
        const snapshot = matchSnapshotSchema.parse(input);
        if (this.snapshot?.id === snapshot.id && this.snapshot.revision > snapshot.revision) return;
        this.snapshot = snapshot;
        this.matchId = snapshot.id;
        this.remember();
        this.emit();
    }
    private async http(path: string, body?: unknown) {
        const response = await this.request(`${this.base}/api/v1/online${path}`, {
            credentials: 'include',
            ...(body === undefined
                ? {}
                : {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                  }),
        });
        const value: unknown = await response.json();
        if (!response.ok) {
            const error = z
                .object({ message: z.union([z.string(), z.array(z.string())]) })
                .safeParse(value);
            throw new HttpError(
                response.status,
                error.success ? String(error.data.message) : 'Request failed',
            );
        }
        return value;
    }
    async initialize() {
        try {
            this.session = guestResponseSchema.parse(await this.http('/session'));
            await this.refreshList();
            let saved: unknown;
            try {
                saved = JSON.parse(this.storage?.getItem(this.key) ?? 'null');
            } catch {
                saved = null;
            }
            const parsed = z
                .object({ matchId: z.uuid().nullable(), pending: pendingSchema.nullable() })
                .safeParse(saved);
            if (parsed.success) {
                this.pending = parsed.data.pending;
                if (parsed.data.matchId) await this.open(parsed.data.matchId);
            }
        } catch (error) {
            if (!(error instanceof HttpError && error.status === 401))
                this.error = 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.';
        }
        this.emit();
    }
    async guest(name: string) {
        return this.run(async () => {
            this.session = guestResponseSchema.parse(await this.http('/session', { name }));
            await this.refreshList();
        });
    }
    async refreshList() {
        this.matches = matchListSchema.parse(await this.http('/matches'));
        this.emit();
    }
    async create(name: string) {
        return this.run(async () => {
            const snapshot = await this.http('/matches', { name });
            this.accept(snapshot);
            this.connect();
        });
    }
    async join(code: string) {
        return this.run(async () => {
            this.accept(await this.http('/join', { code }));
            this.connect();
        });
    }
    async open(id: string) {
        return this.run(async () => {
            this.matchId = id;
            this.accept(await this.http(`/matches/${encodeURIComponent(id)}`));
            this.connect();
        });
    }
    async lobby(action: unknown) {
        if (!this.matchId) return;
        return this.run(async () =>
            this.accept(await this.http(`/matches/${this.matchId}/lobby`, action)),
        );
    }
    async command(intent: Intent) {
        if (!this.snapshot || this.pending) return;
        this.pending = onlineCommandSchema.parse({
            protocolVersion: 1,
            matchId: this.snapshot.id,
            commandId: crypto.randomUUID(),
            expectedRevision: this.snapshot.revision,
            intent,
        });
        this.remember();
        return this.retry();
    }
    async retry() {
        const pending = this.pending;
        if (!pending) return;
        return this.run(async () => {
            try {
                const response = commandResponseSchema.parse(await this.http('/commands', pending));
                this.pending = null;
                this.accept(response.snapshot);
                this.connect();
                this.remember();
            } catch (error) {
                if (
                    error instanceof HttpError &&
                    [400, 401, 403, 404, 409].includes(error.status)
                ) {
                    this.pending = null;
                    this.remember();
                    if (this.matchId && error.status !== 401)
                        this.accept(await this.http(`/matches/${this.matchId}`));
                }
                throw error;
            }
        });
    }
    private async run(action: () => Promise<unknown>) {
        if (this.busy || this.disposed) return;
        this.busy = true;
        this.error = '';
        this.emit();
        try {
            await action();
        } catch (error) {
            this.error =
                error instanceof HttpError && error.status === 409
                    ? 'وضعیت بازی تغییر کرده یا این حرکت مجاز نیست. وضعیت تازه را بررسی کنید.'
                    : error instanceof HttpError && error.status === 401
                      ? 'نشست شما پایان یافته است. دوباره وارد شوید.'
                      : 'درخواست کامل نشد. اتصال را بررسی کنید و دوباره تلاش کنید.';
        } finally {
            this.busy = false;
            this.emit();
        }
    }
    private connect() {
        if (this.disposed) return;
        if (!this.socket) {
            const socket = this.socketFactory(`${this.base}/online`, {
                withCredentials: true,
                autoConnect: false,
            });
            this.socket = socket;
            socket.on('connect', () => {
                this.connected = true;
                this.sync();
            });
            socket.on('disconnect', () => {
                this.connected = false;
                this.emit();
            });
            socket.on('connect_error', () => {
                this.connected = false;
                this.error = 'اتصال زنده قطع است؛ در حال تلاش برای اتصال دوباره…';
                this.emit();
            });
            socket.on('snapshot', (value: unknown) => {
                try {
                    this.accept(value);
                } catch {
                    this.error = 'نسخه بازی با سرور سازگار نیست. صفحه را تازه کنید.';
                    this.emit();
                }
            });
            socket.on('unavailable', () => {
                this.error = 'همگام‌سازی موقتاً در دسترس نیست.';
                this.emit();
            });
            socket.connect();
        } else this.sync();
    }
    private sync() {
        if (!this.socket?.connected || !this.matchId) return;
        this.socket
            .timeout(8000)
            .emit(
                'subscribe',
                { protocolVersion: 1, matchId: this.matchId },
                (error: Error | null, response: unknown) => {
                    if (error) {
                        this.error = 'همگام‌سازی انجام نشد.';
                        this.emit();
                        return;
                    }
                    const parsed = z
                        .object({ ok: z.literal(true), snapshot: matchSnapshotSchema })
                        .safeParse(response);
                    if (parsed.success) {
                        this.error = '';
                        this.accept(parsed.data.snapshot);
                    } else {
                        this.error = 'ورود به این بازی ممکن نیست.';
                        this.emit();
                    }
                },
            );
    }
    back() {
        this.snapshot = null;
        this.matchId = null;
        this.socket?.disconnect();
        this.socket = null;
        this.connected = false;
        this.remember();
        void this.refreshList().catch(() => {});
        this.emit();
    }
    destroy() {
        this.disposed = true;
        this.socket?.disconnect();
        this.listeners.clear();
    }
}
