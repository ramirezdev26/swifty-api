/**
 * Metrics Routes
 * Exposes Prometheus metrics endpoint
 */
import { Router } from 'express';
import { register } from '../../infrastructure/metrics/prometheus.config.js';

const router = Router();

/**
 * GET /metrics - Endpoint para Prometheus
 * Retorna todas las métricas en formato Prometheus
 */
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

export default router;
