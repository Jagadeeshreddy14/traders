import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '../services/delivery.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getServiceability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pincode = req.query.pincode as string;
    if (!pincode) {
      return next(AppError.badRequest('Query parameter "pincode" is required'));
    }

    const result = await DeliveryService.checkServiceability(pincode);
    sendSuccess(res, result, 'Delivery serviceability status retrieved');
  } catch (error) {
    next(error);
  }
};

export const getDeliveryConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await DeliveryService.getConfig();
    sendSuccess(
      res,
      {
        deliveryCharge: config.deliveryCharge,
        freeDeliveryThreshold: config.freeDeliveryThreshold,
        packagingCharge: config.packagingCharge,
        minOrderAmount: config.minOrderAmount,
        defaultDeliveryWindow: config.defaultDeliveryWindow,
        supportedPincodesCount: config.supportedPincodes.filter((p) => p.isServiceable).length,
      },
      'Public delivery configuration retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminDeliveryConfig = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await DeliveryService.getConfig();
    sendSuccess(res, config, 'Admin delivery configuration retrieved');
  } catch (error) {
    next(error);
  }
};

export const updateAdminDeliveryConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await DeliveryService.updateConfig(req.body);
    sendSuccess(res, updated, 'Delivery configuration updated successfully');
  } catch (error) {
    next(error);
  }
};

export const addOrUpdatePincode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pincode, areaName, deliveryWindow, isServiceable, deliveryChargeOverride } = req.body;
    if (!pincode || !areaName) {
      return next(AppError.badRequest('pincode and areaName are required'));
    }

    const updated = await DeliveryService.addOrUpdatePincode({
      pincode: pincode.trim(),
      areaName: areaName.trim(),
      deliveryWindow: deliveryWindow?.trim() || '30-45 mins',
      isServiceable: isServiceable !== undefined ? isServiceable : true,
      deliveryChargeOverride: deliveryChargeOverride ? Number(deliveryChargeOverride) : undefined,
    });

    sendSuccess(res, updated, `PIN code ${pincode} configured successfully`);
  } catch (error) {
    next(error);
  }
};

export const removePincode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pincode } = req.params;
    if (!pincode) {
      return next(AppError.badRequest('PIN code parameter is required'));
    }

    const updated = await DeliveryService.removePincode(pincode);
    sendSuccess(res, updated, `PIN code ${pincode} removed from delivery service`);
  } catch (error) {
    next(error);
  }
};
