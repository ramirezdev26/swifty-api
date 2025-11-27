/**
 * Business Metrics
 * Prometheus metrics for business-level operations
 */
import { Counter, Histogram, Gauge } from 'prom-client';

/**
 * Image Uploads Total - Contador de uploads
 * Labels: style, status (success, failed)
 */
export const imageUploadsTotal = new Counter({
  name: 'swifty_api_image_uploads_total',
  help: 'Total number of image uploads',
  labelNames: ['style', 'status'],
});

/**
 * Image Upload Size - Histograma de tamaño de archivos
 * Labels: style
 */
export const imageUploadSize = new Histogram({
  name: 'swifty_api_image_upload_size_bytes',
  help: 'Size of uploaded images in bytes',
  labelNames: ['style'],
  buckets: [10000, 50000, 100000, 500000, 1000000, 5000000, 10000000], // 10KB to 10MB
});

/**
 * User Registrations Total - Contador de registros
 */
export const userRegistrationsTotal = new Counter({
  name: 'swifty_api_user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status'],
});

/**
 * Active Users - Gauge de usuarios activos (últimos 5 min)
 */
export const activeUsers = new Gauge({
  name: 'swifty_api_active_users',
  help: 'Number of active users in the last 5 minutes',
});

/**
 * Image Processing Duration - Histograma de tiempo de procesamiento completo
 * Labels: style
 */
export const imageProcessingDuration = new Histogram({
  name: 'swifty_api_image_processing_duration_seconds',
  help: 'Duration of complete image processing flow',
  labelNames: ['style'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // 100ms to 60s
});
