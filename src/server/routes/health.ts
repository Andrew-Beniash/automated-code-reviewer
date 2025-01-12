import { Router } from 'express';
import { loggerWrapper as logger } from '../config/logger';
import { getConnection } from 'typeorm';
import { createClient, RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
    };
  };
}

router.get('/health', async (req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
  };

  try {
    // Check PostgreSQL
    const startPg = Date.now();
    await getConnection().query('SELECT 1');
    health.services.postgres = {
      status: 'up',
      latency: Date.now() - startPg,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.postgres = { status: 'down' };
    logger.error('PostgreSQL health check failed', error);
  }

  try {
    // Check Redis
    const startRedis = Date.now();
    const redisClient: RedisClientType = createClient({
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      password: process.env.REDIS_PASSWORD,
    });
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.disconnect();
    health.services.redis = {
      status: 'up',
      latency: Date.now() - startRedis,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.redis = { status: 'down' };
    logger.error('Redis health check failed', error);
  }

  try {
    // Check MongoDB
    const startMongo = Date.now();
    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    await client.db().admin().ping();
    await client.close();
    health.services.mongodb = {
      status: 'up',
      latency: Date.now() - startMongo,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.mongodb = { status: 'down' };
    logger.error('MongoDB health check failed', error);
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;