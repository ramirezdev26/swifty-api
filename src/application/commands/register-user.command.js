export class RegisterUserCommand {
  constructor(email, fullName, firebaseUid) {
    this.email = email;
    this.fullName = fullName;
    this.firebaseUid = firebaseUid;
  }
}
