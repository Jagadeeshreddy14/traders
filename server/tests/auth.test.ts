import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/db';
import { User, UserRole } from '../src/models/User';
import { AuthService } from '../src/services/auth.service';

let mongoServer: MongoMemoryServer;

describe('Authentication & Authorization Flow', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await connectDatabase(uri);
  });

  afterAll(async () => {
    await disconnectDatabase();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  const validCustomer = {
    name: 'Ravi Kumar',
    email: 'ravi.kumar@example.com',
    password: 'Password@123',
    phone: '+919876543210',
  };

  let customerAccessToken = '';
  let customerRefreshToken = '';
  let adminAccessToken = '';

  describe('User Registration', () => {
    it('should successfully register a customer and return safe user with tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validCustomer);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(validCustomer.email.toLowerCase());
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.refreshTokens).toBeUndefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      customerAccessToken = res.body.data.tokens.accessToken;
      customerRefreshToken = res.body.data.tokens.refreshToken;
    });

    it('should reject registration when email is already registered (duplicate email)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validCustomer);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with invalid request validation (weak password)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: '123', // too short & missing upper/special
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.details).toBeDefined();
    });

    it('should ignore attempted role escalation and always create CUSTOMER role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'SuperSecret123@#',
          role: 'ADMIN', // attempted escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(UserRole.CUSTOMER);
    });
  });

  describe('User Login', () => {
    it('should successfully log in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validCustomer.email,
          password: validCustomer.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validCustomer.email.toLowerCase());

      // Update tokens
      customerAccessToken = res.body.data.tokens.accessToken;
      customerRefreshToken = res.body.data.tokens.refreshToken;
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: validCustomer.email,
          password: 'WrongPassword!123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('Protected Route Access & User Profile', () => {
    it('GET /api/v1/auth/me should return user details when valid bearer token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customerAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validCustomer.email.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('GET /api/v1/auth/me should reject access when token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Authentication token is missing');
    });

    it('GET /api/v1/auth/me should reject access when token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token-string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Refresh Token Rotation & Revocation', () => {
    it('POST /api/v1/auth/refresh should rotate refresh token and issue new token pair', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: customerRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      const newRefreshToken = res.body.data.tokens.refreshToken;
      expect(newRefreshToken).not.toBe(customerRefreshToken);

      // Update to new rotated tokens
      customerRefreshToken = newRefreshToken;
      customerAccessToken = res.body.data.tokens.accessToken;
    });

    it('POST /api/v1/auth/logout should revoke refresh token', async () => {
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${customerAccessToken}`)
        .send({ refreshToken: customerRefreshToken });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Attempting to refresh with revoked token should fail (token was removed)
      const refreshAfterLogout = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: customerRefreshToken });

      expect(refreshAfterLogout.status).toBe(401);
    });

    it('should detect refresh token reuse and terminate all active sessions', async () => {
      // Login again to establish a fresh session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validCustomer.email, password: validCustomer.password });

      const firstRefreshToken = loginRes.body.data.tokens.refreshToken;

      // Rotate once
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken });

      // Attempt to reuse firstRefreshToken (which was already rotated)
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.message).toContain('Revoked or reused refresh token detected');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    beforeAll(async () => {
      // Seed a test admin directly in DB (simulating secure admin provisioning)
      const adminPasswordHash = await AuthService.hashPassword('AdminPass@123!');
      const adminUser = new User({
        name: 'Store Manager',
        email: 'manager@paventraders.com',
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
      });

      const { accessToken } = AuthService.generateTokens(adminUser);
      await adminUser.save();
      adminAccessToken = accessToken;
    });

    it('should deny customer access to admin-protected endpoint (403 Forbidden)', async () => {
      // Create new customer token
      const cust = await User.findOne({ email: validCustomer.email });
      const { accessToken } = AuthService.generateTokens(cust!);

      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should allow admin access to admin-protected endpoint (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/admin-check')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe(UserRole.ADMIN);
    });
  });
});
