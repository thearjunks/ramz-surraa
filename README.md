# SURRAA Community Association — Entry Pass & Membership Platform

Next.js (React) website + admin system: events, entry pass requests (members & guests), admin confirmation,
official passes with QR codes, QR check-in, internal payments, reports (Excel / CSV / PDF).

## Start it
1. Install **Node.js 22 or newer** (LTS) from https://nodejs.org — once.
2. Double-click **`start the website.cmd`** (first run installs packages, 1–2 min).
3. Website: **http://localhost:43678** · CMS: **http://localhost:43678/cms/** · Admin: **http://localhost:43678/admin/**.
   On a new database, set `SURRAA_BOOTSTRAP_PASSWORD` (at least 12 characters) before the first start to create the owner account. Existing databases keep their current owner account.

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
Use **CMS → Content** to manage custom pages, page sections, navigation, media, and the company, membership, artist, gallery and banner content. Use **Admin → Events** for events. Drafts stay off the public site until published. The CMS currently does not control every label and layout on the existing site.

## Going live
Needs Node.js 22.13+ hosting: `npm install`, `npm run build`, `npm start`. Use HTTPS.

Set `SURRAA_DATA_DIR` to an **absolute, persistent directory outside any deployment build folder**. The SQLite database, Civil ID encryption key and uploaded media live there. Back up the entire directory together. Never put it in Git or inside Hostinger's `hbuilds/` or `public_html` deployment folders, because Hostinger replaces those on redeploy. Migrating an existing installation requires copying its `data/surraa.db`, `data/secret.key`, and uploaded files to the persistent directory before switching the variable.

`/cms/` is the separate CMS entry URL on the same application: after deployment, `https://www.surraa.com/cms/`. It uses the same database as the public website. Do not deploy an independent copy of this SQLite app for CMS; the two copies would have different data.
