# Expense Tracker UI (LW / CW)

Frontend for the LeadWalnut and CodeWalnut credit card expense tracker. Upload the monthly card statement, review auto-tagged transactions, assign LW / CW, attach invoices, record TDS, lock the month and see spend on the dashboard.

**Stack:** React 18, Vite, React Router, Recharts

## Screens

- **Sign in**
- **Dashboard:** spend by company, category, month, top vendors, subscriptions, missing invoices, TDS pending
- **Statements:** upload a statement PDF, then review it: category, LW / CW / Split, invoice attach, inline TDS, bulk assign, apply card default, lock month
- **All expenses:** search and filter across months, CSV export
- **Settings:** cards (default company per card), vendor rules, categories, TDS sections, companies

## Run locally

Needs Node 20+ and the backend running on port 8000.

```bash
npm install
npm run dev
```

Open http://localhost:5173. In development, `/api` calls are forwarded to `http://localhost:8000` (see `vite.config.js`).

## Environment variables

| Key | Where | Meaning |
|---|---|---|
| `VITE_API_URL` | local `.env` (optional) | Backend for the dev proxy, default `http://localhost:8000` |
| `VITE_API_BASE_URL` | Vercel settings | Backend URL in production, e.g. `https://expense-api.leadwalnut.com` (no trailing slash) |

## Deployment (current)

Hosted on Vercel at `https://creditcard-expense-tracker.vercel.app`. Every push to `main` deploys automatically; build settings are in `vercel.json`.

The Vercel URL must be listed in the backend's `CORS_ORIGINS`.

## Project layout

```
src/
  main.jsx         routes
  auth.jsx         sign-in state, user role, master data
  api.js           API calls, downloads, ₹ formatting
  components/      Layout, UploadModal, TxnTable, TxnDrawer
  pages/           Login, Dashboard, Statements, StatementReview, Expenses, Settings
  styles.css
```
