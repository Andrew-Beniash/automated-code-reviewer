import { Express } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';
import repositoryRoutes from './repository';
import codeReviewRoutes from './codeReview';
import ruleRoutes from './rules';

export const setupRoutes = (app: Express) => {
  // Health check routes - no auth required
  app.use('/health', healthRoutes);

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Repository management routes
  app.use('/api/repositories', repositoryRoutes);

  // Code review routes (nested under repositories)
  app.use('/api/repositories', codeReviewRoutes);

  // Rules management routes
  app.use('/api/rules', ruleRoutes);

  // Handle 404 for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Route not found',
    });
  });
};
