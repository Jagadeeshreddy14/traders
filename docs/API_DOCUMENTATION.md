# Paven Traders – REST API Specification (v1)

Base URL: `http://localhost:5000/api/v1`

All responses follow a standard envelope:

```json
{
  "success": true,
  "message": "Human readable status message",
  "data": {},
  "timestamp": "2026-10-31T06:00:00.000Z"
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": {
    "code": "ERROR_CODE",
    "details": []
  },
  "timestamp": "2026-10-31T06:00:00.000Z"
}
```

---

## 1. System Health

### `GET /health`
Inspects real-time server readiness and live MongoDB connection state.

- **Access**: Public
- **Response**: `200 OK` (when DB connected) or `503 Service Unavailable` (when DB disconnected)

#### Response Example (Connected)
```json
{
  "success": true,
  "message": "Paven Traders API is operational and database is connected",
  "data": {
    "server": "healthy",
    "database": "connected",
    "apiVersion": "v1",
    "timestamp": "2026-10-31T06:22:15.123Z",
    "uptimeSeconds": 142
  },
  "timestamp": "2026-10-31T06:22:15.123Z"
}
```

---

## 2. Authentication & Authorization

### `POST /auth/register`
Registers a new customer. Strict role enforcement defaults to `CUSTOMER`.

- **Access**: Public (Rate limited)
- **Request Body**:
  ```json
  {
    "name": "Ravi Kumar",
    "email": "ravi@example.com",
    "password": "Password@123",
    "phone": "+919876543210"
  }
  ```
- **Validation Rules**:
  - `name`: 2 to 100 characters.
  - `email`: Valid RFC email format.
  - `password`: Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character.
  - `phone`: Optional, 10 to 15 digits format.
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "message": "Account registered successfully",
    "data": {
      "user": {
        "id": "6648...",
        "name": "Ravi Kumar",
        "email": "ravi@example.com",
        "phone": "+919876543210",
        "role": "CUSTOMER",
        "isActive": true,
        "isVerified": false,
        "createdAt": "2026-10-31T...",
        "updatedAt": "2026-10-31T..."
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi...",
        "expiresIn": "15m"
      }
    }
  }
  ```

---

### `POST /auth/login`
Authenticates a user via email and password credentials.

- **Access**: Public (Rate limited)
- **Request Body**:
  ```json
  {
    "email": "ravi@example.com",
    "password": "Password@123"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": {
      "user": {
        "id": "6648...",
        "name": "Ravi Kumar",
        "email": "ravi@example.com",
        "role": "CUSTOMER"
      },
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi...",
        "expiresIn": "15m"
      }
    }
  }
  ```

---

### `POST /auth/refresh`
Rotates refresh tokens and generates a new access token.

- **Access**: Public
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Tokens refreshed successfully",
    "data": {
      "tokens": {
        "accessToken": "eyJhbGciOi...new",
        "refreshToken": "eyJhbGciOi...rotated",
        "expiresIn": "15m"
      }
    }
  }
  ```

---

### `POST /auth/logout`
Revokes an active refresh token and terminates the session.

- **Access**: Authenticated (`Bearer <accessToken>`)
- **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

### `GET /auth/me`
Retrieves the safe user profile of the currently authenticated caller.

- **Access**: Authenticated (`Bearer <accessToken>`)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "User profile retrieved successfully",
    "data": {
      "user": {
        "id": "6648...",
        "name": "Ravi Kumar",
        "email": "ravi@example.com",
        "role": "CUSTOMER",
        "isActive": true
      }
    }
  }
  ```

---

### `GET /auth/admin-check`
Internal role verification endpoint for administrative clients.

- **Access**: Authenticated with role `ADMIN` or `STAFF`.
- **Response**: `200 OK` or `403 Forbidden` if invoked by `CUSTOMER`.
