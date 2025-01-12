import express from 'express';
import { AppDataSource } from '../config/typeorm.config';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database connections
    await AppDataSource.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        server: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;