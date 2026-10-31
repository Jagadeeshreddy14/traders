import { Router } from 'express';
import { getMyNotifications, markNotificationRead } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getMyNotifications);
router.patch('/:id/read', authenticate, markNotificationRead);

export default router;
