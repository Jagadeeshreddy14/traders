import { connectDatabase, disconnectDatabase } from '../config/db';
import { Coupon, DiscountType } from '../models/Coupon';
import { DeliveryConfig } from '../models/DeliveryConfig';
import { logger } from '../utils/logger';

async function seedPhase3() {
  try {
    logger.info('Connecting to database to seed Phase 3 coupons and delivery settings...');
    await connectDatabase();

    // 1. Seed or update DeliveryConfig
    let config = await DeliveryConfig.findOne();
    if (!config) {
      config = new DeliveryConfig();
    }

    config.deliveryCharge = 4000; // ₹40
    config.freeDeliveryThreshold = 49900; // ₹499
    config.packagingCharge = 1500; // ₹15
    config.minOrderAmount = 19900; // ₹199
    config.defaultDeliveryWindow = '30-45 mins';
    config.supportedPincodes = [
      { pincode: '500001', areaName: 'City Center / Abids', deliveryWindow: '25-40 mins', isServiceable: true },
      { pincode: '500002', areaName: 'Koti Commercial Hub', deliveryWindow: '30-45 mins', isServiceable: true },
      { pincode: '500003', areaName: 'Secunderabad Station Zone', deliveryWindow: '35-50 mins', isServiceable: true },
      { pincode: '500004', areaName: 'Nampally Market Zone', deliveryWindow: '25-40 mins', isServiceable: true },
      { pincode: '500028', areaName: 'Mehdipatnam Express Hub', deliveryWindow: '30-45 mins', isServiceable: true },
      { pincode: '500034', areaName: 'Banjara Hills Sector 1-14', deliveryWindow: '25-35 mins', isServiceable: true },
      { pincode: '500081', areaName: 'Madhapur / Hitech City', deliveryWindow: '30-45 mins', isServiceable: true },
      { pincode: '500082', areaName: 'Gachibowli Outer Hub', deliveryWindow: '35-50 mins', isServiceable: true },
      { pincode: '500033', areaName: 'Jubilee Hills Road 1-36', deliveryWindow: '25-35 mins', isServiceable: true },
      { pincode: '500016', areaName: 'Begumpet Residency Area', deliveryWindow: '30-45 mins', isServiceable: true },
    ];
    await config.save();
    logger.info('DeliveryConfig seeded successfully with 10 serviceable central zones.');

    // 2. Seed promotional Coupons
    const now = new Date();
    const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const expiredDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

    const couponsToSeed = [
      {
        code: 'WELCOME100',
        description: 'Flat ₹100 instant discount on orders above ₹500',
        discountType: DiscountType.FLAT,
        discountValue: 10000, // ₹100 in paise
        minOrderValue: 50000, // ₹500 in paise
        validFrom: now,
        validUntil: oneMonthFromNow,
        usageLimit: 1000,
        userUsageLimit: 1,
        isActive: true,
      },
      {
        code: 'PAVEN20',
        description: '20% discount up to ₹150 off on orders above ₹300',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20, // 20%
        minOrderValue: 30000, // ₹300 in paise
        maxDiscountAmount: 15000, // ₹150 in paise
        validFrom: now,
        validUntil: oneMonthFromNow,
        usageLimit: 500,
        userUsageLimit: 2,
        isActive: true,
      },
      {
        code: 'FREESHIP',
        description: 'Free delivery voucher on orders above ₹200',
        discountType: DiscountType.FLAT,
        discountValue: 4000, // ₹40 in paise
        minOrderValue: 20000, // ₹200 in paise
        validFrom: now,
        validUntil: oneMonthFromNow,
        usageLimit: 2000,
        userUsageLimit: 3,
        isActive: true,
      },
      {
        code: 'SUPERGROCERY',
        description: '15% discount up to ₹250 on bulk pantry orders above ₹800',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15, // 15%
        minOrderValue: 80000, // ₹800 in paise
        maxDiscountAmount: 25000, // ₹250 in paise
        validFrom: now,
        validUntil: oneMonthFromNow,
        usageLimit: 300,
        userUsageLimit: 1,
        isActive: true,
      },
      {
        code: 'EXPIRED50',
        description: 'Expired promo code for testing',
        discountType: DiscountType.FLAT,
        discountValue: 5000,
        minOrderValue: 20000,
        validFrom: pastDate,
        validUntil: expiredDate,
        isActive: true,
      },
      {
        code: 'INACTIVE10',
        description: 'Inactive coupon for testing',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minOrderValue: 10000,
        validFrom: now,
        validUntil: oneMonthFromNow,
        isActive: false,
      },
    ];

    for (const c of couponsToSeed) {
      await Coupon.findOneAndUpdate(
        { code: c.code },
        { $set: c },
        { upsert: true, new: true }
      );
      logger.info(`Seeded coupon: ${c.code}`);
    }

    logger.info('Phase 3 seed data completed successfully!');
  } catch (error) {
    logger.error('Error seeding Phase 3 data:', error);
  } finally {
    await disconnectDatabase();
  }
}

seedPhase3();
