# Import Mifugo Farm and get it deployment-ready

Your repository is now public and I can read it. It is a Mifugo Farm app (animal packages, wallet with M-Pesa style deposits, referrals with level 1/2 commissions, admin review, profile setup) built on the same stack this project uses, so everything can be imported as-is rather than rewritten.

## What gets imported

- All pages: home, sign in / sign up / password reset, dashboard, farm, shop, wallet, referrals, profile, admin.
- Shared pieces: farm shell and navigation, package cards, estate banner, profile setup, page states, the full UI kit, images and styling.
- The backend: all 8 database change files from the repo, applied to a fresh Lovable Cloud backend for this project.

## Backend and sign-in

1. Turn on Lovable Cloud so the app has its own database, accounts and server logic.
2. Apply the repository's database structure: profiles, packages, purchases, wallet and deposits, referral commissions, admin roles and their access rules.
3. Turn on email + password sign-in and Google sign-in, plus the password reset page the app already ships.
4. Verify each flow end to end: create an account, confirm, sign in, sign out, reset password, Google sign-in, and that a new account lands on the dashboard with profile setup.

Google sign-in works on the preview link straight away. Once you publish and add a custom domain, I re-check it there too.

## Mobile layout pass

Reviewed at phone width, with the referral tab called out:

- Referral link: show a shortened form (for example `mifugo…/auth?ref=AB12CD`) with a copy button and a share button, so it never overflows the card. The full link is still what gets copied and shared.
- Referral page: stack the invite card and commission stats cleanly, keep the two commission figures readable without clipping, and make the activity rows fit narrow screens.
- Sweep the other tabs (dashboard, wallet, shop, farm, profile, admin) for text overflow, cramped buttons, and bottom-navigation spacing at 360px wide.

## Your existing data

You mentioned you have an export. The app and database go live first with no records; send the export (CSV or JSON per table, or the data export from the old project) and I import users' profiles, packages, purchases, wallet balances and referral history, preserving IDs and relationships.

Note: sign-in passwords cannot be carried over from an export. Returning users sign in with Google or use "Forgot password" once to set a new password.

## Keeping credits low

One import pass, one backend setup pass, one mobile fix pass, then a single verification run — instead of iterating page by page.

## Technical notes

- Stack matches exactly (TanStack Start + Tailwind + shadcn), so files copy over without conversion; `routeTree.gen.ts`, `bun.lock` and `.env` are excluded and regenerated locally.
- Migrations are applied in timestamp order; the repo's grants and row-level security policies come along unchanged.
- Referral link shortening is display-only in `src/routes/_authenticated/referrals.tsx`; the copied value stays the full URL.
