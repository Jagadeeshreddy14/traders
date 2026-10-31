import mongoose from 'mongoose';
import { Address, IAddressDocument } from '../models/Address';
import { AppError } from '../utils/appError';

export interface ICreateAddressInput {
  fullName: string;
  phone: string;
  houseNo?: string;
  street?: string;
  area?: string;
  streetAddress?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode: string;
  type?: 'HOME' | 'WORK' | 'OTHER';
  isDefault?: boolean;
}

export class AddressService {
  /**
   * Validate Indian mobile number and 6-digit PIN code
   */
  private static validateInputs(phone: string, pincode: string) {
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    const mobilePattern = /(?:91)?[6-9]\d{9}$/;
    if (!mobilePattern.test(cleanPhone)) {
      throw AppError.badRequest('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
    }

    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      throw AppError.badRequest('Please enter a valid 6-digit Indian PIN code (e.g. 500001).');
    }
  }

  /**
   * Get all addresses for an authenticated user, default first
   */
  static async getUserAddresses(userId: string | mongoose.Types.ObjectId): Promise<IAddressDocument[]> {
    return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
  }

  /**
   * Get a single address, verifying user ownership
   */
  static async getAddressById(
    addressId: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IAddressDocument> {
    const address = await Address.findById(addressId);
    if (!address) {
      throw AppError.notFound('Address not found');
    }

    if (address.user.toString() !== userId.toString()) {
      throw AppError.forbidden('You do not have permission to view or use this address');
    }

    return address;
  }

  /**
   * Create a new delivery address
   */
  static async createAddress(
    userId: string | mongoose.Types.ObjectId,
    input: ICreateAddressInput
  ): Promise<IAddressDocument> {
    this.validateInputs(input.phone, input.pincode);

    const existingCount = await Address.countDocuments({ user: userId });
    // First address is automatically default, or if explicitly requested
    const shouldBeDefault = existingCount === 0 || !!input.isDefault;

    if (shouldBeDefault && existingCount > 0) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    }

    // Build street address from components if not provided directly
    const streetAddress =
      input.streetAddress ||
      [input.houseNo, input.street, input.area].filter(Boolean).join(', ') ||
      'Customer Address';

    const address = await Address.create({
      user: userId,
      recipientName: input.fullName.trim(),
      recipientPhone: input.phone.trim(),
      houseNo: input.houseNo?.trim(),
      street: input.street?.trim(),
      area: input.area?.trim(),
      streetAddress: streetAddress.trim(),
      landmark: input.landmark?.trim(),
      city: input.city?.trim() || 'Hyderabad',
      state: input.state?.trim() || 'Telangana',
      postalCode: input.pincode.trim(),
      label: input.type || 'HOME',
      isDefault: shouldBeDefault,
    });

    return address;
  }

  /**
   * Update an existing address, ensuring ownership
   */
  static async updateAddress(
    addressId: string,
    userId: string | mongoose.Types.ObjectId,
    input: Partial<ICreateAddressInput>
  ): Promise<IAddressDocument> {
    const address = await this.getAddressById(addressId, userId);

    if (input.phone || input.pincode) {
      this.validateInputs(
        input.phone || address.recipientPhone,
        input.pincode || address.postalCode
      );
    }

    if (input.fullName) address.recipientName = input.fullName.trim();
    if (input.phone) address.recipientPhone = input.phone.trim();
    if (input.houseNo !== undefined) address.houseNo = input.houseNo.trim();
    if (input.street !== undefined) address.street = input.street.trim();
    if (input.area !== undefined) address.area = input.area.trim();
    if (input.landmark !== undefined) address.landmark = input.landmark.trim();
    if (input.city !== undefined) address.city = input.city.trim();
    if (input.state !== undefined) address.state = input.state.trim();
    if (input.pincode) address.postalCode = input.pincode.trim();
    if (input.type) address.label = input.type;

    if (input.streetAddress) {
      address.streetAddress = input.streetAddress.trim();
    } else if (input.houseNo || input.street || input.area) {
      address.streetAddress = [address.houseNo, address.street, address.area].filter(Boolean).join(', ');
    }

    if (input.isDefault && !address.isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
      address.isDefault = true;
    }

    await address.save();
    return address;
  }

  /**
   * Set an address as the default delivery address
   */
  static async setDefault(
    addressId: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<IAddressDocument> {
    const address = await this.getAddressById(addressId, userId);

    await Address.updateMany({ user: userId }, { isDefault: false });
    address.isDefault = true;
    await address.save();

    return address;
  }

  /**
   * Delete an address, reassigning default if necessary
   */
  static async deleteAddress(
    addressId: string,
    userId: string | mongoose.Types.ObjectId
  ): Promise<void> {
    const address = await this.getAddressById(addressId, userId);
    const wasDefault = address.isDefault;

    await Address.findByIdAndDelete(addressId);

    // If deleted address was default, promote another address to default
    if (wasDefault) {
      const nextAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }
  }
}
