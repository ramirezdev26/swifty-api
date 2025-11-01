import Joi from 'joi';
import { ValidationError } from '../../shared/errors/index.js';

const processImageSchema = Joi.object({
  style: Joi.string()
    .valid('oil-painting', 'pixel-art', 'cartoon', 'realism', 'anime')
    .required()
    .messages({
      'string.empty': 'Style is required',
      'any.only': 'Style must be one of: oil-painting, pixel-art, cartoon, realism, anime',
      'any.required': 'Style is required',
    }),
}).options({ stripUnknown: true });

const getProcessedImagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(12).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must be at most 100',
  }),
}).options({ stripUnknown: true });

export const validateProcessImageInput = (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('Image file is required');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new ValidationError('Only JPEG and PNG images are allowed');
    }

    const maxSize = 10 * 1024 * 1024;
    if (req.file.size > maxSize) {
      throw new ValidationError('Image size must be less than 10MB');
    }

    const { error } = processImageSchema.validate(req.body, { abortEarly: false });
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

export const validateGetProcessedImagesInput = (req, res, next) => {
  try {
    const { error, value } = getProcessedImagesSchema.validate(req.query, { abortEarly: false });
    if (error) {
      const errors = error.details.map((err) => ({
        field: err.path[0],
        message: err.message,
      }));
      throw new ValidationError('Validation failed', errors);
    }

    Object.assign(req.query, value);
    next();
  } catch (error) {
    next(error);
  }
};
