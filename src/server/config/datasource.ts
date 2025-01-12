import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

export const AppDataSource = new DataSource({
    type: "postgres",
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    username: process.env.POSTGRES_USER || "code_reviewer_admin",
    password: process.env.POSTGRES_PASSWORD || "farisej11",
    database: process.env.POSTGRES_DB || "code_reviewer",
    synchronize: false,
    logging: process.env.NODE_ENV === "development",
    entities: [path.join(__dirname, "..", "entities", "*.{ts,js}")],
    migrations: [path.join(__dirname, "..", "migrations", "*.{ts,js}")],
    subscribers: [path.join(__dirname, "..", "subscribers", "*.{ts,js}")],
});

// Initialize the DataSource
AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!");
    })
    .catch((error) => {
        console.error("Error during Data Source initialization", error);
    });