import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { User, IUserDocument, UserRole } from '../models/User';
import { AppError } from '../utils/appError';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export class AuthService {
  /**
   * Hashes a raw password securely using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  /**
   * Hashes a refresh token string using SHA-256 for secure DB persistence
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates JWT Access and Refresh tokens
   */
  static generateTokens(user: IUserDocument): { accessToken: string; refreshToken: string } {
    const payload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY as any,
    });

    const refreshToken = jwt.sign(
      {
        userId: user._id.toString(),
        tokenVersion: user.tokenVersion,
        jti: crypto.randomUUID(),
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as any }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Registers a new customer.
   * Enforces role = CUSTOMER (prevents privilege escalation).
   */
  static async registerCustomer(
    input: RegisterInput,
    metadata?: { userAgent?: string; ip?: string }
  ): Promise<{ user: Record<string, any>; tokens: TokenPair }> {
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw AppError.conflict('An account with this email address already exists');
    }

    if (input.phone) {
      const existingPhone = await User.findOne({ phone: input.phone });
      if (existingPhone) {
        throw AppError.conflict('An account with this phone number already exists');
      }
    }

    const passwordHash = await this.hashPassword(input.password);

    const user = new User({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      phone: input.phone,
      role: UserRole.CUSTOMER, // Strict customer role enforcement
      isActive: true,
      isVerified: false,
    });

    const { accessToken, refreshToken } = this.generateTokens(user);
    const tokenHash = this.hashToken(refreshToken);

    // Refresh token expiry calculation (7 days default)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    user.refreshTokens = [
      {
        tokenHash,
        expiresAt,
        createdAt: new Date(),
        userAgent: metadata?.userAgent,
        ip: metadata?.ip,
      },
    ];

    await user.save();

    return {
      user: user.toSafeJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRY,
      },
    };
  }

  /**
   * Authenticates user via email and password
   */
  static async login(
    input: LoginInput,
    metadata?: { userAgent?: string; ip?: string }
  ): Promise<{ user: Record<string, any>; tokens: TokenPair }> {
    const user = await User.findOne({ email: input.email.toLowerCase() })
      .select('+passwordHash +refreshTokens');

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account is deactivated. Please contact support.');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Keep active tokens clean, limit max active sessions per user to 5
    const cleanTokens = user.refreshTokens
      .filter((t) => t.expiresAt > new Date())
      .slice(-4);

    cleanTokens.push({
      tokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent: metadata?.userAgent,
      ip: metadata?.ip,
    });

    user.refreshTokens = cleanTokens;
    await user.save();

    return {
      user: user.toSafeJSON(),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRY,
      },
    };
  }

  /**
   * Refreshes access token with full refresh token rotation
   */
  static async refreshToken(
    rawRefreshToken: string,
    metadata?: { userAgent?: string; ip?: string }
  ): Promise<{ tokens: TokenPair }> {
    let decoded: any;
    try {
      decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.isActive) {
      throw AppError.unauthorized('User not found or deactivated');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingIndex = user.refreshTokens.findIndex((t) => t.tokenHash === tokenHash);

    // Reuse detection: if token is not found in user's active tokens, invalidate all sessions!
    if (existingIndex === -1) {
      user.refreshTokens = [];
      user.tokenVersion += 1;
      await user.save();
      throw AppError.unauthorized('Revoked or reused refresh token detected. Session terminated.');
    }

    // Token is valid: Rotate refresh token
    const { accessToken, refreshToken: newRefreshToken } = this.generateTokens(user);
    const newTokenHash = this.hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Remove old token and add new rotated token
    user.refreshTokens.splice(existingIndex, 1);
    user.refreshTokens.push({
      tokenHash: newTokenHash,
      expiresAt,
      createdAt: new Date(),
      userAgent: metadata?.userAgent,
      ip: metadata?.ip,
    });

    await user.save();

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: env.JWT_ACCESS_EXPIRY,
      },
    };
  }

  /**
   * Revokes refresh token on user logout
   */
  static async logout(userId: string, rawRefreshToken?: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) return;

    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      user.refreshTokens = user.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
    } else {
      user.refreshTokens = [];
    }

    await user.save();
  }
}
