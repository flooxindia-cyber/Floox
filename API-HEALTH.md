# Floox production API health

Production API gateway: `/api/index`

Health endpoint: `/api/health`

The health response reports whether Supabase, JWT, Resend, and Cloudinary environment variables are configured. Resend and Cloudinary are intentionally allowed to remain false until their production credentials are connected.
