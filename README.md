# Hermes Hub

Ibadan marketplace prototype for custom, made-to-order physical goods.

Live: https://hermeshub.rectorsan.com

## Run locally

Serve this directory with a static HTTP server, for example `python -m http.server 4173`, then open http://localhost:4173.

## Included flows

- Artisan discovery, neighbourhood/category filters, favourites and profiles.
- Retail/bulk orders and custom briefs with manual artisan selection.
- Explicit simulated quotes and buyer approval of price/specifications before production.
- Local messaging, production/delivery progress and disputes that block progression.
- Local demo profiles with sign-out/resume, customer summaries, maker availability and sample business review.
- Open admin demo for sample business decisions and a transaction-state ledger.
- Reviews only for accepted, delivered, undisputed orders, linked to the order artisan.

## Prototype boundaries

This is a browser-local demonstration, not a production marketplace. Profiles share the same browser orders; role switching is intentionally open and is not authentication or authorization. No actual payments, identity checks, messages, emails, bookings or logistics requests are performed. Do not enter identity documents or other sensitive information. A backend, real authentication and authorized service integrations are required for launch.

The earlier services-booking prototype is preserved in `legacy-booking-demo/` for reference; it has demo-only OTP and local storage and should not be treated as production authentication.

## Source and hosting

Root files are the integrated standalone app. `index.html` loads `style.css`, `app.js`, and `roles.js`. Original Figma logo assets and the blue palette are retained. Sites hosting is maintained separately; changing this repository alone does not automatically deploy the public site.

## Checks

Run `node --check app.js` and `node --check roles.js`. Browser QA covers custom quotes/approval, dispute blocking, local messages, profile creation and maker/admin review.
