import { UserRegisteredEvent } from '../../domain/events/user-registered.event.js';
import { User } from '../../domain/entities/user.entity.js';
import { ConflictError } from '../../shared/errors/index.js';
import { logger } from '../../infrastructure/logger/pino.config.js';

export class RegisterUserHandler {
  constructor(userRepository, eventStoreRepository, eventPublisher) {
    this.userRepository = userRepository;
    this.eventStoreRepository = eventStoreRepository;
    this.eventPublisher = eventPublisher;
  }

  /**
   * Execute register user command
   * @param {Object} command - Register user command
   * @param {Object} requestLogger - Pino logger with trace-id context (optional)
   * @returns {Promise<Object>} Registered user data
   */
  async execute(command, requestLogger = null) {
    const log = requestLogger || logger;

    try {
      log.info(
        {
          event: 'user.registration.started',
          email: command.email,
          firebaseUid: command.firebaseUid,
        },
        'User registration command received'
      );

      // 1. Verificar que el usuario no exista
      const existingUser = await this.userRepository.findByEmail(command.email);
      if (existingUser) {
        log.warn(
          {
            event: 'user.registration.failed',
            reason: 'duplicate_email',
            email: command.email,
          },
          'User already exists'
        );
        throw new ConflictError('User with this email already exists');
      }

      // 2. Crear entidad de usuario
      const userEntity = new User({
        email: command.email,
        full_name: command.fullName,
        firebase_uid: command.firebaseUid,
      });

      const savedUser = await this.userRepository.create(userEntity);

      log.info(
        {
          event: 'user.created',
          userId: savedUser.uid,
          email: savedUser.email,
        },
        'User created in database'
      );

      // 3. Crear evento de dominio
      const event = new UserRegisteredEvent(
        savedUser.uid,
        savedUser.email,
        savedUser.full_name,
        savedUser.firebase_uid
      );

      // 4. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      log.info(
        {
          event: 'event.stored',
          eventType: event.type,
          userId: savedUser.uid,
        },
        'User registered event stored'
      );

      // 5. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);

      log.info(
        {
          event: 'event.published',
          eventType: event.type,
          userId: savedUser.uid,
        },
        'User registered event published'
      );

      log.info(
        {
          event: 'user.registration.completed',
          userId: savedUser.uid,
          email: savedUser.email,
        },
        'User registration completed successfully'
      );

      return {
        uid: savedUser.uid,
        email: savedUser.email,
        full_name: savedUser.full_name,
        firebase_uid: savedUser.firebase_uid,
      };
    } catch (error) {
      if (!(error instanceof ConflictError)) {
        log.error(
          {
            event: 'user.registration.failed',
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            email: command.email,
          },
          'User registration failed'
        );
      }
      throw error;
    }
  }
}
