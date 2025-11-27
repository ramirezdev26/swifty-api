import { createInstrumentedSequelize } from '../persistence/instrumented-sequelize.js';
import { config } from './env.js';

const sequelize = createInstrumentedSequelize({
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,
  host: config.database.host,
  port: config.database.port,
  dialect: 'postgres',
  logging: false, // Using Pino for logging
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

export default sequelize;
