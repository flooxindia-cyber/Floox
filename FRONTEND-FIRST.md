# Floox — Frontend-First Build

This build makes the existing Floox UI fully navigable and testable without backend connectors.

## Frontend capabilities
- Responsive landing, discovery, platform, contact, login and registration pages
- Artist and organiser multi-step registration flows
- Frontend OTP verification modal (demo OTP: `123456`)
- Fan/artist/organiser sessions in localStorage
- Search/filter artist directory with seeded demo artists
- Artist profile viewing
- Likes/favourites
- Messages and contact reveal demo flows
- Artist and organiser dashboard profile editing
- Password change/reset UI
- Media upload UI (simulated in frontend mode)
- Toasts, modals, empty/error states and navigation

## Backend connector switch
`floox-demo.js` is a frontend-only connector. It intercepts `/api/*` calls and returns realistic local data. This lets the UI be completed before backend integration.

When the real backend is ready, set:

```html
<script>window.FLOOX_BACKEND_ENABLED = true;</script>
<script src="floox-demo.js"></script>
<script src="floox-auth.js"></script>
```

Then the same UI calls the real `/api/*` endpoints.

## Demo credentials
- Demo artists/organisers: password `demo12345`
- Demo OTP: `123456`

## Remaining backend connectors
1. Real OTP/email delivery
2. Real authentication/session validation
3. Supabase profile persistence through `/api`
4. Real Supabase Storage uploads
5. Real messages/likes/contact reveal persistence
6. Production environment variables
7. Production domain connection

Do not expose Supabase service-role keys in browser code.
