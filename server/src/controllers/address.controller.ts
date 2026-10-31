import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/address.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const addresses = await AddressService.getUserAddresses(req.user.id);
    sendSuccess(res, { addresses }, 'Addresses retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getAddressById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const address = await AddressService.getAddressById(req.params.id, req.user.id);
    sendSuccess(res, { address }, 'Address retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const createAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { fullName, phone, houseNo, street, area, streetAddress, landmark, city, state, pincode, type, isDefault } =
      req.body;

    if (!fullName || !phone || !pincode) {
      return next(AppError.badRequest('fullName, phone, and pincode are required'));
    }

    const address = await AddressService.createAddress(req.user.id, {
      fullName,
      phone,
      houseNo,
      street,
      area,
      streetAddress,
      landmark,
      city,
      state,
      pincode,
      type,
      isDefault,
    });

    sendSuccess(res, { address }, 'Delivery address added successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const address = await AddressService.updateAddress(req.params.id, req.user.id, req.body);
    sendSuccess(res, { address }, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

export const setDefaultAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const address = await AddressService.setDefault(req.params.id, req.user.id);
    sendSuccess(res, { address }, 'Default address updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    await AddressService.deleteAddress(req.params.id, req.user.id);
    sendSuccess(res, null, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};
