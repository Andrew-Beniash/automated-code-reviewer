import { Express } from 'express';
import healthRoutes from './health';
import authRoutes from './auth';

export const setupRoutes = (app: Express) => {
  // Health check routes
  app.use('/health', healthRoutes);
  
  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Add other route groups here
};