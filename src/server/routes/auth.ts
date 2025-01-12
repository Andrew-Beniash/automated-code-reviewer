import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// OAuth routes
router.get('/github/callback', AuthController.githubCallback);


// Protected routes
router.get('/profile', requireAuth, AuthController.getProfile);

export default router;