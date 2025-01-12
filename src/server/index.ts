import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import { errorHandler, setupErrorHandlers } from "./middleware/errorHandler";
import { setupRoutes } from "./routes/index"; // Fixed import path
import { AppDataSource } from "./config/typeorm.config";
import 'reflect-metadata';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize TypeORM connection
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
  })
  .catch((error) => {
    console.error("Error during Data Source initialization", error);
  });

// Setup global error handlers
setupErrorHandlers();

// Middleware
app.use(helmet());  // Security middleware
app.use(compression());  // Compression middleware
app.use(express.json());  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// Setup routes
setupRoutes(app);

// Error handling middleware (must be after all other middleware and routes)
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;