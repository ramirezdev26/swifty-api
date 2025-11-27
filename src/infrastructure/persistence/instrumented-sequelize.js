/**
 * Instrumented Sequelize
 * Wraps Sequelize with Prometheus metrics
 */
import { Sequelize } from 'sequelize';
import {
  dbQueryDuration,
  dbQueriesTotal,
  dbActiveConnections,
  dbPoolSize,
  dbErrorsTotal,
} from '../metrics/database.metrics.js';
import { logger } from '../logger/pino.config.js';

/**
 * Detecta tipo de operación SQL
 * @param {string} sql - SQL query
 * @returns {string} Operation type (SELECT, INSERT, UPDATE, DELETE, OTHER)
 */
function detectOperation(sql) {
  if (!sql || typeof sql !== 'string') return 'OTHER';
  const upperSql = sql.trim().toUpperCase();
  if (upperSql.startsWith('SELECT')) return 'SELECT';
  if (upperSql.startsWith('INSERT')) return 'INSERT';
  if (upperSql.startsWith('UPDATE')) return 'UPDATE';
  if (upperSql.startsWith('DELETE')) return 'DELETE';
  return 'OTHER';
}

/**
 * Extrae nombre de tabla del SQL
 * @param {string} sql - SQL query
 * @returns {string|null} Table name
 */
function detectTable(sql) {
  if (!sql || typeof sql !== 'string') return null;
  const match =
    sql.match(/FROM\s+["`]?(\w+)["`]?/i) ||
    sql.match(/INTO\s+["`]?(\w+)["`]?/i) ||
    sql.match(/UPDATE\s+["`]?(\w+)["`]?/i);
  return match ? match[1] : null;
}

/**
 * Crea instancia de Sequelize instrumentada con métricas
 * @param {Object} config - Sequelize configuration
 * @returns {Sequelize} Instrumented Sequelize instance
 */
export const createInstrumentedSequelize = (config) => {
  const sequelize = new Sequelize(config);

  // Actualizar métricas de pool
  const updatePoolMetrics = () => {
    try {
      const pool = sequelize.connectionManager.pool;
      if (pool) {
        dbActiveConnections.set(pool.size - pool.available);
        dbPoolSize.set(pool.size);
      }
    } catch (error) {
      // Pool might not be initialized yet
    }
  };

  // Hook: antes de cada query
  sequelize.addHook('beforeQuery', (options) => {
    options.startTime = Date.now();
    updatePoolMetrics();
  });

  // Hook: después de cada query exitosa
  sequelize.addHook('afterQuery', (options) => {
    // Skip if no SQL query (e.g., connection checks)
    if (!options || !options.sql || !options.startTime) return;

    const duration = (Date.now() - options.startTime) / 1000;
    const operation = detectOperation(options.sql);
    const table = detectTable(options.sql);

    const labels = {
      operation,
      table: table || 'unknown',
    };

    // Registrar duración
    dbQueryDuration.observe(labels, duration);

    // Incrementar contador
    dbQueriesTotal.inc({
      ...labels,
      status: 'success',
    });

    updatePoolMetrics();

    // Log si es query lenta (>100ms)
    if (duration > 0.1) {
      logger.warn(
        {
          event: 'database.slow_query',
          duration: duration * 1000,
          operation,
          table,
          sql: options.sql.substring(0, 200), // Truncar para logs
        },
        `Slow database query detected: ${duration * 1000}ms`
      );
    }
  });

  // Hook: error en query
  sequelize.addHook('afterQuery', (options, error) => {
    if (error && options && options.sql) {
      const operation = detectOperation(options.sql);
      const table = detectTable(options.sql);

      dbErrorsTotal.inc({
        type: error.constructor.name,
        table: table || 'unknown',
      });

      dbQueriesTotal.inc({
        operation,
        table: table || 'unknown',
        status: 'error',
      });

      updatePoolMetrics();
    }
  });

  return sequelize;
};
