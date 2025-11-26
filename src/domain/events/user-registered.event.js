import { DomainEvent } from './base.event.js';

export class UserRegisteredEvent extends DomainEvent {
  constructor(userId, email, fullName, firebaseUid) {
    super('UserRegisteredEvent', userId, 'User', { userId, email, fullName, firebaseUid }, userId);
  }
}
