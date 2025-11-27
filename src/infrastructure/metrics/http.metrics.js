/**
 * HTTP Metrics
 * Prometheus metrics for HTTP requests
 */
import { Histogram, Counter, Gauge } from 'prom-client';

/**
 * HTTP Request Duration - Histograma de latencia
 * Labels: method, route, status_code
 */
export const httpRequestDuration = new Histogram({
  name: 'swifty_api_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // 5ms to 10s
});

/**
 * HTTP Requests Total - Contador de requests
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
  name: 'swifty_api_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

/**
 * HTTP Errors Total - Contador de errores
 * Labels: type, route
 */
export const httpErrorsTotal = new Counter({
  name: 'swifty_api_http_errors_total',
  help: 'Total number of HTTP errors',
  labelNames: ['type', 'route'],
});

/**
 * Active HTTP Connections - Gauge de conexiones activas
 */
export const httpActiveConnections = new Gauge({
  name: 'swifty_api_http_active_connections',
  help: 'Number of active HTTP connections',
});
