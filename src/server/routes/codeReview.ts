import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { CodeReviewController } from '../controllers/CodeReviewController';
import { UserRole } from '../entities/User.mjs';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Code Review routes - /api/repositories/:repositoryId/reviews/
 * All routes require authentication
 */

// Get all code reviews for a repository
router.get(
  '/:repositoryId/reviews',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    return CodeReviewController.getAll(req, res, next);
  }
);

// Get a specific code review
router.get(
  '/:repositoryId/reviews/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    return CodeReviewController.getOne(req, res, next);
  }
);

// Create a new code review
router.post(
  '/:repositoryId/reviews',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    return CodeReviewController.create(req, res, next);
  }
);

// Cancel a code review
router.post(
  '/:repositoryId/reviews/:id/cancel',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    return CodeReviewController.cancel(req, res, next);
  }
);

// Get review statistics
router.get(
  '/:repositoryId/reviews/stats',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    return CodeReviewController.getStats(req, res, next);
  }
);

export default router;
