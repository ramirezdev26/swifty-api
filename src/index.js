import express from 'express';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import router from './presentation/routes/api.routes.js';
import errorMiddleware from './presentation/middleware/error.middleware.js';
import { initializeDatabase } from './infrastructure/persistence/initialize-database.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:4200', // Angular dev server
      'http://127.0.0.1:4200', // Alternative localhost
      'http://localhost:3000', // For potential other services
      'http://127.0.0.1:3000',
    ].filter(Boolean); // Remove undefined values

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins
    if (
      isDevelopment &&
      (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy violation: ${origin} not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  logger.debug('Headers:', req.headers);
  next();
});

app.use(express.json());
app.use('/api', router);

app.use(errorMiddleware);

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize database:', error);
    process.exit(1);
  });
