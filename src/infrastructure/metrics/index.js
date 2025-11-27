/**
 * Metrics Index
 * Centralized export of all Prometheus metrics
 */

// Prometheus configuration
export { register } from './prometheus.config.js';

// HTTP Metrics
export {
  httpRequestDuration,
  httpRequestsTotal,
  httpErrorsTotal,
  httpActiveConnections,
} from './http.metrics.js';

// Database Metrics
export {
  dbQueryDuration,
  dbQueriesTotal,
  dbActiveConnections,
  dbPoolSize,
  dbErrorsTotal,
} from './database.metrics.js';

// RabbitMQ Metrics
export {
  rabbitmqMessagesPublished,
  rabbitmqPublishDuration,
  rabbitmqErrorsTotal,
} from './rabbitmq.metrics.js';

// Business Metrics
export {
  imageUploadsTotal,
  imageUploadSize,
  imageProcessingDuration,
  userRegistrationsTotal,
  activeUsers,
} from './business.metrics.js';
