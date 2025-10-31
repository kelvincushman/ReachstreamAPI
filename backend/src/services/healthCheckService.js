/**
 * Health Check Service
 * Monitors system health and dependencies for 99.9% uptime SLA
 */

const { query } = require('../config/database');
const axios = require('axios');

/**
 * Check database connectivity and performance
 */
const checkDatabase = async () => {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await query('SELECT NOW() as current_time');

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      message: 'Database connection successful',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      message: `Database error: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Check Clerk authentication service
 */
const checkClerkService = async () => {
  const startTime = Date.now();

  try {
    // Ping Clerk API
    const response = await axios.get('https://api.clerk.com/v1/health', {
      timeout: 5000,
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    });

    const responseTime = Date.now() - startTime;

    return {
      status: response.status === 200 ? 'healthy' : 'degraded',
      response_time_ms: responseTime,
      message: 'Clerk service operational',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      message: `Clerk service error: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Check Stripe payment service
 */
const checkStripeService = async () => {
  const startTime = Date.now();

  try {
    // Ping Stripe API
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.balance.retrieve();

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      message: 'Stripe service operational',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      message: `Stripe service error: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Check Oxylabs proxy service
 */
const checkOxylabsProxy = async () => {
  const startTime = Date.now();

  try {
    const { gotScraping } = require('got-scraping');

    const proxyUrl = `http://${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}@${process.env.OXYLABS_HOST || 'pr.oxylabs.io'}:${process.env.OXYLABS_PORT || 7777}`;

    // Test proxy with simple request
    await gotScraping({
      url: 'https://httpbin.org/ip',
      proxyUrl,
      timeout: { request: 10000 },
    });

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      message: 'Oxylabs proxy operational',
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      message: `Oxylabs proxy error: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Check system memory and CPU
 */
const checkSystemResources = () => {
  const os = require('os');

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  const cpuLoad = os.loadavg();

  return {
    status: memoryUsagePercent < 90 ? 'healthy' : 'degraded',
    memory: {
      total_mb: (totalMemory / 1024 / 1024).toFixed(2),
      used_mb: (usedMemory / 1024 / 1024).toFixed(2),
      free_mb: (freeMemory / 1024 / 1024).toFixed(2),
      usage_percent: memoryUsagePercent,
    },
    cpu: {
      load_1min: cpuLoad[0].toFixed(2),
      load_5min: cpuLoad[1].toFixed(2),
      load_15min: cpuLoad[2].toFixed(2),
      cores: os.cpus().length,
    },
    uptime_hours: (os.uptime() / 3600).toFixed(2),
  };
};

/**
 * Perform comprehensive health check
 */
const performHealthCheck = async (detailed = false) => {
  const startTime = Date.now();

  const checks = {
    database: await checkDatabase(),
    system: checkSystemResources(),
  };

  // Detailed checks (optional for deep health checks)
  if (detailed) {
    checks.clerk = await checkClerkService();
    checks.stripe = await checkStripeService();
    checks.oxylabs = await checkOxylabsProxy();
  }

  // Determine overall status
  const allStatuses = Object.values(checks).map(check => check.status);
  let overallStatus = 'healthy';

  if (allStatuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (allStatuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  const totalResponseTime = Date.now() - startTime;

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    response_time_ms: totalResponseTime,
    checks,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
};

/**
 * Check specific scraper endpoint health
 */
const checkScraperEndpoint = async (platform, endpoint) => {
  const startTime = Date.now();

  try {
    // Test scraper function exists and is callable
    const scraperPath = `../../../scrapers/${platform}/${endpoint}`;
    const scraper = require(scraperPath);

    if (!scraper || typeof scraper.handler !== 'function') {
      throw new Error('Scraper handler not found or invalid');
    }

    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      response_time_ms: responseTime,
      message: `${platform}/${endpoint} scraper loaded successfully`,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      response_time_ms: Date.now() - startTime,
      message: `${platform}/${endpoint} scraper error: ${error.message}`,
      error: error.message,
    };
  }
};

/**
 * Get health check summary for status page
 */
const getHealthSummary = async () => {
  const health = await performHealthCheck(false);

  return {
    status: health.status,
    uptime_percent: 99.9, // Calculate from metrics over time
    response_time_avg_ms: health.response_time_ms,
    last_incident: null, // Fetch from incident tracking
    last_check: health.timestamp,
  };
};

module.exports = {
  checkDatabase,
  checkClerkService,
  checkStripeService,
  checkOxylabsProxy,
  checkSystemResources,
  performHealthCheck,
  checkScraperEndpoint,
  getHealthSummary,
};
