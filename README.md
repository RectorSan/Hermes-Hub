# Hermes Hub Web App (MVP)

A mobile-first single-page web app prototype for **Hermes Hub**, a trusted local services marketplace connecting customers with verified artisans.

## Implemented MVP flows

- Multi-role onboarding and login simulation (Customer / Provider / Admin)
- Email/phone OTP simulation (`123456`)
- Provider KYC submission + admin approve/reject workflow
- Customer search by category and location
- Provider profile cards with ratings, reviews, completion rate, and availability
- Booking creation with date/time + lifecycle statuses
- Secure payment simulation with transaction states (`Held` -> `Released`)
- Provider dashboard for availability, bookings, ratings, workload, and earnings
- Customer review system (1-5 stars + comment)
- Admin console for KYC and transaction monitoring

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Demo users

- Admin: `admin@hermeshub.app`
- Customer: `ada@example.com`
- Provider: `kunle@fix.com`

Any new user can sign up from the form.
