# Gamer's Vault backend

The backend contains two applications behind one gateway:

- **admin-service** (4005): admin authentication, dashboard, reports, game management, users, transactions, gift cards, discounts, banners and audit-log management.
- **user-service** (4001): user authentication, account profiles, libraries, storefront products and reviews.
- **gateway** (3000): proxies browser requests to the matching application. Authentication is checked inside each application.
- **common**: local package with constants, response helpers and audit middleware.

The admin and user frontends remain in their existing folders. Existing browser API paths remain available: /admin/* targets the admin app; /auth/*, /users/*, /profiles/*, /library/*, /products/*, /reviews/* and /banners target the user app. Product writes belong to /admin/games. The user catalog is read-only. The public GET /banners endpoint returns active, in-date homepage hero banners for the user frontend slider.

Both applications use the same MONGO_URL database, preserving the existing users, products, profiles, libraries, reviews and audit logs. Signup creates the account, library and profile directly through local models. There are no application-to-application HTTP calls or trusted-header authentication bypasses.

## Local setup

1. Run npm install and npm run build in common.
2. Run npm install in user-service, admin-service and gateway. Each resolves common from file:../common.
3. Set MONGO_URL and JWT_USER_SECRETKEY in each application .env. Existing configuration was preserved. Set USER_SERVICE_URL and ADMIN_SERVICE_URL in gateway only if changing their default localhost ports.
4. Run npm run dev in user-service, admin-service and gateway in separate terminals.
5. Run the existing frontend dev commands. Both frontends continue to use the gateway on port 3000. FRONTEND_ORIGINS in gateway accepts a comma-separated list (default localhost:5173 and localhost:5174).

For containers, run docker compose -f docker-compose.dev.yml up --build. Application .env files must use a MongoDB address reachable from the containers.

## Deploying the backend to Render

The root `render.yaml` deploys the gateway, user service, and admin service as separate Docker web services. Each service has its own Dockerfile in its directory. In Render, create a Blueprint from this backend repository and choose the free plan. Render prompts for the secret environment values rather than storing them in this file. Set the same Atlas `MONGO_URL` on both application services; set `STRIPE_SECRET_KEY` and the deployed Vapor storefront URL in the user service; set `FRONTEND_ORIGINS` in the gateway to the comma-separated deployed Vapor and Admin frontend origins. Add the Cloudinary values if admin game/image uploads are used. The shared JWT secret is generated once and shared by both application services.

Deploy `Vapor/vapor-user` and `Admin-GamerVault/admin` separately as Render Static Sites from their respective repositories. Use `npm ci && npm run build` with `dist` as the publish directory. Set `VITE_API_BASE_URL` (Vapor) or `VITE_APP_API_URL` (Admin) to the gateway's public `https://...onrender.com` URL, then add a rewrite from `/*` to `/index.html` on each site for client-side routes. Because these frontends are outside the backend repository, they are intentionally not included in this Blueprint.

The backend services use public Render URLs to reach one another so the Blueprint works on Render's free web-service plan. Free services can sleep when idle; expect a cold-start delay on the next request.

