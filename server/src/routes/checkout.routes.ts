import { Router } from 'express';
import { getCheckoutPreview } from '../controllers/checkout.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/preview', getCheckoutPreview);

export default router;
