import './style.css';
import '../ui/icons.css';
import { AdminClient, AdminRequestError, type UserPage, type AdminUser } from './client';
import { shell, userList, userDetail, auditMarkup, number, date } from './markup';
import { analyticsTimeline } from './analyticsMarkup';
import { dashboard } from './dashboard';
const root = document.querySelector<HTMLElement>('#admin-root');
if (!root) throw new Error('Admin mount missing');
root.innerHTML = shell();
function element<T extends HTMLElement>(selector: string): T {
    const el = document.querySelector<T>(selector);
    if (!el) throw new Error('Admin element missing');
    return el;
}
const client = new AdminClient();
let request = new AbortController(),
    detailRequest = new AbortController();
let userPage: UserPage | undefined, selected: AdminUser | undefined;
let saving = false;
let page = 1,
    query = '',
    days: 7 | 30 = 7;
const detail = element<HTMLDialogElement>('#user-detail');
const message = element('#message');
function clearPrivateData() {
    request.abort();
    detailRequest.abort();
    userPage = undefined;
    selected = undefined;
    element('#dashboard').hidden = true;
    for (const id of ['#insight-content', '#user-list', '#detail-body', '#page-info', '#updated'])
        element(id).replaceChildren();
    if (detail.open) detail.close();
}
function report(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof AdminRequestError && [401, 403].includes(error.status)) {
        clearPrivateData();
        element('#login').hidden = false;
        element('#logout').hidden = error.status === 401;
    }
    message.textContent =
        error instanceof AdminRequestError
            ? error.message
            : 'دریافت اطلاعات انجام نشد. دوباره تلاش کنید.';
}
async function load() {
    request.abort();
    request = new AbortController();
    const current = request;
    element('#dashboard').setAttribute('aria-busy', 'true');
    message.textContent = 'در حال دریافت گزارش…';
    const gender = element<HTMLSelectElement>('#gender-filter').value;
    const filters: { gender?: 'male' | 'female'; profile: 'all' | 'incomplete' } = {
        ...(gender === 'male' || gender === 'female' ? { gender } : {}),
        profile: element<HTMLInputElement>('#incomplete-filter').checked
            ? ('incomplete' as const)
            : ('all' as const),
    };
    try {
        const [insights, users] = await Promise.all([
            client.insights(days, current.signal),
            client.users(query, page, current.signal, filters),
        ]);
        if (current.signal.aborted) return;
        userPage = users;
        element('#login').hidden = true;
        element('#logout').hidden = false;
        element('#dashboard').hidden = false;
        element('#insight-content').innerHTML = dashboard(insights);
        element('#user-list').innerHTML = userList(users);
        element('#updated').textContent =
            `آخرین دریافت: ${date(insights.checkedAt)} · گزارش ${number(days)} روز تقویمی UTC، شامل امروز`;
        element('#page-info').textContent =
            `${number(users.total)} حساب · صفحه ${number(page)} از ${number(Math.max(1, Math.ceil(users.total / users.limit)))}`;
        element<HTMLButtonElement>('#previous').disabled = page <= 1;
        element<HTMLButtonElement>('#next').disabled = page * users.limit >= users.total;
        for (const b of document.querySelectorAll<HTMLButtonElement>('[data-window]'))
            b.setAttribute('aria-pressed', String(Number(b.dataset.window) === days));
        message.textContent = '';
    } catch (error) {
        if (!current.signal.aborted) report(error);
    } finally {
        if (current === request) element('#dashboard').setAttribute('aria-busy', 'false');
    }
}
element<HTMLFormElement>('#login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;
    const input = new FormData(form),
        password = form.querySelector<HTMLInputElement>('[name="password"]');
    const button = form.querySelector<HTMLButtonElement>('button');
    if (button) button.disabled = true;
    request.abort();
    request = new AbortController();
    const current = request;
    void client
        .login(
            String(input.get('username') ?? ''),
            String(input.get('password') ?? ''),
            current.signal,
        )
        .then(async () => {
            if (!current.signal.aborted) {
                page = 1;
                await load();
            }
        })
        .catch(report)
        .finally(() => {
            if (password) password.value = '';
            if (button) button.disabled = false;
        });
});
element('#logout').addEventListener('click', () => {
    clearPrivateData();
    element('#login').hidden = false;
    element('#logout').hidden = true;
    request = new AbortController();
    void client
        .logout(request.signal)
        .then(() => {
            message.textContent = 'از حساب خارج شدید.';
        })
        .catch(report);
});
element<HTMLFormElement>('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    query = element<HTMLInputElement>('#search').value.trim();
    page = 1;
    void load();
});
element('#refresh').addEventListener('click', () => {
    void load();
});
element('#previous').addEventListener('click', () => {
    if (page > 1) {
        page--;
        void load();
    }
});
element('#next').addEventListener('click', () => {
    if (userPage && page * userPage.limit < userPage.total) {
        page++;
        void load();
    }
});
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-window]'))
    b.addEventListener('click', () => {
        days = b.dataset.window === '30' ? 30 : 7;
        page = 1;
        void load();
    });
