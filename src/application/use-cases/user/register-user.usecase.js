import { UserMapper } from '../../mappers/user.mapper.js';
import { ConflictError } from '../../../shared/errors/conflict.error.js';
import { logger } from '../../../infrastructure/logger/pino.config.js';

export class RegisterUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Register new user in the system
   * @param {Object} createUserDto - User creation data
   * @param {Object} requestLogger - Pino logger with trace-id context (optional)
   * @returns {Promise<Object>} Registered user DTO
   */
  async execute(createUserDto, requestLogger = null) {
    const log = requestLogger || logger;

    try {
      log.info(
        {
          event: 'user.registration.started',
          email: createUserDto.email,
          fullName: createUserDto.full_name,
        },
        'User registration initiated'
      );

      const existingUser = await this.userRepository.findByEmail(createUserDto.email);
      if (existingUser) {
        log.warn(
          {
            event: 'user.registration.failed',
            reason: 'duplicate_email',
            email: createUserDto.email,
          },
          'User registration failed - email already exists'
        );
        throw new ConflictError('User', 'email');
      }

      const userEntity = UserMapper.toEntity(createUserDto);

      const savedUser = await this.userRepository.create(userEntity);

      log.info(
        {
          event: 'user.registration.completed',
          userId: savedUser.uid,
          email: savedUser.email,
        },
        'User registered successfully'
      );

      return UserMapper.toDTO(savedUser);
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
            email: createUserDto.email,
          },
          'User registration failed'
        );
      }
      throw error;
    }
  }
}
