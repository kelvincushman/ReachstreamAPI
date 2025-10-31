/**
 * Health Check Routes
 * Endpoints for monitoring system health and dependencies
 */

const express = require('express');
const router = express.Router();
const {
  performHealthCheck,
  getHealthSummary,
  checkScraperEndpoint,
} = require('../services/healthCheckService');
const { trackSystemHealth } = require('../services/monitoringService');

/**
 * GET /health
 * Basic health check - Fast endpoint for load balancers and uptime monitors
 */
router.get('/', async (req, res) => {
  try {
    const health = await performHealthCheck(false);

    // Track health metrics in CloudWatch
    await trackSystemHealth(health);

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;

    res.status(statusCode).json({
      status: health.status,
      timestamp: health.timestamp,
      uptime_seconds: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/detailed
 * Comprehensive health check with all dependencies
 * Requires authentication to prevent abuse
 */
router.get('/detailed', async (req, res) => {
  try {
    // Check for admin/monitoring access
    const apiKey = req.headers['x-monitoring-key'];
    if (!apiKey || apiKey !== process.env.MONITORING_API_KEY) {
      return res.status(403).json({
        error: 'Monitoring access denied',
      });
    }

    const health = await performHealthCheck(true);

    // Track health metrics
    await trackSystemHealth(health);

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/summary
 * Public health summary for status page
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await getHealthSummary();

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate health summary',
      message: error.message,
    });
  }
});

/**
 * GET /health/scraper/:platform/:endpoint
 * Check specific scraper endpoint health
 */
router.get('/scraper/:platform/:endpoint', async (req, res) => {
  try {
    const { platform, endpoint } = req.params;

    const health = await checkScraperEndpoint(platform, endpoint);

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      platform: req.params.platform,
      endpoint: req.params.endpoint,
    });
  }
});

/**
 * GET /health/readiness
 * Kubernetes readiness probe
 */
router.get('/readiness', async (req, res) => {
  try {
    const health = await performHealthCheck(false);

    if (health.status === 'healthy' || health.status === 'degraded') {
      return res.status(200).json({ ready: true });
    }

    res.status(503).json({ ready: false });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

/**
 * GET /health/liveness
 * Kubernetes liveness probe
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({ alive: true });
});

module.exports = router;
