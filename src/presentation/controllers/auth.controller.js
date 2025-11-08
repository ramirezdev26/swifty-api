import { RegisterUserCommand } from '../../application/commands/register-user.command.js';

let registerUserHandler;

export function setRegisterUserHandler(handler) {
  registerUserHandler = handler;
}

export class AuthController {
  async register(req, res, next) {
    try {
      const { email, full_name } = req.body;
      const firebaseUser = req.user;

      const command = new RegisterUserCommand(email, full_name, firebaseUser.uid);
      const user = await registerUserHandler.execute(command);

      res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
