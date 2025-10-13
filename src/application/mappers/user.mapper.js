import { User } from '../../domain/entities/user.entity.js';
import { UserResponseDTO } from '../dtos/user.dto.js';

export class UserMapper {
  static toEntity(data, id = null) {
    return new User({
      id: data.id || id,
      email: data.email,
      full_name: data.full_name,
      firebase_uid: data.firebase_uid,
    });
  }

  static toDTO(user) {
    return new UserResponseDTO({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      firebase_uid: user.firebase_uid,
    });
  }
}
