# Admin panel

Open **https://sunmarkgame.top/admin.html** (`/admin` redirects there) and sign in
with an existing player account that has been explicitly authorized by the operator.
No separate admin password, registration form, or browser-stored access token exists.
Signing out also ends that browser's game account session.

The Persian RTL dashboard has a navigation rail, seven/thirty-day reporting,
growth/activity chart, separate offline/online/practice journeys, online entry
milestones, return cohort heatmap and concise observations for investigation.
Every chart states its sample or limitation; immature retention is pending rather
than zero. Profile fields are self-reported. Registration timestamps display in
Tehran time; analytical daily boundaries are explicitly UTC. Configured admin
accounts are excluded from insight charts, but remain labeled in the directory.

The directory searches literal name/username/phone and filters male/female or
incomplete legacy profiles. A detail dialog shows server progression, recent
permitted events and the latest twenty administrator edits. Only display name,
age (1–120) and gender (male/female) can be edited. The server locks the account,
compares the previous values, rejects concurrent changes with 409, and writes the
edit and actor/time audit atomically. Audit entries expire after 180 days. No
balances, usernames, phones, passwords, administrator privileges or private hands
can be edited/read through these forms. No CSV export or external analytics exists.

Legacy gender values remain readable during installed-client upgrades. They are
never offered as choices or guessed from names. Players complete their own choice
on next authenticated startup/login; administrators should only enter verified
corrections. A name edit updates the account/session display name for future play;
existing match snapshots and history retain their recorded names.

## Player insights

Basic measurement defaults on prospectively, preserves existing opt-outs and
provides an account control. See [definitions and retention](ANALYTICS.md).
Client observations are separate from authoritative online progression. The UI
stores no directory data in browser storage and clears private views on sign-out,
authorization failure or page departure. Requests are abortable and time-limited.

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
pagination, protected edits, concurrent-change rejection, audit history, actual insights SQL and default measurement/opt-out behavior. Frontend Node tests cover escaped profile rendering, authenticated
request policy, unauthorized responses and strict response validation. PWA build
checks verify the admin entry stays out of precaching. Browser and device review
remains the owner's interactive test.
