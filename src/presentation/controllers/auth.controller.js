import { RegisterUserCommand } from '../../application/commands/register-user.command.js';

let registerUserHandler;

export function setRegisterUserHandler(handler) {
  registerUserHandler = handler;
}

export class AuthController {
  async register(req, res, next) {
    try {
      const { email, full_name, firebase_uid } = req.body;

      const command = new RegisterUserCommand(email, full_name, firebase_uid);

      // Pass req.logger for correlation tracking
      const user = await registerUserHandler.execute(command, req.logger);

      res.status(201).json({
        message: 'User registered successfully',
        user,
      });
    } catch (error) {
      next(error);
    }
  }
}
