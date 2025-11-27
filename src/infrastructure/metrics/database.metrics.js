/**
 * Database Metrics
 * Prometheus metrics for PostgreSQL operations
 */
import { Histogram, Counter, Gauge } from 'prom-client';

/**
 * Database Query Duration - Histograma de latencia de queries
 * Labels: operation (SELECT, INSERT, UPDATE, DELETE), table
 */
export const dbQueryDuration = new Histogram({
  name: 'swifty_api_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1], // 1ms to 1s
});

/**
 * Database Queries Total - Contador de queries
 * Labels: operation, table, status
 */
export const dbQueriesTotal = new Counter({
  name: 'swifty_api_database_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
});

/**
 * Database Active Connections - Gauge de conexiones activas
 */
export const dbActiveConnections = new Gauge({
  name: 'swifty_api_database_active_connections',
  help: 'Number of active database connections',
});

/**
 * Database Pool Size - Gauge de tamaño del pool
 */
export const dbPoolSize = new Gauge({
  name: 'swifty_api_database_pool_size',
  help: 'Size of the database connection pool',
});

/**
 * Database Errors Total - Contador de errores
 * Labels: type, table
 */
export const dbErrorsTotal = new Counter({
  name: 'swifty_api_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['type', 'table'],
});
