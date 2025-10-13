import { UserMapper } from '../../mappers/user.mapper.js';
import { ConflictError } from '../../../shared/errors/conflict.error.js';

export class RegisterUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(createUserDto) {
    const existingUser = await this.userRepository.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictError('User', 'email');
    }

    const userEntity = UserMapper.toEntity(createUserDto);

    const savedUser = await this.userRepository.create(userEntity);

    return UserMapper.toDTO(savedUser);
  }
}
