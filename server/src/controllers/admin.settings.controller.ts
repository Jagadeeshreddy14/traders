import { Request, Response, NextFunction } from 'express';
import { StoreSettings } from '../models/StoreSettings';
import { DeliveryConfig } from '../models/DeliveryConfig';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * Helper to ensure a single StoreSettings document exists
 */
const getOrCreateSettings = async () => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({
      storeName: 'Paven Traders',
      contactEmail: 'support@paventraders.com',
      contactPhone: '+91 98765 43210',
      storeAddress: 'Shop 12, Paven Commercial Complex, Hyderabad, Telangana 500001',
      isOpen: true,
      openingTime: '07:00 AM',
      closingTime: '10:00 PM',
      deliveryChargeRupees: 40,
      freeDeliveryThresholdRupees: 499,
      packagingChargeRupees: 15,
      minOrderAmountRupees: 199,
      defaultDeliveryWindow: '30-45 mins',
    });
  }
  return settings;
};

/**
 * GET /api/v1/admin/settings
 * Retrieve full store configurations
 */
export const getAdminStoreSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await getOrCreateSettings();
    sendSuccess(res, { settings }, 'Store settings retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/settings
 * Update store settings and synchronize delivery rules
 */
export const updateAdminStoreSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await getOrCreateSettings();

    const {
      storeName,
      storeLogo,
      contactEmail,
      contactPhone,
      storeAddress,
      isOpen,
      openingTime,
      closingTime,
      deliveryChargeRupees,
      freeDeliveryThresholdRupees,
      packagingChargeRupees,
      minOrderAmountRupees,
      defaultDeliveryWindow,
      supportedPincodes,
      taxGstin,
    } = req.body;

    if (storeName !== undefined) settings.storeName = storeName;
    if (storeLogo !== undefined) settings.storeLogo = storeLogo;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (storeAddress !== undefined) settings.storeAddress = storeAddress;
    if (isOpen !== undefined) settings.isOpen = Boolean(isOpen);
    if (openingTime !== undefined) settings.openingTime = openingTime;
    if (closingTime !== undefined) settings.closingTime = closingTime;
    if (deliveryChargeRupees !== undefined) settings.deliveryChargeRupees = Number(deliveryChargeRupees);
    if (freeDeliveryThresholdRupees !== undefined) {
      settings.freeDeliveryThresholdRupees = Number(freeDeliveryThresholdRupees);
    }
    if (packagingChargeRupees !== undefined) {
      settings.packagingChargeRupees = Number(packagingChargeRupees);
    }
    if (minOrderAmountRupees !== undefined) {
      settings.minOrderAmountRupees = Number(minOrderAmountRupees);
    }
    if (defaultDeliveryWindow !== undefined) {
      settings.defaultDeliveryWindow = defaultDeliveryWindow;
    }
    if (supportedPincodes !== undefined && Array.isArray(supportedPincodes)) {
      settings.supportedPincodes = supportedPincodes;
    }
    if (taxGstin !== undefined) settings.taxGstin = taxGstin;

    await settings.save();

    // Synchronize DeliveryConfig (in paise) for checkout system backward compatibility
    let deliveryConfig = await DeliveryConfig.findOne();
    if (!deliveryConfig) {
      deliveryConfig = new DeliveryConfig();
    }
    deliveryConfig.deliveryCharge = settings.deliveryChargeRupees * 100;
    deliveryConfig.freeDeliveryThreshold = settings.freeDeliveryThresholdRupees * 100;
    deliveryConfig.packagingCharge = settings.packagingChargeRupees * 100;
    deliveryConfig.minOrderAmount = settings.minOrderAmountRupees * 100;
    deliveryConfig.defaultDeliveryWindow = settings.defaultDeliveryWindow;
    if (settings.supportedPincodes && settings.supportedPincodes.length > 0) {
      deliveryConfig.supportedPincodes = settings.supportedPincodes.map((sp) => ({
        pincode: sp.pincode,
        areaName: sp.areaName,
        deliveryWindow: sp.deliveryWindow,
        isServiceable: sp.isServiceable,
        deliveryChargeOverride: sp.deliveryChargeOverride
          ? sp.deliveryChargeOverride * 100
          : undefined,
      }));
    }
    await deliveryConfig.save();

    await recordAuditLog(req, 'UPDATE_STORE_SETTINGS', 'SETTINGS', {
      storeName: settings.storeName,
      isOpen: settings.isOpen,
      deliveryChargeRupees: settings.deliveryChargeRupees,
    });

    sendSuccess(res, { settings }, 'Store settings updated and synchronized successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/settings/operating-status
 * Toggle store Open / Closed status
 */
export const toggleStoreOperatingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const settings = await getOrCreateSettings();
    settings.isOpen = !settings.isOpen;
    await settings.save();

    await recordAuditLog(req, 'TOGGLE_STORE_STATUS', 'SETTINGS', {
      isOpen: settings.isOpen,
    });

    sendSuccess(
      res,
      { isOpen: settings.isOpen },
      `Store operational status changed to: ${settings.isOpen ? 'OPEN' : 'CLOSED'}`
    );
  } catch (error) {
    next(error);
  }
};
