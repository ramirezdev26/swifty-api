// Import all models here (this ensures they are registered with Sequelize)
import { UserModel } from './user.model.js';
import { ImageModel } from './image.model.js';
export { UserModel, ImageModel };

// Import sequelize instance
import sequelize from '../../config/database.js';
export { sequelize };

export async function syncDatabase() {
  try {
    await sequelize.sync({ force: false, alter: false });
  } catch (error) {
    console.error('Error syncing database models:', error);
    throw error;
  }
}
