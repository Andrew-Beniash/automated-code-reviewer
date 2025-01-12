import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { RuleController } from '../controllers/RuleController';
import { UserRole } from '../entities/User.mjs';
import { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * Rule Management Routes - /api/rules/
 * All routes require authentication
 */

// Get all rules (filtered by user role and query parameters)
// GET /api/rules
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.getAll(req, res, next);
});

// Get a specific rule
// GET /api/rules/:id
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.getOne(req, res, next);
});

// Create a new rule
// POST /api/rules
router.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.create(req, res, next);
});

// Update a rule
// PUT /api/rules/:id
router.put('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.update(req, res, next);
});

// Delete a rule
// DELETE /api/rules/:id
router.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.delete(req, res, next);
});

// Bulk update rules
// PATCH /api/rules/bulk
router.patch('/bulk', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  return RuleController.bulkUpdate(req, res, next);
});

export default router;
