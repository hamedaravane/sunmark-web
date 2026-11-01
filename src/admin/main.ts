import './style.css';
import { AdminClient, AdminRequestError, type UserPage } from './client';
import { shell, stats, userList, userDetail, number, date } from './markup';
import { analyticsSummary, analyticsTimeline } from './analyticsMarkup';

const root = document.querySelector<HTMLElement>('#admin-root');
if (!root) throw new Error('Admin mount missing');
root.innerHTML = shell();
function element<T extends HTMLElement>(selector: string): T {
    const el = document.querySelector<T>(selector);
    if (!el) throw new Error('Admin element missing');
    return el;
}
const client = new AdminClient();
let request = new AbortController();
let userPage: UserPage | undefined;
let page = 1;
let query = '';
const detail = element<HTMLDialogElement>('#user-detail');
const message = element('#message');
function clearPrivateData() {
    userPage = undefined;
    element('#dashboard').hidden = true;
    element('#stats').replaceChildren();
    element('#analytics').replaceChildren();
    element('#user-list').replaceChildren();
    element('#detail-body').replaceChildren();
    element('#page-info').textContent = '';
    element('#updated').textContent = '';
    if (detail.open) detail.close();
}
function loginView() {
    clearPrivateData();
    element('#login').hidden = false;
}
function report(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (error instanceof AdminRequestError && (error.status === 401 || error.status === 403)) {
        loginView();
        element('#logout').hidden = error.status === 401;
    }
    message.textContent =
        error instanceof AdminRequestError
            ? error.message
            : 'ارتباط با سرور ممکن نشد. دوباره تلاش کنید.';
}
async function load() {
    request.abort();
    request = new AbortController();
    const current = request;
    element('#dashboard').setAttribute('aria-busy', 'true');
    message.textContent = 'در حال دریافت اطلاعات…';
    try {
        const [overview, users, insights] = await Promise.all([
            client.overview(current.signal),
            client.users(query, page, current.signal),
            client.analytics(current.signal),
        ]);
        if (current.signal.aborted) return;
        userPage = users;
        element('#login').hidden = true;
        element('#logout').hidden = false;
        element('#dashboard').hidden = false;
        element('#stats').innerHTML = stats(overview);
        element('#analytics').innerHTML = analyticsSummary(insights);
        element('#user-list').innerHTML = userList(users);
        element('#updated').textContent = 'آخرین دریافت: ' + date(overview.checkedAt);
        element('#page-info').textContent =
            `${number(users.total)} حساب · صفحه ${number(page)} از ${number(Math.max(1, Math.ceil(users.total / users.limit)))}`;
        element<HTMLButtonElement>('#previous').disabled = page <= 1;
        element<HTMLButtonElement>('#next').disabled = page * users.limit >= users.total;
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
    const data = new FormData(form);
    const username = String(data.get('username') ?? '');
    const password = String(data.get('password') ?? '');
    const passwordInput = form.querySelector<HTMLInputElement>('[name="password"]');
    const button = form.querySelector<HTMLButtonElement>('button');
    if (button) button.disabled = true;
    request.abort();
    request = new AbortController();
    const current = request;
    message.textContent = 'در حال ورود…';
    void client
        .login(username, password, current.signal)
        .then(async () => {
            if (!current.signal.aborted) {
                page = 1;
                await load();
            }
        })
        .catch((error) => {
            if (!current.signal.aborted) report(error);
        })
        .finally(() => {
            if (passwordInput) passwordInput.value = '';
            if (button) button.disabled = false;
        });
});
element('#logout').addEventListener('click', () => {
    request.abort();
    request = new AbortController();
    loginView();
    element('#logout').hidden = true;
    void client
        .logout(request.signal)
        .then(() => {
            message.textContent = 'از حساب خارج شدید.';
        })
        .catch((error) => {
            element('#logout').hidden = false;
            report(error);
        });
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
element('#user-list').addEventListener('click', (event) => {
    const button =
        event.target instanceof Element ? event.target.closest<HTMLElement>('[data-user]') : null;
    const user = userPage?.users.find((user) => user.id === button?.dataset.user);
    if (!user) return;
    element('#detail-body').innerHTML = userDetail(user);
    const timeline = document.createElement('div');
    timeline.textContent = 'در حال دریافت فعالیت…';
    element('#detail-body').append(timeline);
    const current = request;
    void client
        .timeline(user.id, current.signal)
        .then((data) => {
            if (!current.signal.aborted && timeline.isConnected)
                timeline.innerHTML = analyticsTimeline(data);
        })
        .catch((error) => {
            if (!current.signal.aborted) {
                timeline.textContent = 'دریافت فعالیت انجام نشد.';
                if (error instanceof AdminRequestError && [401, 403].includes(error.status))
                    report(error);
            }
        });
    detail.showModal();
});
element('#close-detail').addEventListener('click', () => detail.close());
// Recheck authorization after navigation/restoration; never save user data locally.
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        clearPrivateData();
        void load();
    }
});
window.addEventListener('pagehide', () => {
    request.abort();
    clearPrivateData();
});
void load();
