# MoneyAction v0.1.1 — Global Beta Foundation

MoneyAction turns a user's existing skills, interests, available time and target income into a practical 90-day income experiment, then surfaces one concrete action at a time.

## v0.1.1 changes

- Global-first profile: language, market, currency and timezone are stored with the user profile.
- 5 UI languages: Korean, English, Japanese, Spanish and Brazilian Portuguese.
- Starter markets: South Korea, United States, Canada, United Kingdom, Australia, Japan, Mexico, Spain, Brazil and Global/Other.
- Market-specific currency and sensible starter goal presets.
- Stable skill/interest/category IDs so translations do not leak into app logic.
- AI prompt now receives market + currency + language context and can use local income-model seeds without being limited to a fixed list.
- Server-side AI response normalization validates 3 paths, 7 missions and 7/30/90-day milestones before returning a plan.
- Daily beta quota uses the user's local timezone rather than UTC.
- Client AI requests have a timeout and preserve localized server errors.
- GitHub Actions workflow can build a debug Android APK in the cloud.

## Supported languages

- `ko` — 한국어
- `en` — English
- `ja` — 日本語
- `es` — Español
- `pt-BR` — Português (Brasil)

## Architecture

- React + Vite
- Capacitor Android
- Cloudflare Workers
- Cloudflare D1
- Gemini API through the Worker only (never embedded in the mobile app)

## Local web run

```bash
npm ci
npm run dev
```

## Android build

```bash
npm ci
npm run build
npm run cap:sync
cd android
gradle assembleDebug
```

The debug APK is generated at:

`android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub cloud APK build

`.github/workflows/android-debug.yml` builds a debug APK on pushes to `main` and also supports manual `workflow_dispatch`.

If the production Worker is connected, create a GitHub Actions secret named:

`VITE_API_URL`

The workflow uploads the APK as the `money-action-beta-apk` artifact.

## AI backend

1. Create a Cloudflare D1 database named `money-action`.
2. Replace `database_id` in `backend/wrangler.toml`.
3. Apply `backend/schema.sql`.
4. Set `GEMINI_API_KEY` as a Worker secret.
5. Deploy the Worker.
6. Set `VITE_API_URL` for the app build.

Never place the Gemini API key in the app or Vite environment variables.

## Still required before store release

- Real AdMob SDK integration and consent flow.
- Google Play one-time ad-removal/lifetime purchase and server-side purchase verification.
- Account/device restoration strategy and stronger abuse resistance for free AI quota.
- Native notification scheduling and user-selected reminder time.
- Privacy policy, terms, account/data deletion flow where applicable.
- Production signing key and release AAB workflow.
- Real-device testing across the supported locales and markets.
- Review and expand each market's income-model catalog with current platform availability and policies before production recommendations rely on named platforms.
