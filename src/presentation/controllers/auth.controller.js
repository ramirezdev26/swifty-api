import { CreateUserDTO } from '../../application/dtos/user.dto.js';
import { UserRepository } from '../../infrastructure/persistence/repositories/user.repository.js';
import { RegisterUserUseCase } from '../../application/use-cases/user/register-user.usecase.js';

export class AuthController {
  constructor() {
    this.userRepository = new UserRepository();
    this.registerUserUseCase = new RegisterUserUseCase(this.userRepository);
  }

  async register(req, res, next) {
    try {
      const { email, full_name, firebase_uid } = req.body;

      const firebaseUser = {
        email,
        firebase_uid,
      };

      const createUserDto = CreateUserDTO.fromRequest({ email, full_name }, firebaseUser);
      const user = await this.registerUserUseCase.execute(createUserDto);

      res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
