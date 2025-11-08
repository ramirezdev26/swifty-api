import express from 'express';
import cors from 'cors';
import pino from 'pino';
import dotenv from 'dotenv';
import router from './presentation/routes/api.routes.js';
import errorMiddleware from './presentation/middleware/error.middleware.js';
import { initializeDatabase } from './infrastructure/persistence/initialize-database.js';
import rabbitmqService from './infrastructure/services/rabbitmq.service.js';
import imageResultConsumer from './infrastructure/consumers/image-result.consumer.js';
import { setupDependencies } from './infrastructure/config/dependencies.js';
import { setProcessImageHandler } from './presentation/controllers/image.controller.js';
import { setRegisterUserHandler } from './presentation/controllers/auth.controller.js';

dotenv.config();

const isDevelopment = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3001;

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

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
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
  .then(async () => {
    // Initialize RabbitMQ connection
    await rabbitmqService.connect();

    // Setup dependencies and command handlers
    const { eventPublisher, processImageHandler, registerUserHandler } = await setupDependencies();

    // Initialize Event Publisher
    await eventPublisher.init();

    // Set handlers in controllers
    setProcessImageHandler(processImageHandler);
    setRegisterUserHandler(registerUserHandler);

    // Start consuming status updates
    await imageResultConsumer.start();

    logger.info('[Command Service] Ready');

    app.listen(PORT, () => {
      logger.info(`[Command Service] Running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await rabbitmqService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await rabbitmqService.close();
  process.exit(0);
});
