import express from 'express';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import router from './presentation/routes/api.routes.js';
import errorMiddleware from './presentation/middleware/error.middleware.js';
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

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  logger.debug('Headers:', req.headers);
  next();
});

app.use(express.json());
app.use('/api', router);

app.use(errorMiddleware);

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    logger.info('[Database] PostgreSQL initialized successfully');

    // Initialize RabbitMQ connection
    await rabbitmqService.connect();
    logger.info('[RabbitMQ] Connected successfully');

    // Start consuming result events
    await imageResultConsumer.start();
    logger.info('[Consumer] Image result consumer started');

    // Setup dependencies and command handlers
    const { eventPublisher, registerUserHandler } = await setupDependencies();

    // Initialize Event Publisher
    await eventPublisher.init();

    // Set handlers in controllers
    setRegisterUserHandler(registerUserHandler);

    // Initialize WebSocket server on the server (HTTP or HTTPS)
    initSocketServer(server);

    server.listen(PORT, () => {
      const protocol = config.server.localCertificates ? 'HTTPS' : 'HTTP';
      const wsProtocol = config.server.localCertificates ? 'WSS' : 'WS';
      logger.info(`${protocol} Server is running on port ${PORT}`);
      logger.info(`${wsProtocol} WebSocket server path available at /ws`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await imageResultConsumer.stop();
  await rabbitmqService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await imageResultConsumer.stop();
  await rabbitmqService.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();
