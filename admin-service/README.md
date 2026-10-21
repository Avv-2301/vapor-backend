# Admin Service

The admin application handles admin authentication, dashboard, reports, game management, users, transactions, gift cards, discounts, banners and audit-log management. It validates sessions and accesses MongoDB directly. See [the backend setup](../README.md) for the current structure and startup instructions.

---

## Table of Contents

- [Features](#features)  
- [Tech Stack](#tech-stack)  
- [API Endpoints](#api-endpoints)  
- [Getting Started](#getting-started)  
- [Configuration](#configuration)  
- [Usage](#usage)

---

## Features

- **Admin Authentication:** Secure admin login and logout functionality using JWT.  
- **Login History:** Track and retrieve admin login history with IP addresses.  
- **Password Management:** Update admin passwords securely with validation and strength checking.  
- **Role-Based Access Control:** Admin role verification and access control.  
- **Token-Based Authentication:** JWT for session management.  

---

## Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** MongoDB, Mongoose ODM  
- **Authentication:** JSON Web Tokens (JWT)  
- **Validation:** Joi  
- **Password Security:** bcrypt, zxcvbn

---

## API Endpoints

| Endpoint                   | Method | Description                            | Request Body / Params                     |
|----------------------------|--------|----------------------------------------|------------------------------------------|
| `/admin/login`             | POST   | Authenticate an admin and return a token | `{ "email": "", "password": "" }`        |
| `/admin/logout`            | POST   | Logout admin and invalidate token       | `{ "userId": "" }`                        |
| `/admin/login-history/:userId` | GET    | Get admin login history by user ID      | Authorization: Bearer `<token>`          |
| `/admin/change-password/:userId` | PUT    | Update admin password                    | `{ "newPassword": "", "confirmPassword": "" }` |

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB
- Access to @avv-2301/gamers-vault-common package

### Installation

```bash
# Install dependencies
npm install

# Create .env file
PORT=4005
MONGO_URL=your_mongodb_connection_string
JWT_USER_SECRETKEY=your_jwt_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
ADMIN_NAME=Admin User
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The service will run on `http://localhost:4005` (or the port specified in .env)

### Seeding Admin User

```bash
# Run the admin seeder to create the initial admin user
node src/seeders/adminSeeder.js
```

---

## Configuration

### Environment Variables

- `PORT`: Service port (default: 4005)
- `MONGO_URL`: MongoDB connection string
- `JWT_USER_SECRETKEY`: JWT secret key for token generation
- `ADMIN_EMAIL`: Initial admin email (for seeder)
- `ADMIN_PASSWORD`: Initial admin password (for seeder)
- `ADMIN_NAME`: Initial admin name (for seeder)

---

## Notes

- Admin service uses the same User model as user-service (shared database)
- Admin login requires role to be "admin" and user to be verified and active
- Password updates require password strength validation (minimum score of 2)
- Login history tracks system IP and browser IP addresses
- Tokens expire after 1 hour (3600 seconds)

