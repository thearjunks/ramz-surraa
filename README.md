# SURRAA Community Association — Entry Pass & Membership Platform

Next.js (React) website + admin system: events, entry pass requests (members & guests), admin confirmation,
official passes with QR codes, QR check-in, internal payments, reports (Excel / CSV / PDF).

## Start it
1. Install **Node.js 22 or newer** (LTS) from https://nodejs.org — once.
2. Double-click **`start the website.cmd`** (first run installs packages, 1–2 min).
3. Website: **http://localhost:43678** · Admin: **http://localhost:43678/admin/**
   First visit to /admin asks you to create the administrator account.

Only one site can use port 43678 — close any other "start the website" window first.

## Important files — back them up
- `data/surraa.db` — the database (bookings, members, passes, payments)
- `data/secret.key` — encryption key for Civil ID numbers. **Without it, stored Civil IDs cannot be read.**

## Email (optional)
Create a file `.env.local` in this folder:
```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=you@surraa.com
SMTP_PASS=your-password
MAIL_FROM=SURRAA <you@surraa.com>
SITE_URL=https://www.surraa.com
```
Without it, emails (incl. password reset links) are shown in the admin under Settings → Notification log.

## WhatsApp
Admin → Settings: admin number (default 96566247474) and optional WhatsApp Business Cloud API token.
Without a token, each new request appears in the log with a one-click "Send manually" link.

## Edit content
`data/site.js` — contact details, artists, gallery. Events are managed in Admin → Events.

## Going live
Needs Node.js hosting (VPS, Railway, Render, or cPanel "Setup Node.js App"): `npm install`, `npm run build`, `npm start`.
Use HTTPS. Copy the `data` folder with the site.
