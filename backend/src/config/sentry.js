/**
 * Sentry Error Tracking Configuration
 * Real-time error monitoring and alerting
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry
 */
const initSentry = (app) => {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new ProfilingIntegration(),

      // Additional context
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers['x-api-key'];
        delete event.request.headers.cookie;
      }

      // Remove API keys from query params
      if (event.request?.query_string) {
        event.request.query_string = event.request.query_string.replace(
          /api_key=[^&]*/g,
          'api_key=***'
        );
      }

      return event;
    },

    // Ignore common non-critical errors
    ignoreErrors: [
      'AbortError',
      'NetworkError',
      'TimeoutError',
      /ECONNREFUSED/,
      /ETIMEDOUT/,
    ],
  });

  console.log('Sentry error tracking initialized');
};

/**
 * Capture exception with context
 */
const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    user: context.user || {},
    level: context.level || 'error',
  });
};

/**
 * Capture message with context
 */
const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, {
    level,
    tags: context.tags || {},
    extra: context.extra || {},
  });
};

/**
 * Set user context
 */
const setUser = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

/**
 * Add breadcrumb for debugging
 */
const addBreadcrumb = (message, category, level = 'info', data = {}) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
};

/**
 * Track scraper error
 */
const trackScraperError = (platform, endpoint, error, context = {}) => {
  captureException(error, {
    tags: {
      platform,
      endpoint,
      error_type: 'scraper_error',
    },
    extra: {
      ...context,
      platform,
      endpoint,
    },
  });
};

/**
 * Track API error
 */
const trackApiError = (method, path, statusCode, error, context = {}) => {
  captureException(error, {
    tags: {
      method,
      path,
      status_code: statusCode,
      error_type: 'api_error',
    },
    extra: {
      ...context,
      method,
      path,
      statusCode,
    },
  });
};

/**
 * Track payment error
 */
const trackPaymentError = (userId, error, context = {}) => {
  captureException(error, {
    tags: {
      error_type: 'payment_error',
      user_id: userId,
    },
    extra: {
      ...context,
      userId,
    },
    level: 'critical',
  });
};

/**
 * Track database error
 */
const trackDatabaseError = (query, error, context = {}) => {
  captureException(error, {
    tags: {
      error_type: 'database_error',
    },
    extra: {
      ...context,
      query: query?.substring(0, 200), // Truncate long queries
    },
    level: 'error',
  });
};

/**
 * Express error handler middleware
 */
const errorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors with status >= 500
      return error.status >= 500;
    },
  });
};

/**
 * Express request handler middleware
 */
const requestHandler = () => {
  return Sentry.Handlers.requestHandler({
    user: ['id', 'email', 'username'],
    ip: true,
    transaction: 'methodPath',
  });
};

/**
 * Express tracing handler middleware
 */
const tracingHandler = () => {
  return Sentry.Handlers.tracingHandler();
};

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  trackScraperError,
  trackApiError,
  trackPaymentError,
  trackDatabaseError,
  errorHandler,
  requestHandler,
  tracingHandler,
};
