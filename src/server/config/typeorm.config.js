import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Handle ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Create and export the DataSource instance
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  // Entity settings
  entities: [join(__dirname, '..', 'entities', '*.{ts,js}')],

  // Migration settings
  migrations: [join(__dirname, '..', 'migrations-js', '*.js')],
  migrationsTableName: 'typeorm_migrations',
  migrationsRun: false,

  // General settings
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export default AppDataSource;
