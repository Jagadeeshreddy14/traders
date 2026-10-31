import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * Customer: Get customer notifications
 * GET /api/v1/notifications
 */
export const getMyNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(30);

    sendSuccess(res, { notifications }, 'Notifications retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Customer: Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export const markNotificationRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true }
    );

    sendSuccess(res, null, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};
