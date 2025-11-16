import { ImageRepository } from '../persistence/repositories/image.repository.js';
import { UserRepository } from '../persistence/repositories/user.repository.js';
import { EventStoreRepository } from '../persistence/repositories/event-store.repository.js';
import { ProcessImageHandler } from '../../application/command-handlers/process-image.handler.js';
import { RegisterUserHandler } from '../../application/command-handlers/register-user.handler.js';
import { EventPublisher } from '../messaging/event-publisher.service.js';
import { ImageResultConsumer } from '../consumers/image-result.consumer.js';
import cloudinaryService from '../services/cloudinary.service.js';
import rabbitmqService from '../services/rabbitmq.service.js';

// Create a wrapper for RabbitMQ to match EventPublisher interface
class RabbitMQWrapper {
  constructor(rabbitmqService) {
    this.rabbitmqService = rabbitmqService;
  }

  async getChannel() {
    return this.rabbitmqService.channel;
  }
}

export async function setupDependencies() {
  // Initialize repositories
  const imageRepository = new ImageRepository();
  const userRepository = new UserRepository();
  const eventStoreRepository = new EventStoreRepository();

  // Initialize RabbitMQ wrapper
  const rabbitmqWrapper = new RabbitMQWrapper(rabbitmqService);

  // Initialize Event Publisher
  const eventPublisher = new EventPublisher(rabbitmqWrapper);

  // Initialize Command Handlers
  const processImageHandler = new ProcessImageHandler(
    userRepository,
    imageRepository,
    eventStoreRepository,
    eventPublisher,
    cloudinaryService
  );

  const registerUserHandler = new RegisterUserHandler(
    userRepository,
    eventStoreRepository,
    eventPublisher
  );

  const imageResultConsumer = new ImageResultConsumer(
    imageRepository,
    eventStoreRepository,
    eventPublisher
  );

  return {
    imageRepository,
    userRepository,
    eventStoreRepository,
    eventPublisher,
    processImageHandler,
    registerUserHandler,
    imageResultConsumer,
  };
}
