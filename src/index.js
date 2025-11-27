import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import router from './presentation/routes/api.routes.js';
import metricsRoutes from './presentation/routes/metrics.routes.js';
import errorMiddleware from './presentation/middleware/error.middleware.js';
import correlationIdMiddleware from './presentation/middleware/correlation-id.middleware.js';
import httpLoggerMiddleware from './presentation/middleware/http-logger.middleware.js';
import {
  metricsMiddleware,
  errorMetricsMiddleware,
} from './presentation/middleware/metrics.middleware.js';
import { logger } from './infrastructure/logger/pino.config.js';
import { initializeDatabase } from './infrastructure/persistence/initialize-database.js';
import { initSocketServer } from './infrastructure/services/socket.service.js';
import rabbitmqService from './infrastructure/services/rabbitmq.service.js';
import imageResultConsumer from './infrastructure/consumers/image-result.consumer.js';
import { config } from './infrastructure/config/env.js';
import { setupDependencies } from './infrastructure/config/dependencies.js';
import { setRegisterUserHandler } from './presentation/controllers/auth.controller.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

const app = express();

function createServer() {
  if (config.server.localCertificates) {
    const sslKeyPath = config.server.sslKeyPath || path.join(process.cwd(), 'certs', 'server.key');
    const sslCertPath =
      config.server.sslCertPath || path.join(process.cwd(), 'certs', 'server.crt');

    // Check if certificate files exist
    if (!fs.existsSync(sslKeyPath) || !fs.existsSync(sslCertPath)) {
      logger.error('SSL certificates not found. Please run: npm run generate-certs');
      logger.error(`Expected key: ${sslKeyPath}`);
      logger.error(`Expected cert: ${sslCertPath}`);
      process.exit(1);
    }

    try {
      const sslOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
      logger.info('Creating HTTPS server with local certificates');
      return https.createServer(sslOptions, app);
    } catch (error) {
      logger.error('Failed to create HTTPS server:', error.message);
      process.exit(1);
    }
  } else {
    logger.info('Creating HTTP server');
    return http.createServer(app);
  }
}

const server = createServer();

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

    // Add HTTPS versions of localhost origins when using certificates
    if (config.server.localCertificates) {
      allowedOrigins.push(
        'https://localhost:4200',
        'https://127.0.0.1:4200',
        'https://localhost:3000',
        'https://127.0.0.1:3000'
      );
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development, allow all localhost origins (both HTTP and HTTPS)
    if (isDevelopment) {
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        (config.server.localCertificates &&
          (origin.startsWith('https://localhost:') || origin.startsWith('https://127.0.0.1:')))
      ) {
        return callback(null, true);
      }
    }

    return callback(new Error(`CORS policy violation: ${origin} not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Middleware order is important
app.use(correlationIdMiddleware); // 1. Generate trace-id and attach logger to req
app.use(metricsMiddleware); // 2. Collect HTTP metrics
app.use(httpLoggerMiddleware); // 3. Log HTTP requests/responses

app.use(express.json());

// Routes
app.use('/metrics', metricsRoutes); // Metrics endpoint (no auth required)
app.use('/api', router); // API routes

// Error handling (must be at the end)
app.use(errorMetricsMiddleware); // Capture errors for metrics
app.use(errorMiddleware); // Handle errors

async function startServer() {
  try {
    logger.info({ event: 'app.startup.started' }, 'Starting swifty-api...');

    // Initialize database
    await initializeDatabase();
    logger.info({ event: 'database.connected', type: 'PostgreSQL' }, 'Database initialized');

    // Initialize RabbitMQ connection
    await rabbitmqService.connect();
    logger.info({ event: 'rabbitmq.connected' }, 'RabbitMQ connected');

    // Start consuming result events
    await imageResultConsumer.start();
    logger.info({ event: 'consumer.started', consumer: 'image-result' }, 'Consumer started');

    // Setup dependencies and command handlers
    const { eventPublisher, registerUserHandler } = await setupDependencies();

    // Initialize Event Publisher
    await eventPublisher.init();
    logger.info({ event: 'event-publisher.initialized' }, 'Event publisher ready');

    // Set handlers in controllers
    setRegisterUserHandler(registerUserHandler);

    // Initialize WebSocket server on the server (HTTP or HTTPS)
    initSocketServer(server);
    const wsProtocol = config.server.localCertificates ? 'WSS' : 'WS';
    logger.info({ event: 'websocket.initialized', protocol: wsProtocol }, 'WebSocket server ready');

    server.listen(PORT, () => {
      const protocol = config.server.localCertificates ? 'HTTPS' : 'HTTP';
      logger.info(
        {
          event: 'app.startup.completed',
          protocol,
          port: PORT,
          environment: process.env.NODE_ENV,
        },
        `${protocol} Server running on port ${PORT}`
      );
    });
  } catch (error) {
    logger.error(
      {
        event: 'app.startup.failed',
        error: {
          message: error.message,
          stack: error.stack,
        },
      },
      'Failed to initialize application'
    );
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ event: 'app.shutdown.started', signal: 'SIGTERM' }, 'Shutting down gracefully');
  await imageResultConsumer.stop();
  await rabbitmqService.close();
  server.close(() => {
    logger.info({ event: 'app.shutdown.completed' }, 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info({ event: 'app.shutdown.started', signal: 'SIGINT' }, 'Shutting down gracefully');
  await imageResultConsumer.stop();
  await rabbitmqService.close();
  server.close(() => {
    logger.info({ event: 'app.shutdown.completed' }, 'Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.fatal(
    {
      event: 'app.uncaught-exception',
      error: {
        message: error.message,
        stack: error.stack,
      },
    },
    'Uncaught exception - shutting down'
  );
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal(
    {
      event: 'app.unhandled-rejection',
      error: {
        reason,
        promise,
      },
    },
    'Unhandled promise rejection - shutting down'
  );
  process.exit(1);
});

startServer();
