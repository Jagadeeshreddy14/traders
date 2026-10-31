import { User, IUserDocument, UserRole } from '../models/User';
import { AuthService } from './auth.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export class UserService {
  static async findById(id: string): Promise<Record<string, any>> {
    const user = await User.findById(id);
    if (!user) {
      throw AppError.notFound('User not found');
    }
    return user.toSafeJSON();
  }

  static async findByEmail(email: string): Promise<IUserDocument | null> {
    return User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Secure Admin Provisioning:
   * Used strictly via CLI seeding script, not exposed via public API endpoints
   */
  static async provisionAdmin(adminData: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<Record<string, any>> {
    const existing = await User.findOne({ email: adminData.email.toLowerCase() });
    if (existing) {
      logger.info(`Admin user with email ${adminData.email} already exists.`);
      return existing.toSafeJSON();
    }

    const passwordHash = await AuthService.hashPassword(adminData.password);
    const admin = new User({
      name: adminData.name,
      email: adminData.email.toLowerCase(),
      passwordHash,
      phone: adminData.phone,
      role: UserRole.ADMIN,
      isActive: true,
      isVerified: true,
    });

    await admin.save();
    logger.info(`Admin user successfully provisioned: ${admin.email}`);
    return admin.toSafeJSON();
  }
}
