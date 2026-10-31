# Paven Traders – System Architecture (Phase 1)

## 1. Executive Summary

**Paven Traders** is a production-oriented single-store online grocery delivery platform designed to serve an entire city through a centralized flagship fulfillment hub.

This architectural blueprint establishes the Phase 1 Foundation across four key sub-systems:
- **Backend Core**: Express.js REST API with TypeScript, Mongoose, and Zod.
- **Database Core**: Unified MongoDB Atlas cluster housing multi-entity relational schemas.
- **Customer Web Client**: Responsive React + Vite + Tailwind CSS storefront.
- **Admin Management Console**: Dedicated React + Vite operational command dashboard.
- **Customer Mobile Client**: Android React Native application powered by Expo and SecureStore.

---

## 2. Monorepo Structure

```text
paven-traders/
├── apps/
│   ├── customer-web/          # React 18, Vite, Tailwind, Router, Axios
│   ├── admin-web/             # React 18, Vite, Admin Dashboard, RBAC UI
│   └── mobile/                # React Native, Expo SDK 51, SecureStore
├── server/
│   ├── src/
│   │   ├── config/            # Environment validation (Zod) & MongoDB connection
│   │   ├── controllers/       # Health and Authentication controllers
│   │   ├── middleware/        # JWT auth, RBAC authorize, error handling, rate limiting
│   │   ├── models/            # 10 Mongoose schemas & indexes
│   │   ├── routes/            # Versioned API routes (/api/v1)
│   │   ├── services/          # AuthService & UserService business logic
│   │   ├── utils/             # AppError, ApiResponse, Logger
│   │   ├── validators/        # Zod request validation schemas
│   │   ├── scripts/           # Secure Admin provisioning script
│   │   ├── app.ts             # Express application assembly
│   │   └── server.ts          # Server entrypoint and lifecycle
│   └── tests/                 # Vitest + Supertest in-memory test suite
├── packages/
│   └── shared/                # Shared TypeScript contracts, enums & interfaces
├── docs/
│   ├── ARCHITECTURE.md        # System architecture document
│   └── API_DOCUMENTATION.md   # API specification and contract guide
├── .env.example               # Root environment variables template
├── .gitignore                 # Monorepo version control ignore rules
├── package.json               # Monorepo npm workspaces orchestration
└── README.md                  # Project overview & quick start guide
```

---

## 3. Technology Stack & Rationale

| Layer | Selected Tech | Rationale |
| :--- | :--- | :--- |
| **Monorepo** | NPM Workspaces | Zero configuration overhead, native workspace resolution, shared type references. |
| **Backend** | Node.js + Express + TypeScript | Lightweight, high throughput, mature ecosystem, strict type-safety across models and routes. |
| **Database** | MongoDB Atlas + Mongoose | Document flexibility for nested order items and address coordinates; strong indexing and validation. |
| **Data Validation** | Zod | Runtime type inference, strict schema enforcement, compile-time and runtime alignment. |
| **Security** | Helmet, bcryptjs, JWT, Rate Limiting | Defense-in-depth, bcrypt rounds >= 12, rotating refresh tokens with SHA-256 database hashing. |
| **Customer Web** | React 18 + Vite + Tailwind CSS | Instant Hot Module Replacement (HMR), atomic CSS footprint, modern component architecture. |
| **Admin Console** | React 18 + Vite + Tailwind CSS | Dark-mode operational console, role-gated views, low cognitive load data density. |
| **Android Mobile** | React Native + Expo | Cross-platform runtime, Expo SecureStore for encrypted token persistence, native navigation stack. |

---

## 4. Single-Store Commerce Model

Unlike decentralized dark store aggregators with fragmented inventory, Paven Traders operates a **single-store city-wide fulfillment model**:

```
                         ┌────────────────────────────────────────────────────────┐
                         │               PAVEN TRADERS CLIENTS                    │
                         │                                                        │
                         │  [ Customer Web ]   [ Admin Web ]   [ Android App ]    │
                         └──────────────┬─────────────┬──────────────┬────────────┘
                                        │             │              │
                                        ▼             ▼              ▼
                         ┌────────────────────────────────────────────────────────┐
                         │       Express REST Gateway (/api/v1)                   │
                         │   • Helmet Security Headers  • Rate Limiting (Zod)     │
                         │   • JWT Auth Middleware      • Role-Based Access       │
                         └────────────────────────────┬───────────────────────────┘
                                                      │
                                                      ▼
                         ┌────────────────────────────────────────────────────────┐
                         │             PAVEN TRADERS BACKEND SERVICES             │
                         │   • AuthService (Bcrypt, JWT Rotation, Revocation)     │
                         │   • UserService & Admin Provisioning                   │
                         │   • Health Monitor (Real-time Mongoose state)          │
                         └────────────────────────────┬───────────────────────────┘
                                                      │
                                                      ▼
                         ┌────────────────────────────────────────────────────────┐
                         │                  MONGODB DATABASE                      │
                         │   • User, Address, Category, Product, Cart             │
                         │   • Order, Payment, Inventory, Coupon, DeliveryPartner │
                         └────────────────────────────────────────────────────────┘
```

---

## 5. Security & Authentication Architecture

1. **Password Security**:
   - Passwords are never stored in plaintext.
   - Salted and hashed using `bcryptjs` with salt factor 12.
   - Password hashes are explicitly excluded from default Mongoose queries (`select: false`).

2. **JWT Lifecycle & Token Rotation**:
   - **Access Token**: Short-lived (15 minutes). Sent in `Authorization: Bearer <token>` header.
   - **Refresh Token**: Long-lived (7 days). Stored in the database as a SHA-256 hash.
   - **Rotation**: Every time `/auth/refresh` is called, the old refresh token is removed and a new rotated token is issued.
   - **Reuse Detection**: If an invalid or previously used refresh token is presented, all user sessions are automatically revoked (`tokenVersion++`).

3. **Role-Based Access Control (RBAC)**:
   - Roles: `CUSTOMER`, `ADMIN`, `STAFF`, `DELIVERY_PARTNER`.
   - Public registration strictly enforces `CUSTOMER` role. Role parameters sent by the frontend are ignored.
   - Administrative users must be provisioned via the secure CLI script `npm run seed:admin`.
   - Admin routes enforce `authorize(UserRole.ADMIN, UserRole.STAFF)` at the gateway layer.
