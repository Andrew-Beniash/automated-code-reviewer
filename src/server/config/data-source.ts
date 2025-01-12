import { DataSource } from 'typeorm';
import { User } from '../entities/User.mjs';
import { Repository } from '../entities/Repository.mjs';
import { CodeReview } from '../entities/CodeReview.mjs';
import { ReviewFinding } from '../entities/ReviewFinding.mjs';
import { Rule } from '../entities/Rule.mjs';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'code_reviewer_admin',
  password: process.env.POSTGRES_PASSWORD || 'farisej11',
  database: process.env.POSTGRES_DB || 'code_reviewer',
  synchronize: false,
  logging: true,
  entities: [User, Repository, CodeReview, ReviewFinding, Rule],
  migrations: ['src/server/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
