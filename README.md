# GOAT App

Mobile app for the GOAT Performance System — a boxing/kickboxing gym's performance-tracking platform. Built with React Native (Expo), NativeWind, and Moti/Reanimated.

This is a separate repo from the main [GOAT Performance System](https://github.com/ahmedVq/GOAT-performance-system) (Django backend + React web app). This app is a new client for that same backend — it does not duplicate the backend or database, it just talks to the existing API.

## Stack

- **Expo** (React Native) — runs on iOS, Android, and web from one codebase
- **NativeWind** — Tailwind CSS for React Native
- **Moti** / **React Native Reanimated** — animation
- **expo-secure-store** — token storage (falls back to `localStorage` on web)

## Getting started

```bash
npm install
npx expo start
```

This prints a QR code:
- **Phone (Expo Go)**: install [Expo Go](https://expo.dev/go) and scan the QR code. Your phone must be on the **same Wi-Fi network** as your computer.
- **Web**: press `w` in the terminal, or run `npx expo start --web`.
- **Simulator**: press `i` (iOS) or `a` (Android) if you have one set up.

## Connecting to the backend

This app needs the Django backend from the [GOAT Performance System repo](https://github.com/ahmedVq/GOAT-performance-system) running locally (`python manage.py runserver 0.0.0.0:8000` — the `0.0.0.0` part matters if you want to test on a real phone, not just a simulator or web browser).

The app auto-detects the right host to call:
- **Web / iOS simulator**: `localhost:8000`
- **Android emulator**: `10.0.2.2:8000` (the emulator's alias for the host machine)
- **Real device via Expo Go**: automatically uses your computer's LAN IP (read from Expo's own dev server address) — no manual config needed, as long as your phone and computer are on the same network.

See `src/lib/api.ts` if you need to point at a different backend (e.g. a deployed instance instead of local).

**Backend `.env` note**: if testing on a real phone, the backend's `ALLOWED_HOSTS` needs your computer's LAN IP added (e.g. `192.168.1.5`) — otherwise Django will reject the request. This is a per-machine value, so whoever's running the backend needs to add their own IP locally (don't rely on the IP already in that file being correct for you).

## Project structure

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
  lib/             API client, secure storage helpers
  screens/         RootAuthScreen (routes by role after login)
  theme/           Design tokens, fonts, light/dark theme provider
assets/            Brand assets (mascot, wordmark) and app icons
```

Login routes by role: `admin` gets `AdminShell`, `student` gets
`StudentShell`. Both show a stats panel first, then tap through to the app.

## Scoring model

Coaches do not enter an absolute score. Each criterion takes a **delta from
-3 to +3**, which the backend applies on top of that criterion's running
**standing**. A `0` is a real result — "assessed, no change" — not a skipped
field, so all 25 criteria are always submitted.

Two scales are easy to confuse:

| Value | Range |
|---|---|
| Criterion `effective_score` | 0–10 |
| Criterion `delta` | −3 to +3 |
| Pillar `standing_after` | roughly 0–100 (it aggregates its criteria) |
| Student rating | open-ended, starts at 1000 |

## Backend requirements

This app needs backend changes that may not be on `main` of the backend repo
yet — delta-based scoring (`CriterionScore.delta`, `PillarScore.standing_*`)
and leaderboard `rank` / `previous_rank`, plus their migrations. Without
them, scoring submits will fail and the board shows no ranks.

## Android layout gotcha

Rows in this codebase size their children with widths derived from
`useWindowDimensions`, not `flex: 1` combined with `gap`. That pairing
collapses row children to zero width on some Android builds — it made list
text invisible and progress bars render as single dots. If you add a row with
a fixed-width element beside flexible text, follow the existing pattern.

## Brand & design reference

See the main repo's `Coding/docs/` folder for:
- `GOAT_Brand_Guidelines.md` — colors, typography, motion principles
- `GOAT_App_Design_Brief.md` — screen-by-screen design direction for this app
- `GOAT_Existing_System_Reference.md` / `GOAT_App_System_Integration.md` — how this app's data model maps to the existing backend

## Current status

- ✅ Admin login (real API auth, JWT storage, keyboard handling, animated entrance/transition)
- ⬜ Student login
- ⬜ Dashboard, assessment scoring, leaderboard, Box chat screens (component library exists in `src/components/` and `ComponentPreviewScreen.tsx`, not yet wired to real screens)

## Dev/test credentials

For local testing against a fresh dev database, an admin test account may need its password set manually via the Django shell — this isn't seeded automatically. Ask in the team chat rather than hardcoding credentials anywhere in this repo.
