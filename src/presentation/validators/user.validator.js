import Joi from 'joi';
import { ValidationError } from '../../shared/errors/validation.error.js';

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Invalid email format',
    'any.required': 'Email is required',
  }),
  full_name: Joi.string().min(2).allow(null, '').messages({
    'string.min': 'Full name must be at least 2 characters long',
  }),
});

export const validateRegisterInput = (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((err) => ({
        field: err.path[0],
        message: err.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }

    next();
  } catch (error) {
    next(error);
  }
};
