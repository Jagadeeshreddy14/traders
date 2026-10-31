import { connectDatabase, disconnectDatabase } from '../config/db';
import { UserService } from '../services/user.service';
import { env } from '../config/env';
import { logger } from '../utils/logger';

async function seedAdmin() {
  try {
    logger.info('Connecting to database to provision initial administrator...');
    await connectDatabase();

    const adminUser = await UserService.provisionAdmin({
      name: env.INITIAL_ADMIN_NAME,
      email: env.INITIAL_ADMIN_EMAIL,
      password: env.INITIAL_ADMIN_PASSWORD,
      phone: env.INITIAL_ADMIN_PHONE,
    });

    logger.info('Administrator verified/provisioned successfully:');
    logger.info(`Name  : ${adminUser.name}`);
    logger.info(`Email : ${adminUser.email}`);
    logger.info(`Role  : ${adminUser.role}`);
    logger.info('Seeding finished.');
  } catch (error) {
    logger.error('Error seeding administrator:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

seedAdmin();
