# Gateway

Runs on port 3000. Proxies /admin to admin-service and user API paths to user-service, preserving existing frontend URLs. Authentication and auditing run in the destination application. Configure USER_SERVICE_URL, ADMIN_SERVICE_URL and FRONTEND_ORIGINS as needed. See ../README.md for setup.
