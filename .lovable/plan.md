# Admin login and auto-redirect

Set up a dedicated admin account and send it straight to the admin dashboard on sign-in.

## What you get

- A confirmed account for **elrema461@gmail.com** using the password you provided, ready to sign in immediately (no confirmation email needed).
- That account marked as an administrator, which unlocks the admin area: reviewing and approving deposits and withdrawals, and seeing all member accounts.
- After signing in (email/password or Google), administrators land on the admin dashboard automatically instead of the normal estate dashboard. Everyone else keeps going to their own dashboard.
- The admin area is protected: if a non-admin opens that page directly, they are sent back to their own dashboard.

## Security note

The password you sent in chat is now in the message history. After the first sign-in, please change it from the profile page (or via "forgot password"), so the one in chat no longer works.

## Technical details

1. Create the auth user for `elrema461@gmail.com` with the given password, email pre-confirmed (admin API).
2. Insert a row into `user_roles` with role `admin` for that user, and create its `profiles` row so the app has a profile to read.
3. Add a small public server function (`getMyRole`) using `requireSupabaseAuth` that reports whether the signed-in user is an admin.
4. In `src/routes/auth.tsx`, after a successful password sign-in and after Google sign-in, check the role and navigate to `/admin` for admins, `/dashboard` otherwise.
5. In `src/routes/_authenticated/admin.tsx`, verify the admin role on load and redirect non-admins to `/dashboard`.
6. Verify by signing in as the new account at 360px width and confirming it lands on the admin dashboard, and that a normal account still lands on its own dashboard.
