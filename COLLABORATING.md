# Collaborating on the GOAT app

Everything needed to pull this repo and get the app running against a local
backend.

## Short version

1. Accept the collaborator invite (this repo is private)
2. Merge the `feature/leaderboard-ranking` PR into the backend's `master`
3. `python manage.py migrate`
4. Run the backend on `0.0.0.0:8000`, with your LAN IP in `ALLOWED_HOSTS`
5. Clone this repo and `git checkout master`
6. `npm install && npx expo start`, scan with Expo Go on the same Wi-Fi

Steps 2–4 are in the backend repo; 5–6 are here. Details below.

## 1. Access

This repo is **private**. You need to be added as a collaborator before you
can clone it, otherwise GitHub returns a 404 rather than a permissions error.

## 2. Clone the right branch

**`master` is the branch you want — not `main`, and no feature branch.**

The repo's default branch is `main`, but it holds a single unrelated
"Initial commit" and shares no history with `master`. Cloning and staying on
`main` gives you an almost empty repo, which looks like the work is missing.

```bash
git clone https://github.com/MarkoAzizzz/GOAT-APP.git
cd GOAT-APP
git checkout master
```

Everything is on `master`: both apps, the shared components, and this guide.
Nothing else needs pulling.

## 3. Backend first

The app is a client for the Django backend in
`ahmedVq/GOAT-performance-system`. It does not duplicate the backend or
database.

Your `master` already has the points-based scoring rework, so the app's
scoring screens work against it as-is. One thing is still missing: the
leaderboard has no `rank`, `previous_rank` or `student_uuid`, which the
Board, the Home rank card and the student intro all read.

That's in a separate PR from `MarkoAzizzz/GOAT-performance-system`, branch
**`feature/leaderboard-ranking`** — one commit, five files, all inside
`leaderboard/`.

Merge it against **`master`**, not `main`: those two branches have unrelated
histories in that repo too, and a PR opened against `main` shows 168 files
instead of 5. The correct comparison is:

```
https://github.com/ahmedVq/GOAT-performance-system/compare/master...MarkoAzizzz:GOAT-performance-system:feature/leaderboard-ranking
```

It also repairs `leaderboard/tests.py`, which currently fails on `master` —
all 6 tests error on `level_at_assessment`, a field an earlier migration
already dropped. Measured: `master` is 16 failing of 78; with this branch,
10 failing of 80. The remaining 10 are in analytics and one assessments
test, pre-existing and untouched by this change.

Then:

```bash
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

`0.0.0.0` matters — bound to `127.0.0.1` the server is unreachable from a
phone.

Then add your machine's LAN IP to `ALLOWED_HOSTS` in `backend/.env`:

```
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.42
```

That value is per-machine. Don't assume whatever IP is already in the file is
yours — check with `ipconfig` / `ifconfig` and add your own.

## 4. Run the app

```bash
npm install
npx expo start
```

Install **Expo Go** on your phone and scan the QR code. Phone and computer
must be on the **same Wi-Fi network**.

The app works out which host to call on its own:

| Target | Host used |
|---|---|
| Web / iOS simulator | `localhost:8000` |
| Android emulator | `10.0.2.2:8000` |
| Real device via Expo Go | your computer's LAN IP, read from Expo's dev server |

So no manual host config — but the two backend conditions above still have to
hold.

## 5. If it won't connect

- **Expo Go can't reach the dev server** — phone on mobile data instead of
  Wi-Fi, or on a different network from the computer.
- **App loads, every request fails** — backend bound to `127.0.0.1`, or your
  LAN IP missing from `ALLOWED_HOSTS`.
- **Laptop IP changed** — switching networks changes it, which breaks both
  the Expo URL and the `ALLOWED_HOSTS` entry. Re-check both.
- **Score submits fail / board empty** — the `feature/leaderboard-ranking`
  work isn't merged, or migrations haven't run.

## 6. Where things live

```
src/
  components/      Shared UI: ConfirmModal, SignOutButton, mascot backdrop
  features/
    auth/          Login, AuthContext, per-role welcome panels
    admin/         Coach app: shell, tab bar, Home/Team/Score/Board/More
    student/       Athlete app: shell, Home/Progress/Board/Profile
    students/      Student API + admin-side profile screen
    assessments/   Scoring API + assessment detail screen
    leaderboard/   Leaderboard API
  lib/             API client, secure storage
  screens/         RootAuthScreen (routes by role after login)
  theme/           Design tokens, fonts, theme provider
```

Login routes by role: `admin` → `AdminShell`, `student` → `StudentShell`.

## 7. Two things that will bite you

**Pillar standings are 0–100, not 0–10.** A standing aggregates its criteria,
so it ranges roughly 0–100, while a single criterion is 0–10 and a delta is
−3 to +3. Drawing a standing against 10 fills every bar.

**Don't use `flex: 1` with `gap` in a row.** That pairing collapses row
children to zero width on some Android builds. It made list text invisible
and progress bars render as single dots, and it cost a long debugging
session. Rows here derive widths from `useWindowDimensions` instead — follow
the existing pattern when adding a row with a fixed-width element beside
flexible text.

## 8. Not yet verified

Change-password and sign-out have not been exercised end to end on a device.
The student **More** tab is still a placeholder, as is the design's **Box**
chat tab.
