# User application

Owns user authentication, account profiles, libraries, storefront products, reviews and the public homepage banner feed. Runs on port 4001, with routes mounted under /auth, /users, /profiles, /library, /products, /reviews and /banners. The public GET /banners route returns active homepage hero banners. Protected routes validate the JWT and active database session locally. See ../README.md for setup.

## Stripe Checkout (test mode)

Set `STRIPE_SECRET_KEY` to a Stripe test secret (`sk_test_...`) in this service's environment and set `FRONTEND_URL` to the storefront origin (for local development, `http://localhost:5173`). Never put the secret key in the frontend. The authenticated `POST /wallet/stripe/checkout` endpoint accepts `{ "purpose": "purchase" }` or `{ "purpose": "top-up", "amount": 25 }` and returns a Checkout URL. The storefront redirects the customer to that URL. On return, `POST /wallet/stripe/confirm` verifies the paid Checkout Session with Stripe before crediting the wallet or delivering games.

Stripe prices and the purchase cart are calculated by the user service. The payment flow uses INR and supports wallet top-ups from ₹100 to ₹500 to stay above Stripe's minimum payment amount. Configure the Stripe account for INR payments and test cards in Stripe test mode.
