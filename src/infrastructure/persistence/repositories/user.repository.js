import { ConflictError } from '../../../shared/errors/index.js';
import { UserModel } from '../models/user.model.js';
import { IUserRepository } from '../../../application/interfaces/iuser.repository.js';
import { UserMapper } from '../../../application/mappers/user.mapper.js';

export class UserRepository extends IUserRepository {
  async create(user) {
    try {
      const created = await UserModel.create({
        email: user.email.toLowerCase(),
        firebase_uid: user.firebase_uid,
        full_name: user.full_name,
      });

      return UserMapper.toEntity(created);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictError('User', 'email');
      }
      throw error;
    }
  }

  async findByEmail(email) {
    const user = await UserModel.findOne({
      where: { email: email.toLowerCase() },
    });
    return user ? UserMapper.toEntity(user) : null;
  }

  async findByFirebaseUid(firebase_uid) {
    const user = await UserModel.findOne({
      where: { firebase_uid },
    });
    return user ? UserMapper.toEntity(user) : null;
  }
}
