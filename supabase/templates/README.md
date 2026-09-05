# Gonezy auth email templates

These HTML files are **project config**, not database migrations. Pasting them into the Supabase dashboard is the only supported way to brand client-facing Auth emails. There is no API in this repo that applies them automatically.

**Live project:** `evtgtzgrnvzjnrkmnwcx`

## Paste into the dashboard

1. Open [Authentication → Email Templates](https://supabase.com/dashboard/project/evtgtzgrnvzjnrkmnwcx/auth/templates).
2. For each template below, paste the matching HTML into the body field and use the suggested subject.
3. Confirm **Site URL** is `https://gonezy.vercel.app` and that `https://gonezy.vercel.app/reset-password` is on the Redirect URLs allow list. Password reset links use `redirectTo: {origin}/reset-password`.

| Dashboard template | File | Suggested subject |
| --- | --- | --- |
| Reset password | `recovery.html` | Reset your Gonezy password |
| Confirm sign up | `confirm.html` | Confirm your Gonezy account |
| Invite user | `invite.html` | You're invited to Gonezy |
| Magic link | `magic-link.html` | Your Gonezy sign-in link |

Do not change the `{{ .ConfirmationURL }}` (or other) variables. Supabase Auth fills those in.

## Voice

Fast, clever, simple, useful, local, energetic, trustworthy. Brand promise: **Make it gone. Easy.** Orange `#F97316` on dark, matching the app.

New-listing buyer mail is not an Auth template. It is sent by the `notify-new-drop` Edge Function via the Resend API. See `supabase/functions/notify-new-drop/README.md`.
