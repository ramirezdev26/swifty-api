/**
 * Prometheus Configuration
 * Configures prom-client with default system metrics
 */
import { register, collectDefaultMetrics } from 'prom-client';

// Configure default metrics collection (CPU, memory, event loop, etc.)
collectDefaultMetrics({
  prefix: 'swifty_api_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
  eventLoopMonitoringPrecision: 10, // Event loop monitoring precision in ms
  timeout: 10000, // Collect metrics every 10 seconds
});

// Export register for use in /metrics endpoint
export { register };
