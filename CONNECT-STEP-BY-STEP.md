# Floox — connect and launch

## 1. Vercel
Deploy this repository to the existing `floox` project. Keep the same GitHub repository if preferred.

## 2. Vercel Production Environment Variables
Add:
- `SUPABASE_URL` — your Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service-role secret (server-only; never expose in browser)
- `JWT_SECRET` — long random secret
- `RESEND_API_KEY` — Resend sending API key
- `RESEND_FROM` — verified sender, e.g. `Floox <noreply@floox.in>`

## 3. Supabase
Run `supabase-schema.sql` and then the OTP migration SQL supplied separately if your database does not already have `email_otps`. Create a public storage bucket named `floox-media` or change the upload route to signed URLs.

## 4. Storage
The `/api/upload-media` route uses Supabase Storage and does not require Cloudinary.

## 5. OTP
Registration sends a 6-digit email OTP. Password reset uses the same OTP infrastructure with a separate purpose.

## 6. Frontend mode
Production pages set `window.FLOOX_BACKEND_ENABLED = true`, so `floox-demo.js` does not intercept API requests.

## 7. Test order
Home → register fan → OTP → login → artist registration → OTP → artist dashboard → profile → media → public listing → organiser registration → OTP → organiser dashboard → search → profile → message/contact → password reset → logout/login.

## 8. Domain last
Connect `floox.in` only after production QA passes.
