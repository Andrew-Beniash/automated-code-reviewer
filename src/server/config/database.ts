import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432"),
  username: process.env.POSTGRES_USER || "admin",
  password: process.env.POSTGRES_PASSWORD || "your_secure_password",
  database: process.env.POSTGRES_DB || "code_reviewer",
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV !== "production",
  entities: ["src/server/models/**/*.ts"],
  migrations: ["src/server/migrations/**/*.ts"],
  subscribers: ["src/server/subscribers/**/*.ts"],
});

// MongoDB connection configuration
import mongoose from "mongoose";

export const connectMongoDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      "mongodb://admin:your_secure_password@localhost:27017/code_analysis";
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Redis connection configuration
import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  // Add password if needed in production
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});
