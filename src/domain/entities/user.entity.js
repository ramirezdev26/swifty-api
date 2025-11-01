import { Email } from '../value-objects/email.vo.js';
import { ValidationError } from '../../shared/errors/index.js';

export class User {
  constructor({ email, firebase_uid, full_name = null, uid = null }) {
    this._email = new Email(email);
    this._firebase_uid = firebase_uid;
    this._full_name = full_name;
    this._uid = uid;
  }

  validateFullName(full_name) {
    if (full_name && full_name.length < 2) {
      throw new ValidationError('Full name must be at least 2 characters long');
    }
  }

  get email() {
    return this._email.value;
  }

  get full_name() {
    return this._full_name;
  }

  get uid() {
    return this._uid;
  }

  get firebase_uid() {
    return this._firebase_uid;
  }
}
