/**
 * RabbitMQ Metrics
 * Prometheus metrics for RabbitMQ operations
 */
import { Counter, Histogram } from 'prom-client';

/**
 * RabbitMQ Messages Published - Contador de mensajes publicados
 * Labels: event_type, status
 */
export const rabbitmqMessagesPublished = new Counter({
  name: 'swifty_api_rabbitmq_messages_published_total',
  help: 'Total number of messages published to RabbitMQ',
  labelNames: ['event_type', 'status'],
});

/**
 * RabbitMQ Publish Duration - Histograma de latencia de publicación
 * Labels: event_type
 */
export const rabbitmqPublishDuration = new Histogram({
  name: 'swifty_api_rabbitmq_publish_duration_seconds',
  help: 'Duration of RabbitMQ message publishing in seconds',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5], // 1ms to 500ms
});

/**
 * RabbitMQ Errors - Contador de errores
 * Labels: error_type
 */
export const rabbitmqErrorsTotal = new Counter({
  name: 'swifty_api_rabbitmq_errors_total',
  help: 'Total number of RabbitMQ errors',
  labelNames: ['error_type'],
});
