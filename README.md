# Options Tracker

Polls stock and options prices at configurable intervals and appends raw data to a Google Sheet. Built to study the effect of stock price movements on option prices.

## Live

- **App:** https://options-tracker-mocha.vercel.app
- **Repo:** https://github.com/AIRoboFred/options-tracker

---

## Architecture

```
Web UI (Next.js, Vercel)
  └── /settings         configure ticker, 9 options (3 expiries × 3), interval, session expiry
  └── /api/auth/google  OAuth2 flow to authorize Google Sheets writes
  └── /api/cron/poll    endpoint called by cron-job.org every minute

Cron (cron-job.org)
  └── calls /api/cron/poll every 1 minute
  └── secured with Bearer token (CRON_SECRET env var)
  └── app checks internally whether the poll interval has elapsed before acting

Data Provider (yahoo-finance2)
  └── fetches real-time stock quote + 9 option quotes per poll
  └── provider interface is abstracted — Schwab can be added as MVP+1

Storage (Upstash Redis)
  └── poll settings (ticker, options, interval, session expiry, active flag)
  └── Google OAuth refresh token
  └── last poll timestamp, error log, row count

Output (Google Sheets)
  └── Sheet ID: 1YqyV0LxqXopZXcZx0931IPku47t2SG1nib0LV6sbxgM
  └── appends one row per poll — nothing is ever overwritten
  └── columns: timestamp, stock price, then bid/ask/last/IV/OI/volume for each of 9 options
```

---

## Polling Behavior

- Cron-job.org calls the endpoint every **1 minute** (always — don't change this)
- The **poll interval in the app UI** controls how often data is actually fetched (1 min, 5 min, etc.)
- Polls only during **market hours: 9:30 AM – 4:00 PM ET, Mon–Fri**
- Polling stops after the **session expiry date** set in the UI (end of that day)
- If no expiry date is set, polling runs indefinitely until manually disabled on cron-job.org

---

## Data Provider

**Current: Yahoo Finance** (`yahoo-finance2` npm package)
- Stock quotes: near real-time
- Options quotes: ~15 min delayed
- No API key required, no rate limit issues at this polling frequency

**Planned: Schwab API (MVP+1)**
- Real-time stock + options data
- Free with a Schwab brokerage account
- OAuth2, access token expires every 30 min, refresh token every 7 days
- Add as a new provider in `src/lib/providers/` implementing the `DataProvider` interface

---

## Infrastructure

| Service | Purpose | Plan | Notes |
|---|---|---|---|
| Vercel | Hosts Next.js app | Hobby (free) | No Vercel Cron — use cron-job.org instead (Hobby limits crons to daily) |
| cron-job.org | Calls poll endpoint every minute | Free | Set `Authorization: Bearer <CRON_SECRET>` header |
| Upstash Redis | Stores settings + tokens | Free tier | 10k commands/day — well within limits |
| Google Sheets | Raw data output | Free | OAuth2, refresh token stored in Redis |
| Yahoo Finance | Market data | Free (unofficial) | Via `yahoo-finance2` npm package |

---

## Environment Variables

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret (rotate after sharing!) |
| `GOOGLE_REDIRECT_URI` | `https://options-tracker-mocha.vercel.app/api/auth/google/callback` |
| `GOOGLE_SHEET_ID` | ID from the Google Sheet URL |
| `CRON_SECRET` | Random secret shared between cron-job.org and the app |
| `UPSTASH_REDIS_REST_URL` | From Upstash dashboard |
| `UPSTASH_REDIS_REST_TOKEN` | From Upstash dashboard |

For local dev, copy `.env.local.example` to `.env.local` and fill in values.
Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI in Google Cloud Console alongside the production URI — keep both.

---

## Adding a New Data Provider

1. Create `src/lib/providers/<name>.ts` implementing the `DataProvider` interface from `src/lib/providers/types.ts`
2. Register it in `src/lib/providers/index.ts`
3. Add it as an option in the settings UI (`src/app/settings/page.tsx`)

The interface requires: `getStockQuote`, `getOptionQuote`, `getAvailableExpirations`, `getAvailableStrikes`.

---

## Google OAuth Notes

- The app is in **Google test mode** — only approved test users can authorize
- To add a user: Google Cloud Console → APIs & Services → OAuth consent screen → Test users
- The refresh token is stored in Upstash Redis and used to get fresh access tokens automatically
- If Google auth breaks, visit `/api/auth/google` in the app to re-authorize
