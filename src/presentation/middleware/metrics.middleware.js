/**
 * Metrics Middleware
 * Collects HTTP metrics for Prometheus
 */
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpErrorsTotal,
  httpActiveConnections,
} from '../../infrastructure/metrics/http.metrics.js';

/**
 * Normaliza rutas para evitar alta cardinalidad
 * Ejemplo: /api/images/123 -> /api/images/:id
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizeRoute(path) {
  if (!path) return 'unknown';

  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUIDs
    .replace(/\/[0-9]+/g, '/:id') // IDs numéricos
    .replace(/\?.*/g, ''); // Query params
}

/**
 * Middleware para recolectar métricas HTTP
 */
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  // Incrementar conexiones activas
  httpActiveConnections.inc();

  // Normalizar ruta para evitar alta cardinalidad
  const route = normalizeRoute(req.route?.path || req.path);

  // Capturar cuando la respuesta termina
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convertir a segundos
    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode,
    };

    // Registrar duración
    httpRequestDuration.observe(labels, duration);

    // Incrementar contador de requests
    httpRequestsTotal.inc(labels);

    // Decrementar conexiones activas
    httpActiveConnections.dec();
  });

  next();
};

/**
 * Middleware para capturar errores y registrar métricas
 */
export const errorMetricsMiddleware = (err, req, res, next) => {
  const route = normalizeRoute(req.route?.path || req.path);

  httpErrorsTotal.inc({
    type: err.constructor.name || 'Error',
    route: route,
  });

  next(err);
};