function openUser(user: AdminUser) {
    detailRequest.abort();
    detailRequest = new AbortController();
    const current = detailRequest;
    selected = user;
    element('#detail-body').innerHTML = userDetail(user);
    if (!detail.open) detail.showModal();
    void client
        .timeline(user.id, current.signal)
        .then((data) => {
            if (!current.signal.aborted && selected?.id === user.id)
                element('#user-activity').innerHTML = analyticsTimeline(data);
        })
        .catch((error) => {
            if (!current.signal.aborted) {
                element('#user-activity').textContent = 'دریافت فعالیت انجام نشد.';
                if (error instanceof AdminRequestError && [401, 403].includes(error.status))
                    report(error);
            }
        });
    void client
        .audit(user.id, current.signal)
        .then((data) => {
            if (!current.signal.aborted && selected?.id === user.id)
                element('#profile-history').innerHTML = auditMarkup(data);
        })
        .catch((error) => {
            if (!current.signal.aborted) {
                element('#profile-history').textContent = 'دریافت سابقهٔ ویرایش انجام نشد.';
                if (error instanceof AdminRequestError && [401, 403].includes(error.status))
                    report(error);
            }
        });
}
element('#user-list').addEventListener('click', (event) => {
    const b =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-user]') : null;
    const user = userPage?.users.find((u) => u.id === b?.dataset.user);
    if (user) openUser(user);
});
element('#detail-body').addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || form.id !== 'profile-edit' || !selected) return;
    event.preventDefault();
    if (saving || !form.reportValidity()) return;
    saving = true;
    const user = selected,
        fields = new FormData(form),
        gender = fields.get('gender');
    if (gender !== 'male' && gender !== 'female') {
        saving = false;
        return;
    }
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (button) button.disabled = true;
    const output = element('#profile-edit-message');
    output.textContent = 'در حال ذخیره…';
    const current = detailRequest;
    void client
        .updateProfile(
            user.id,
            {
                profile: {
                    name: String(fields.get('name') ?? '').trim(),
                    age: Number(fields.get('age')),
                    gender,
                },
                expected: { name: user.name, age: user.age, gender: user.gender },
            },
            current.signal,
        )
        .then(async (result) => {
            if (!current.signal.aborted) {
                const updated = { ...user, ...result.profile };
                openUser(updated);
                element('#profile-edit-message').textContent = 'تغییرات ذخیره و در سابقه ثبت شد.';
                await load();
            }
        })
        .catch((error) => {
            if (!current.signal.aborted) {
                output.textContent =
                    error instanceof AdminRequestError
                        ? error.message
                        : 'ذخیره تأیید نشد؛ اطلاعات را دوباره دریافت کنید.';
                if (error instanceof AdminRequestError && [401, 403].includes(error.status))
                    report(error);
            }
        })
        .finally(() => {
            saving = false;
            if (button?.isConnected) button.disabled = false;
        });
});
element('#close-detail').addEventListener('click', () => {
    if (!saving) detail.close();
});
detail.addEventListener('cancel', (event) => {
    if (saving) event.preventDefault();
});
detail.addEventListener('close', () => {
    detailRequest.abort();
    selected = undefined;
    element('#detail-body').replaceChildren();
});
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        clearPrivateData();
        void load();
    }
});
window.addEventListener('pagehide', clearPrivateData);
void load();
