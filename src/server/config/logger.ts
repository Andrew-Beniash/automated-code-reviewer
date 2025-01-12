import winston from 'winston';
import path from 'path';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error',
    }),
    // All logs
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/combined.log'),
    }),
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Export a wrapper function for consistent logging
export const loggerWrapper = {
  error: (message: string, meta?: any) => {
    logger.error(message, { meta });
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, { meta });
  },
  info: (message: string, meta?: any) => {
    logger.info(message, { meta });
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, { meta });
  },
  http: (message: string, meta?: any) => {
    logger.http(message, { meta });
  },
};

export default loggerWrapper;