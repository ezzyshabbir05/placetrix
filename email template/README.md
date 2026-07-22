# PlaceTrix Email Templates

This folder contains all branded **Supabase Auth email templates** for the PlaceTrix platform.
Each template is a self-contained HTML file with inline-compatible CSS, ready to be pasted directly into the Supabase Dashboard.

---

## Files

| File | Supabase Template | Trigger |
|---|---|---|
| `confirm-signup.html` | **Confirm signup** | User registers an account |
| `invite-user.html` | **Invite user** | Admin provisions a new account |
| `magic-link.html` | **Magic Link** | User requests passwordless sign-in |
| `change-email.html` | **Change Email Address** | User requests an email change |
| `reset-password.html` | **Reset Password** | User requests a password reset |
| `template.html` | Base reference | Structural master (not used directly) |

---

## Template Variables

Supabase uses Go-style template variables. The following are used across the templates:

| Variable | Description |
|---|---|
| `{{ .SiteURL }}` | Your app's base URL (set in Supabase Auth Settings → Site URL) |
| `{{ .TokenHash }}` | Opaque token hash — used in server-side `/auth/confirm` links |
| `{{ .Token }}` | Human-readable 6-digit OTP code — displayed in email for copy-paste entry |
| `{{ .Email }}` | The user's current email address |
| `{{ .NewEmail }}` | The new email address (change-email only) |
| `{{ .Data.institute_name }}` | Institute name (invite-user — set via user metadata) |
| `{{ .Data.role_label }}` | Role label e.g. "Student / Candidate" (invite-user — set via user metadata) |

> **Important:** Do NOT use `{{ .ConfirmationURL }}` directly. It redirects through Supabase's servers
> and returns an `#access_token` hash fragment which Next.js server components cannot read.
> Always use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=<type>` instead.

---

## How to Apply in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select the template type (e.g. "Confirm signup")
3. Open the corresponding `.html` file from this folder
4. Copy the full HTML content
5. Paste it into the **Message** field
6. Update the **Subject** line (suggestions below)
7. Click **Save**

### Suggested Subject Lines

| Template | Subject |
|---|---|
| confirm-signup | `Confirm your PlaceTrix email address` |
| invite-user | `You've been invited to PlaceTrix by {{ .Data.institute_name }}` |
| magic-link | `Your PlaceTrix sign-in link` |
| change-email | `Confirm your new PlaceTrix email address` |
| reset-password | `Reset your PlaceTrix password` |

---

## Design System

All templates follow the PlaceTrix brand:

- **Font**: Outfit (Google Fonts) with system fallbacks
- **Primary color**: `#0a0a0a` (near-black)
- **Background**: `#f5f5f5` (light grey)
- **Card**: White `#ffffff` with subtle border & shadow
- **Border radius**: `20px` for cards, `50px` for pills/buttons, `12px` for blocks
- **Logo**: Inline SVG (for universal email client support)

---

## Notes

- All CSS is kept in `<style>` blocks and uses class-based selectors for maximum email client compatibility.
- Inline SVG is used for the logo instead of `<img>` tags to avoid external request failures in restricted email clients.
- Google Fonts are loaded via `<link>` — they may not render in all email clients; Helvetica Neue / Arial are safe fallbacks.
- The templates use `role="presentation"` on tables for accessibility.
