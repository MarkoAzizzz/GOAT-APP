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
  components/     Shared UI building blocks (GoatCard, GoatButton, StatRing, etc.)
  features/
    auth/         Login flow: AuthContext, API calls, LoginPanel, WelcomePanel
  lib/             API client, secure storage helpers
  screens/         Top-level screens (RootAuthScreen, ComponentPreviewScreen)
  theme/           Design tokens, fonts, light/dark theme provider
assets/            Brand assets (mascot, wordmark) and app icons
```

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
