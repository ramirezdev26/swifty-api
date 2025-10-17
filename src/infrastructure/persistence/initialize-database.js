import sequelize from '../config/database.js';
import './models/user.model.js';
import './models/image.model.js';

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    await testConnection();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
