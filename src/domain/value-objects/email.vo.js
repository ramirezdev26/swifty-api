import { ValidationError } from '../../shared/errors/validation.error.js';

export class Email {
  constructor(value) {
    this.validate(value);
    this._value = value.toLowerCase();
  }

  validate(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }

  get value() {
    return this._value;
  }

  toString() {
    return this._value;
  }
}
