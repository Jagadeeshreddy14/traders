import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { AppError } from '../utils/appError';

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
        )
      );
    }

    next();
  };
};

export const authorizePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required'));
    }

    // ADMIN has full unrestricted permission
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // STAFF checks permissions array
    if (
      req.user.role === UserRole.STAFF &&
      req.user.permissions &&
      (req.user.permissions.includes(permission) || req.user.permissions.includes('ALL'))
    ) {
      return next();
    }

    return next(
      AppError.forbidden(`Access denied. Missing required permission: '${permission}'.`)
    );
  };
};

export const recordAuditLog = async (
  req: Request,
  action: string,
  module: string,
  details?: Record<string, any>
) => {
  try {
    await AuditLog.create({
      user: req.user?._id,
      userName: req.user?.name || 'System / Admin',
      userRole: req.user?.role || 'ADMIN',
      action,
      module,
      details,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
};
