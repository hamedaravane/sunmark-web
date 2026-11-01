# Admin panel

Open **https://sunmarkgame.top/admin.html** (`/admin` redirects there) and sign in
with an existing player account that has been explicitly authorized by the operator.
No separate admin password, registration form, or browser-stored access token exists.
Signing out also ends that browser's game account session.

The Persian, responsive panel provides registration totals, registrations in the
last 24 hours and seven days, online game status totals, paginated search by name,
username or phone, and user profile/progression details. Profile age, gender, name
and phone are self-reported. Registration dates display in Tehran time. Stored
game status does not establish current presence; offline players and visits are
not tracked. Account progression and historical game counts can differ.

The panel is read-only. It cannot edit users, change balances, delete data,
view passwords/recovery credentials, or inspect private match hands. No CSV export
or third-party analytics is installed.

## Player insights

The analytics section shows seven-day observed activity, daily counts, return cohorts, phase/build reach and the latest 50 permitted events in each user’s detail view. It measures only opted-in registered players from this release onward. It explicitly distinguishes these client observations from authoritative game totals. See [analytics definitions and privacy](ANALYTICS.md).

## Access and deployment

The backend requires both a valid registered account session and an immutable
account UUID in `ADMIN_ACCOUNT_IDS`. An empty list denies all admin access. There
is no client-side role switch. All admin routes authorize each request, reject
foreign origins, use bounded pagination/search, and return `Cache-Control: no-store`.

Production passes `SUNMARK_ADMIN_ACCOUNT_IDS` from the root-owned
`/etc/sunmark/deploy.env` into the API container. Use a comma-separated list of
reviewed registered account UUIDs. Never authorize an account from an unverified
display name alone. Apply configuration through the regular deployment; removing
an ID and restarting the API revokes its admin access. For local Compose, set the
same variable only for disposable registered test accounts.

`admin.html` and `src/admin/` are a separate native HTML application, outside Phaser
and the game runtime. Vite builds both entry points. The panel registers no service
worker, stores no user data in local/session storage, and is excluded from offline
precaching/navigation fallback. Use `/admin.html` when an older game service worker
is still installed. Its HTML uses no-store and a same-origin content security policy.
API authorization protects the data even though the login page and bundle are public.

## Verification

Backend database tests cover anonymous/guest/non-admin denial, expired sessions,
default-deny configuration, foreign origins, safe response fields, literal search
and pagination. Frontend Node tests cover escaped profile rendering, authenticated
request policy, unauthorized responses and strict response validation. PWA build
checks verify the admin entry stays out of precaching. Browser and device review
remains the owner's interactive test.
