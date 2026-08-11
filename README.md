# The USA — Uganda Scouts Association App

A membership registration, subscription, and fee-tracking web app for the
Uganda Scouts Association. Built as an installable PWA (works offline for
browsing, syncs when back online) with React + Tailwind on the frontend and
Supabase (Postgres + Auth) as the backend.

Payment collection uses **Option B — Manual Verification**: members report
their payment (amount, reference number, date), and an admin cross-checks it
against the real Stanbic Bank / Mobile Money statement before marking it
"Verified." Once verified, both the admin and the member can download a
printable PDF receipt.

---

## 1. What's included

- Member self-service portal: passwordless login (name + email + one-time
  code), auto-generated member ID (e.g. `JIN-2026-002`), edit own info,
  report payments, download receipts, submit district reference data
  (schools, commissioners, trainers, leaders, donors, etc.)
- Admin portal: overview stats, full members table (search/filter/export
  CSV), payment verification queue, and a management view for every
  reference data module — each downloadable as CSV.
- Row-level security in the database so members can only ever see and edit
  their own records, and only admins can see everything — enforced at the
  database level, not just hidden in the UI.

## 2. One-time setup (you only do this once)

### a) Create a free Supabase project
1. Go to https://supabase.com and create a free account + new project.
2. Wait for it to finish provisioning (~2 minutes).

### b) Load the database schema
1. In your Supabase project, open the **SQL Editor**.
2. Open `supabase/schema.sql` from this project, copy all of it, paste it
   into the SQL Editor, and click **Run**.
3. This creates every table, security rule, and the auto member-ID logic.

### c) Connect the app to your Supabase project
1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon public key**.
3. In this project, copy `.env.example` to a new file named `.env`.
4. Paste your values in:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

### d) Turn on passwordless (OTP) email login for members
1. In Supabase, go to **Authentication → Providers → Email**.
2. Make sure **Email OTP** / "Confirm email" style one-time codes are
   enabled (this is on by default on new projects).
3. Optional but recommended: go to **Authentication → Email Templates**
   and adjust the "Magic Link" / OTP email wording to mention the
   Association's name.

### e) Create your first Admin account
Admins sign in with email + password (not the member OTP flow), so:
1. In Supabase, go to **Authentication → Users → Add user**, and create a
   user with the admin's email and a password.
2. Go to the **SQL Editor** and run:
   ```sql
   update profiles set role = 'admin' where email = 'admin@example.com';
   ```
   (replace with the real admin email). If the profile row doesn't exist
   yet, have the admin log in once via `/admin/login` first — signing in
   auto-creates their profile row — then run the SQL above.

## 3. Running it locally

```bash
npm install
npm run dev
```

Then open the printed local URL (usually `http://localhost:5173`).

## 4. Deploying it for real use

This is a static site once built, so it deploys easily to **Netlify** or
**Vercel**:

```bash
npm run build
```

This produces a `dist/` folder — drag it into Netlify's deploy UI, or
connect your GitHub repo to Netlify/Vercel and set the same two
environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
their dashboard's Environment Variables settings.

## 5. Using it day-to-day

**As a member:** go to the site → "I'm a Member" → enter name + email →
enter the code emailed to you → complete your registration (this creates
your Member ID) → report payments as you make them → download your receipt
once an admin marks it verified.

**As an admin:** go to the site → "Admin Login" → sign in with your email +
password → see live totals on the Overview page → verify payments as they
come in → download CSVs of any module for record-keeping or printing.

## 6. Notes on the payment flow (Option B)

- A member reports a payment themselves (amount, method, reference number,
  date) after actually depositing money via bank or Mobile Money.
- The payment shows as **Pending** until an admin checks it against the
  real bank/MoMo statement and clicks **Verify** (or **Reject** if it
  doesn't match).
- Once verified, a receipt becomes available to download/print — this is
  the member's proof of payment.
- This flow needs no external payment company approval and works
  immediately. If the Association later sets up a merchant account with a
  payment gateway (e.g. Flutterwave, Pesapal) for instant automatic
  verification, that can be added later without changing this structure —
  it would simply auto-set a payment's status instead of a human doing it.

## 7. Project structure

```
src/
  lib/            Supabase client, PDF receipt generator, CSV export, formatting
  context/        Auth state (session, profile, role)
  components/     Shared UI: buttons, cards, layout, route guards
  data/           Uganda districts list, reference-module field configs
  pages/
    auth/         Member OTP login, Admin email/password login
    member/       Dashboard, registration, profile, payments, district info submission
    admin/        Overview, members table, payment verification, per-module tables
supabase/
  schema.sql      Full database schema — run once in the Supabase SQL Editor
```

## 8. Customizing

- **Districts list**: `src/data/districts.js` — edit or extend if a
  district is missing or renamed.
- **Reference module fields**: `src/data/modules.js` — add/remove fields
  for Schools, Commissioners, Trainers, Scout Leaders, Rover Scouts,
  Donors, District Leadership, or District Subscriptions without touching
  any page code.
- **Colors/branding**: `src/index.css`, inside the `@theme` block.
- **Logo**: replace `public/favicon.svg` with the official Uganda Scouts
  Association logo, and update references in `index.html` / manifest icons.
