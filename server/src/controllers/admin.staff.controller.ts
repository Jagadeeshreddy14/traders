import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/staff
 * List all staff and fleet operators (ADMIN, STAFF, DELIVERY_PARTNER)
 */
export const getAdminStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { role } = req.query;

    const filter: Record<string, any> = {
      role: { $in: [UserRole.ADMIN, UserRole.STAFF, UserRole.DELIVERY_PARTNER] },
    };

    if (role && Object.values(UserRole).includes(role as UserRole)) {
      filter.role = role;
    }

    const staffMembers = await User.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(
      res,
      {
        staff: staffMembers.map((s: any) => ({
          id: s._id,
          name: s.name,
          email: s.email,
          phone: s.phone || '',
          role: s.role,
          permissions: s.permissions || [],
          isActive: s.isActive,
          createdAt: s.createdAt,
        })),
      },
      'Staff members retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/staff
 * Securely create a new staff account with assigned role and permissions
 */
export const createAdminStaff = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, phone, role, permissions = [] } = req.body;

    if (!name || !email || !password || !role) {
      return next(
        AppError.badRequest('Name, email, password, and role are required.')
      );
    }

    if (![UserRole.ADMIN, UserRole.STAFF, UserRole.DELIVERY_PARTNER].includes(role)) {
      return next(
        AppError.badRequest("Role must be one of 'ADMIN', 'STAFF', or 'DELIVERY_PARTNER'")
      );
    }

    if (password.length < 8) {
      return next(AppError.badRequest('Password must be at least 8 characters long'));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return next(AppError.badRequest(`An account with email '${email}' already exists.`));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const staffUser = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      phone,
      role,
      permissions: role === UserRole.ADMIN ? ['ALL'] : permissions,
      isActive: true,
      isVerified: true,
    });

    // If role is DELIVERY_PARTNER, also create DeliveryPartner record for fleet tracking
    if (role === UserRole.DELIVERY_PARTNER) {
      const existingPartner = await DeliveryPartner.findOne({ user: staffUser._id });
      if (!existingPartner) {
        await DeliveryPartner.create({
          user: staffUser._id,
          vehicleType: req.body.vehicleType || 'MOTORCYCLE',
          vehicleNumber: req.body.vehicleNumber || 'TS-09-EA-1234',
          licenseNumber: req.body.licenseNumber || 'DL-TS-2026-9999',
          status: 'AVAILABLE',
        });
      }
    }

    await recordAuditLog(req, 'CREATE_STAFF', 'STAFF', {
      staffId: staffUser._id,
      name: staffUser.name,
      email: staffUser.email,
      role: staffUser.role,
      permissions: staffUser.permissions,
    });

    sendSuccess(
      res,
      { staff: staffUser.toSafeJSON() },
      'Staff member created successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/staff/:id/status
 * Toggle staff active/inactive status
 */
export const toggleStaffStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const staff = await User.findById(req.params.id);
    if (!staff) {
      return next(AppError.notFound('Staff member not found'));
    }

    // Protect current logged-in user from deactivating themselves
    if (req.user && req.user._id.toString() === staff._id.toString()) {
      return next(AppError.badRequest('You cannot deactivate your own administrative account.'));
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    await recordAuditLog(req, 'TOGGLE_STAFF_STATUS', 'STAFF', {
      staffId: staff._id,
      name: staff.name,
      isActive: staff.isActive,
    });

    sendSuccess(
      res,
      { staff: staff.toSafeJSON() },
      `Staff member is now ${staff.isActive ? 'Active' : 'Deactivated'}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/staff/:id/permissions
 * Update staff permissions
 */
export const updateStaffPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { permissions } = req.body;
    if (!Array.isArray(permissions)) {
      return next(AppError.badRequest('Permissions must be an array of strings.'));
    }

    const staff = await User.findById(req.params.id);
    if (!staff) {
      return next(AppError.notFound('Staff member not found'));
    }

    staff.permissions = permissions;
    await staff.save();

    await recordAuditLog(req, 'UPDATE_STAFF_PERMISSIONS', 'STAFF', {
      staffId: staff._id,
      name: staff.name,
      permissions,
    });

    sendSuccess(
      res,
      { staff: staff.toSafeJSON() },
      'Staff permissions updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/staff/audit-logs
 * List staff and administrator activity audit logs
 */
export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { module, action, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};
    if (module && module !== 'ALL') filter.module = module;
    if (action && action !== 'ALL') filter.action = action;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Staff activity audit logs retrieved'
    );
  } catch (error) {
    next(error);
  }
};
