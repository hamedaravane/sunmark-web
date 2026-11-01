import {
    accountResponseSchema,
    registrationResponseSchema,
    registrationSchema,
} from '../online/shared/src/online/account.schemas';
import { accountMarkup, type AccountMode } from './markup';
import { apiBase, playerIdentity, saveIdentity } from './identity';
import './style.css';
class AccountRequestError extends Error {}
/** Native forms retain password-manager, autofill and mobile keyboard support. */
export function showAccount(
    parent: HTMLElement,
    allowOffline = true,
    signIn = false,
): Promise<void> {
    return new Promise((resolve) => {
        const root = document.createElement('dialog');
        root.className = 'account-dialog';
        root.dir = 'rtl';
        parent.append(root);
        let mode: AccountMode = playerIdentity() ? (signIn ? 'login' : 'profile') : 'register';
        let step = 1,
            busy = false;
        let recovery = '';
        const values: Record<string, string> = {};
        const close = () => {
            root.close();
            root.remove();
            resolve();
        };
        const render = () => {
            root.innerHTML = accountMarkup(
                mode,
                step,
                values,
                playerIdentity(),
                recovery,
                allowOffline,
            );
        };
        const error = (message: string) => {
            const p = root.querySelector('.account-error');
            if (p) p.textContent = message;
        };
        const request = async (path: string, data: unknown) => {
            const response = await fetch(`${apiBase()}/api/v1/online/account/${path}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(15_000),
            });
            if (!response.ok)
                throw new AccountRequestError(
                    response.status === 409
                        ? 'نام کاربری یا شماره همراه قبلاً ثبت شده است.'
                        : response.status === 429
                          ? 'کمی صبر کن و دوباره تلاش کن.'
                          : response.status === 401
                            ? 'اطلاعات ورود یا بازیابی درست نیست.'
                            : 'ارتباط کامل نشد. دوباره تلاش کن.',
                );
            return response.json() as Promise<unknown>;
        };
        root.addEventListener('submit', (event) => {
            event.preventDefault();
            if (busy) return;
            const form = root.querySelector('form');
            if (!form || !form.reportValidity()) return;
            for (const [key, value] of new FormData(form))
                if (typeof value === 'string') values[key] = value;
            if (mode === 'register' && step === 1) {
                if (
                    !registrationSchema
                        .pick({ name: true, phone: true })
                        .safeParse({ name: values.name, phone: values.phone }).success
                ) {
                    error(
                        'نام و شماره همراه را بررسی کن؛ شماره ایران را با ۰۹ یا شماره بین‌المللی را با + وارد کن.',
                    );
                    return;
                }
                step = 2;
                render();
                return;
            }
            const data =
                mode === 'register'
                    ? registrationSchema.safeParse({
                          ...values,
                          age: Number(
                              (values.age ?? '').replace(/[۰-۹٠-٩]/g, (c) =>
                                  String(c.charCodeAt(0) - (c >= '۰' && c <= '۹' ? 1776 : 1632)),
                              ),
                          ),
                      })
                    : null;
            if (data && !data.success) {
                error(
                    'اطلاعات را بررسی کن؛ شماره همراه با کد کشور، سن ۱ تا ۱۲۰ و رمز حداقل ۱۰ نویسه باشد.',
                );
                return;
            }
            busy = true;
            for (const button of root.querySelectorAll('button')) button.disabled = true;
            void (async () => {
                try {
                    const result = await request(
                        mode === 'register' ? 'register' : mode,
                        data?.success
                            ? data.data
                            : {
                                  username: values.username?.toLowerCase().trim(),
                                  password: values.password,
                                  ...(mode === 'recover'
                                      ? { recoveryCode: values.recoveryCode?.trim() }
                                      : {}),
                              },
                    );
                    const parsed =
                        mode === 'login'
                            ? accountResponseSchema.parse(result)
                            : registrationResponseSchema.parse(result);
                    saveIdentity({
                        id: parsed.profile.id,
                        name: parsed.profile.name,
                        username: parsed.profile.username,
                    });
                    for (const key of Object.keys(values)) delete values[key];
                    if ('recoveryCode' in parsed && typeof parsed.recoveryCode === 'string') {
                        recovery = parsed.recoveryCode;
                        render();
                    } else close();
                } catch (e) {
                    error(
                        e instanceof AccountRequestError
                            ? e.message
                            : 'ارتباط کامل نشد. اتصال را بررسی کن و دوباره تلاش کن.',
                    );
                } finally {
                    busy = false;
                    for (const button of root.querySelectorAll('button')) button.disabled = false;
                }
            })();
        });
        root.addEventListener('click', (event) => {
            const action =
                event.target instanceof Element
                    ? event.target.closest<HTMLButtonElement>('[data-account]')?.dataset.account
                    : null;
            if (!action || busy) return;
            if (action === 'done') close();
            if (action === 'copy') {
                void navigator.clipboard
                    ?.writeText(recovery)
                    .then(() => {
                        const b = root.querySelector('[data-account="copy"]');
                        if (b) b.textContent = 'کپی شد';
                    })
                    .catch(() => {});
            }
            if (action === 'previous') {
                const form = root.querySelector('form');
                if (form)
                    for (const [key, value] of new FormData(form))
                        if (typeof value === 'string') values[key] = value;
                step = 1;
                render();
            }
            if (action === 'login' || action === 'register' || action === 'recover') {
                mode = action;
                step = 1;
                delete values.password;
                render();
            }
            if (action === 'logout') {
                busy = true;
                void request('logout', {})
                    .then(() => {
                        saveIdentity(null);
                        mode = 'login';
                        render();
                    })
                    .catch(() => error('خروج انجام نشد. اتصال را بررسی کن.'))
                    .finally(() => {
                        busy = false;
                    });
            }
        });
        root.addEventListener('cancel', (event) => {
            event.preventDefault();
            if (!busy) close();
        });
        render();
        root.showModal();
    });
}
