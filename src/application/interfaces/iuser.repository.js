export class IUserRepository {
  async create(userData) {
    if (!userData) throw new Error('Method not implemented');
    throw new Error('Method not implemented');
  }

  async findById(userId) {
    this._userId = userId;
    throw new Error('Method not implemented');
  }
}
