import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: process.env.PORT,
    nodeEnv: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    frontendUrl: process.env.FRONTEND_URL,
    apiPrefix: process.env.API_PREFIX,
  },
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL,
    exchange: process.env.RABBITMQ_EXCHANGE,
    dlxExchange: process.env.RABBITMQ_DLX_EXCHANGE,
    partitions: parseInt(process.env.RABBITMQ_PARTITIONS) || 3,
    messageTtl: parseInt(process.env.RABBITMQ_MESSAGE_TTL) || 300000,
    dlqTtl: parseInt(process.env.RABBITMQ_DLQ_TTL) || 86400000,
  },
};
