import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { RepositoryController } from '../controllers/RepositoryController';
import { UserRole } from '../entities/User.mjs';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Repository routes - /api/repositories/
 * All routes require authentication
 */

// Get all repositories the user has access to
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RepositoryController.getAll(req, res, next);
});

// Get a specific repository by ID
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RepositoryController.getOne(req, res, next);
});

// Create a new repository
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RepositoryController.create(req, res, next);
});

// Update repository settings
router.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RepositoryController.update(req, res, next);
});

// Delete a repository
router.delete(
  '/:id',
  requireAuth,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    return RepositoryController.delete(req, res, next);
  }
);

// Sync repository with VCS provider (GitHub, GitLab, etc.)
router.post('/:id/sync', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RepositoryController.syncWithGitHub(req, res, next);
});

export default router;
