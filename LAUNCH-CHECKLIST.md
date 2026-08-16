# Floox launch checklist

## Code
- Vercel `/api/*` gateway is the production API path.
- Registration creates the account and issues a registration OTP.
- OTP verification creates the session and routes by role.
- Password reset uses the shared API helper.
- Supabase profile fields are aligned with artist/organiser forms.

## Required production environment
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- JWT_SECRET
- RESEND_API_KEY
- RESEND_FROM
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

## Final external step
Verify the Resend sending domain, then connect the GoDaddy domain to Vercel.
