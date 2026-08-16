Last reviewed: 2026-08-16

## Current production state
- Vercel production deployment is READY.
- `www.floox.in` and `floox.in` are connected to the Vercel project.
- Registration creates the account, sends registration OTP, and successful verification sets `verified=true`.
- Verified users are now exposed through `/api/users` and appear in the Discover → Everything directory, including newly verified users, newest first.
- Messaging routes and inbox are wired into the authenticated application.

## Remaining external production dependencies
- Resend sending-domain configuration/API credentials must be valid for registration and password-reset email delivery.
- Cloudinary credentials must be valid for production media uploads.
- These are infrastructure credentials/configuration, not application-code blockers.

## Verification note
The latest production build completed successfully. Runtime error monitoring currently shows only a Node.js `url.parse()` deprecation warning, not an application exception.
