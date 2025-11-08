import { UserRegisteredEvent } from '../../domain/events/user-registered.event.js';
import { User } from '../../domain/entities/user.entity.js';
import { ConflictError } from '../../shared/errors/index.js';

export class RegisterUserHandler {
  constructor(userRepository, eventStoreRepository, eventPublisher) {
    this.userRepository = userRepository;
    this.eventStoreRepository = eventStoreRepository;
    this.eventPublisher = eventPublisher;
  }

  async execute(command) {
    try {
      // 1. Verificar que el usuario no exista
      const existingUser = await this.userRepository.findByEmail(command.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // 2. Crear entidad de usuario
      const userEntity = new User({
        email: command.email,
        full_name: command.fullName,
        firebase_uid: command.firebaseUid,
      });

      const savedUser = await this.userRepository.create(userEntity);

      // 3. Crear evento de dominio
      const event = new UserRegisteredEvent(
        savedUser.uid,
        savedUser.email,
        savedUser.full_name,
        savedUser.firebase_uid
      );

      // 4. Persistir evento en Event Store
      await this.eventStoreRepository.append(event);

      // 5. Publicar evento a RabbitMQ
      await this.eventPublisher.publish(event);

      return {
        uid: savedUser.uid,
        email: savedUser.email,
        full_name: savedUser.full_name,
        firebase_uid: savedUser.firebase_uid,
      };
    } catch (error) {
      console.error('[RegisterUserHandler] Error:', error);
      throw error;
    }
  }
}
