# Express.js Best Practices Audit Report
## ReachstreamAPI Backend

**Audit Date:** 2025-10-31
**Auditor:** Claude Code (Express.js Expert)
**Severity Levels:** 🔴 Critical | 🟡 Warning | 🟢 Good Practice | ℹ️ Info

---

## Executive Summary

The ReachstreamAPI backend demonstrates solid fundamentals with proper authentication, security middleware, and RESTful design. However, there are several areas where Express.js best practices can be improved for production readiness, particularly around error handling, performance optimization, and security hardening.

**Overall Score: 7.5/10**

---

## 1. Middleware Chain Analysis

### 🟢 Current Strengths

✅ **Security middleware properly ordered** (helmet → CORS → body parsers)
✅ **Rate limiting implemented** with configurable limits
✅ **Request logging middleware** for basic tracking
✅ **Authentication middleware** with dual support (Clerk JWT + API Keys)

### 🔴 Critical Issues

#### Issue 1.1: Missing Request Size Limits
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:41-42`

```javascript
// Current - NO SIZE LIMITS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**Risk:** Vulnerable to DoS attacks via large JSON payloads.

**Fix:**
```javascript
// Add size limits to prevent DoS attacks
app.use(express.json({
  limit: '10mb',
  strict: true,
  verify: (req, res, buf, encoding) => {
    // Verify JSON is valid before parsing
    if (buf.length > 0) {
      try {
        JSON.parse(buf);
      } catch (e) {
        throw new Error('Invalid JSON');
      }
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000 // Prevent parameter pollution
}));
```

#### Issue 1.2: Missing Compression Middleware
**File:** `/home/user/ReachstreamAPI/backend/src/server.js`

**Impact:** Responses are not compressed, wasting bandwidth and slowing down API responses.

**Fix:**
```javascript
const compression = require('compression');

// Add after helmet, before CORS
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9)
  threshold: 1024 // Only compress responses > 1KB
}));
```

#### Issue 1.3: Webhook Route Breaking Middleware Order
**File:** `/home/user/ReachstreamAPI/backend/src/routes/credits.js:126`

```javascript
// PROBLEMATIC: Raw body parser inline
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
```

**Problem:** This breaks the global middleware chain. Stripe webhooks need raw body, but this should be handled at the app level.

**Fix in server.js:**
```javascript
// Before JSON parsing middleware
app.use('/api/credits/webhook', express.raw({ type: 'application/json' }));

// Then normal middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### 🟡 Warnings

#### Warning 1.1: Basic Request Logging
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:60-64`

```javascript
// Current - Basic console logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});
```

**Improvement:** Use production-grade logging with morgan + winston:

```javascript
const morgan = require('morgan');
const winston = require('winston');

// Winston logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Morgan middleware
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
  skip: (req) => req.path === '/health' // Skip health check logs
}));
```

#### Warning 1.2: Missing Request ID Tracking
**Impact:** Cannot trace requests through distributed systems.

**Fix:**
```javascript
const { v4: uuidv4 } = require('uuid');

// Request ID middleware (add early in chain)
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

#### Warning 1.3: Missing Response Time Header
**Fix:**
```javascript
const responseTime = require('response-time');

app.use(responseTime((req, res, time) => {
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
  // Log slow requests
  if (time > 1000) {
    logger.warn(`Slow request: ${req.method} ${req.path} - ${time}ms`);
  }
}));
```

### ℹ️ Recommended Additions

```javascript
// Additional security middleware
const mongoSanitize = require('express-mongo-sanitize'); // Even for PostgreSQL
const hpp = require('hpp'); // HTTP Parameter Pollution
const xss = require('xss-clean'); // XSS sanitization

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp({
  whitelist: ['limit', 'offset', 'sort', 'filter'] // Allow duplicate params
}));

// XSS protection
app.use(xss());
```

---

## 2. Routing Patterns Analysis

### 🟢 Current Strengths

✅ **RESTful conventions** followed consistently
✅ **Route organization** by resource (auth, credits, apiKeys, scrape)
✅ **Express Router** properly used for modularity
✅ **Clear endpoint documentation** in code

### 🟡 Warnings

#### Warning 2.1: Inconsistent Error Handling Pattern
**File:** Multiple route files

**Problem:** Routes have try-catch blocks but error handling is manual and repetitive.

**Current Pattern:**
```javascript
router.get('/balance', verifyClerkToken, async (req, res) => {
  try {
    const balance = await creditService.getCreditBalance(req.user.id);
    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Get credit balance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credit balance',
      message: error.message,
    });
  }
});
```

**Fix:** Create async error wrapper utility:

**Create `/home/user/ReachstreamAPI/backend/src/utils/asyncHandler.js`:**
```javascript
/**
 * Async error handler wrapper
 * Eliminates need for try-catch in every route
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

**Updated Route Pattern:**
```javascript
const asyncHandler = require('../utils/asyncHandler');

router.get('/balance', verifyClerkToken, asyncHandler(async (req, res) => {
  const balance = await creditService.getCreditBalance(req.user.id);
  res.json({ success: true, data: balance });
}));
```

#### Warning 2.2: Manual Parameter Validation
**File:** `/home/user/ReachstreamAPI/backend/src/routes/scrape.js` (all routes)

**Current:**
```javascript
if (!username) {
  return res.status(400).json({
    success: false,
    error: 'Missing required parameter: username',
  });
}
```

**Fix:** Use express-validator (already in package.json):

**Create `/home/user/ReachstreamAPI/backend/src/middleware/validators.js`:**
```javascript
const { query, param, body, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Reusable validators
const validators = {
  tiktokProfile: [
    query('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9._]+$/).withMessage('Username contains invalid characters'),
    validate
  ],

  paginationQuery: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('offset')
      .optional()
      .isInt({ min: 0 }).withMessage('Offset must be >= 0')
      .toInt(),
    validate
  ],

  apiKeyCreate: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
    body('expires_at')
      .optional()
      .isISO8601().withMessage('Invalid date format')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
        return true;
      }),
    validate
  ]
};

module.exports = validators;
```

**Updated Route:**
```javascript
const validators = require('../middleware/validators');

router.get('/tiktok/profile',
  verifyApiKey,
  validators.tiktokProfile,  // ← Validation middleware
  logApiRequest,
  afterRequest('tiktok', 'profile'),
  asyncHandler(async (req, res) => {
    // No need for manual validation
    const { username } = req.query;
    const result = await scrapeTikTokProfile(username);
    res.status(result.success ? 200 : 500).json(result);
  })
);
```

#### Warning 2.3: Response Format Inconsistency
**Issue:** Some routes return `{ success, data }`, others include different fields.

**Fix:** Create standardized response utility:

**Create `/home/user/ReachstreamAPI/backend/src/utils/apiResponse.js`:**
```javascript
class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data, message = 'Resource created') {
    return this.success(res, data, message, 201);
  }

  static error(res, error, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  static paginated(res, data, pagination) {
    return res.json({
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / (pagination.limit || 10)),
        hasNext: pagination.page * pagination.limit < pagination.total,
        hasPrev: pagination.page > 1
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;
```

---

## 3. Error Handling Analysis

### 🔴 Critical Issues

#### Issue 3.1: No Centralized Error Classes
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:181-193`

**Current:**
```javascript
// Generic error handler with no error classification
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: err.name || 'Error',
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});
```

**Fix:** Create custom error classes:

**Create `/home/user/ReachstreamAPI/backend/src/utils/errors.js`:**
```javascript
/**
 * Base API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 - Bad Request
 */
class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400);
    this.name = 'BadRequestError';
    this.details = details;
  }
}

/**
 * 401 - Unauthorized
 */
class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 402 - Payment Required
 */
class PaymentRequiredError extends ApiError {
  constructor(message = 'Insufficient credits', creditsNeeded = 1) {
    super(message, 402);
    this.name = 'PaymentRequiredError';
    this.creditsNeeded = creditsNeeded;
  }
}

/**
 * 403 - Forbidden
 */
class ForbiddenError extends ApiError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 - Not Found
 */
class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 409 - Conflict
 */
class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * 422 - Unprocessable Entity
 */
class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * 429 - Too Many Requests
 */
class RateLimitError extends ApiError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * 500 - Internal Server Error
 */
class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, false); // Not operational
    this.name = 'InternalServerError';
  }
}

/**
 * 503 - Service Unavailable
 */
class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503);
    this.name = 'ServiceUnavailableError';
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
};
```

**Create `/home/user/ReachstreamAPI/backend/src/middleware/errorHandler.js`:**
```javascript
const winston = require('winston');
const { ApiError } = require('../utils/errors');

// Winston logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

/**
 * Convert unknown errors to ApiError
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';
    error = new ApiError(message, statusCode, false);
  }

  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message, isOperational } = err;

  // Log error
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode,
    message,
    userId: req.user?.id || 'anonymous',
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  if (!isOperational) {
    // Log full error for non-operational errors
    logger.error('Unexpected error', { ...logData, stack: err.stack });
  } else {
    logger.error('Operational error', logData);
  }

  // Send error response
  if (process.env.NODE_ENV === 'production' && !isOperational) {
    // Don't leak error details in production for non-operational errors
    statusCode = 500;
    message = 'Internal server error';
  }

  const response = {
    success: false,
    error: err.name || 'Error',
    message,
    timestamp: err.timestamp || new Date().toISOString(),
    requestId: req.id
  };

  // Add optional fields
  if (err.details) response.details = err.details;
  if (err.errors) response.errors = err.errors;
  if (err.creditsNeeded) response.creditsNeeded = err.creditsNeeded;
  if (err.retryAfter) response.retryAfter = err.retryAfter;

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
const notFound = (req, res, next) => {
  const error = new ApiError(`Cannot ${req.method} ${req.originalUrl}`, 404);
  next(error);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    // Don't exit process in production, but log for monitoring
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    // Exit process for uncaught exceptions
    process.exit(1);
  });
};

module.exports = {
  errorConverter,
  errorHandler,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException
};
```

**Update server.js:**
```javascript
const {
  errorConverter,
  errorHandler,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/errorHandler');

// ... routes ...

// 404 handler - MUST come after all routes
app.use(notFound);

// Error converter
app.use(errorConverter);

// Global error handler - MUST be last
app.use(errorHandler);

// Handle unhandled rejections and exceptions
handleUnhandledRejection();
handleUncaughtException();
```

**Usage in routes:**
```javascript
const {
  UnauthorizedError,
  PaymentRequiredError,
  NotFoundError
} = require('../utils/errors');

// In auth middleware
if (!apiKey) {
  throw new UnauthorizedError('No API key provided in x-api-key header');
}

// In credit checking
if (matchedUser.credits_balance <= 0) {
  throw new PaymentRequiredError('Your credit balance is 0. Please purchase more credits.');
}

// In resource retrieval
if (!user) {
  throw new NotFoundError('User');
}
```

---

## 4. Security Middleware Analysis

### 🟢 Current Strengths

✅ **Helmet.js** configured for security headers
✅ **CORS** with environment-based origins
✅ **Rate limiting** with configurable thresholds
✅ **API key hashing** with bcrypt

### 🔴 Critical Issues

#### Issue 4.1: Weak Helmet Configuration
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:27-30`

```javascript
// Current - CSP and COEP disabled!
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
```

**Risk:** Vulnerable to XSS and injection attacks.

**Fix:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));
```

#### Issue 4.2: CORS Wildcard in Development
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:33-38`

```javascript
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://reachstreamapi.com', 'https://dashboard.reachstreamapi.com']
    : '*',  // ← Dangerous!
  credentials: true,
}));
```

**Fix:**
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://reachstreamapi.com', 'https://dashboard.reachstreamapi.com']
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Request-ID'],
  exposedHeaders: ['X-Response-Time', 'X-Request-ID'],
  maxAge: 86400 // 24 hours
}));
```

#### Issue 4.3: Inefficient API Key Verification
**File:** `/home/user/ReachstreamAPI/backend/src/middleware/auth.js:106-133`

```javascript
// Current - Fetches ALL active keys and checks each one!
const result = await query(
  `SELECT ak.*, u.*
   FROM api_keys ak
   JOIN users u ON ak.user_id = u.id
   WHERE ak.is_active = true
   AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
  []  // ← No parameters! Fetches EVERYTHING
);

// Check each key's hash (constant-time comparison)
for (const row of result.rows) {
  const isMatch = await bcrypt.compare(apiKey, row.key_hash);
  if (isMatch) {
    matchedKey = row;
    break;
  }
}
```

**Problem:** This will scale terribly. With 10,000 users, you're bcrypt-comparing against 10,000 keys on EVERY request!

**Fix:** Store key prefix in plaintext for lookup:

```javascript
// API keys format: rsk_[8-char-prefix]_[24-char-secret]
// Store prefix in database for efficient lookup

const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || !apiKey.startsWith('rsk_')) {
      throw new UnauthorizedError('Invalid API key format');
    }

    // Extract prefix for efficient lookup
    const parts = apiKey.split('_');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Invalid API key format');
    }

    const keyPrefix = `${parts[0]}_${parts[1]}`; // rsk_prefix

    // Lookup by prefix (indexed column) instead of checking all keys
    const result = await query(
      `SELECT ak.*, u.*
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_prefix = $1
       AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyPrefix]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired API key');
    }

    // Now only compare against matching prefix (usually 1 key)
    const row = result.rows[0];
    const isMatch = await bcrypt.compare(apiKey, row.key_hash);

    if (!isMatch) {
      throw new UnauthorizedError('Invalid or expired API key');
    }

    // Check credits
    if (row.credits_balance <= 0) {
      throw new PaymentRequiredError('Your credit balance is 0. Please purchase more credits.');
    }

    // Update last used timestamp
    await query(
      'UPDATE api_keys SET last_used_at = NOW(), total_requests = total_requests + 1 WHERE id = $1',
      [row.id]
    );

    // Attach user and API key to request
    req.user = {
      id: row.user_id,
      clerk_user_id: row.clerk_user_id,
      email: row.email,
      full_name: row.full_name,
      credits_balance: row.credits_balance,
      subscription_tier: row.subscription_tier,
    };

    req.apiKey = {
      id: row.id,
      name: row.name,
      key_prefix: row.key_prefix,
    };

    next();
  } catch (error) {
    next(error);
  }
};
```

### 🟡 Warnings

#### Warning 4.1: Rate Limiting Applied Globally
**File:** `/home/user/ReachstreamAPI/backend/src/server.js:45-57`

**Issue:** Same rate limit for all endpoints. Some endpoints should have stricter limits.

**Fix:**
```javascript
const rateLimit = require('express-rate-limit');

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Standard rate limit for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // Dynamic rate limits based on subscription tier
    const tier = req.user?.subscription_tier || 'free';
    const limits = {
      free: 10,
      freelance: 60,
      business: 300,
      enterprise: 1000
    };
    return limits[tier] || 10;
  },
  keyGenerator: (req) => {
    // Rate limit by API key instead of IP
    return req.apiKey?.id || req.ip;
  },
  handler: (req, res) => {
    throw new RateLimitError('Rate limit exceeded', res.getHeader('Retry-After'));
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply different limits
app.use('/api/auth', authLimiter);
app.use('/api/credits/checkout', authLimiter);
app.use('/api/scrape', apiLimiter);
```

#### Warning 4.2: Missing Request Sanitization
**Add:**
```javascript
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Prevent NoSQL injection (works for any JSON)
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized ${key} in request from ${req.ip}`);
  }
}));

// Prevent XSS attacks
app.use(xss());
```

---

## 5. Performance Analysis

### 🔴 Critical Issues

#### Issue 5.1: No Response Compression
**Impact:** API responses could be 5-10x larger than necessary.

**Fix:** Already covered in Issue 1.2 above.

#### Issue 5.2: No Caching Headers
**File:** All route responses

**Fix:** Add caching middleware:

**Create `/home/user/ReachstreamAPI/backend/src/middleware/cache.js`:**
```javascript
/**
 * Set cache control headers
 */
const cacheControl = (duration = 0, options = {}) => {
  return (req, res, next) => {
    if (req.method === 'GET') {
      const {
        public = true,
        immutable = false,
        staleWhileRevalidate = 0
      } = options;

      let directives = [];

      if (duration === 0) {
        directives.push('no-cache', 'no-store', 'must-revalidate');
      } else {
        directives.push(public ? 'public' : 'private');
        directives.push(`max-age=${duration}`);

        if (immutable) {
          directives.push('immutable');
        }

        if (staleWhileRevalidate > 0) {
          directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
        }
      }

      res.setHeader('Cache-Control', directives.join(', '));
    }
    next();
  };
};

/**
 * ETags for efficient caching
 */
const enableETags = (app) => {
  app.set('etag', 'strong'); // Enable strong ETags
};

module.exports = {
  cacheControl,
  enableETags
};
```

**Usage:**
```javascript
const { cacheControl, enableETags } = require('./middleware/cache');

// Enable ETags
enableETags(app);

// Cache static data for 1 hour
router.get('/pricing',
  cacheControl(3600, { public: true }),
  async (req, res) => {
    // ...pricing data
  }
);

// Cache user-specific data for 5 minutes
router.get('/credits/balance',
  verifyClerkToken,
  cacheControl(300, { public: false }),
  async (req, res) => {
    // ...balance data
  }
);

// No cache for mutations
router.post('/credits/checkout',
  verifyClerkToken,
  cacheControl(0),
  async (req, res) => {
    // ...
  }
);
```

#### Issue 5.3: No Connection Pooling Configuration
**File:** `/home/user/ReachstreamAPI/backend/src/config/database.js`

**Add connection pooling:**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Performance tuning
  max: 20, // Maximum pool connections
  min: 5, // Minimum pool connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect
  maxUses: 7500, // Recycle connections after 7500 uses
  // Error handling
  allowExitOnIdle: false,
  application_name: 'reachstream-api'
});

// Monitor pool health
pool.on('error', (err, client) => {
  logger.error('Unexpected error on idle client', err);
});

pool.on('connect', (client) => {
  logger.debug('New database connection established');
});

pool.on('remove', (client) => {
  logger.debug('Database connection removed from pool');
});
```

### 🟡 Warnings

#### Warning 5.1: No Response Streaming
**For large datasets, implement streaming:**

```javascript
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

router.get('/stats/export', verifyClerkToken, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="stats.json"');

  // Stream large result sets
  const queryStream = await pool.query(
    new QueryStream('SELECT * FROM api_requests WHERE user_id = $1', [req.user.id])
  );

  const transformStream = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      callback(null, JSON.stringify(chunk) + '\n');
    }
  });

  await pipeline(queryStream, transformStream, res);
});
```

#### Warning 5.2: Missing Keep-Alive Configuration
**Add to server:**
```javascript
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Enable keep-alive
server.keepAliveTimeout = 65000; // Must be higher than ALB timeout (60s)
server.headersTimeout = 66000; // Must be higher than keepAliveTimeout
```

---

## 6. Additional Recommendations

### 6.1 Health Check Enhancement
**Current:** Basic database check only.

**Improvement:**
```javascript
router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('../package.json').version,
    checks: {}
  };

  // Database check
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    health.checks.database = {
      status: 'up',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    health.checks.database = {
      status: 'down',
      error: error.message
    };
    health.status = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'up' : 'warning',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    usage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
  };

  // Response
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 6.2 Graceful Shutdown
**Current:** Basic SIGTERM/SIGINT handlers.

**Improvement:**
```javascript
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connections
  try {
    await pool.end();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database', error);
  }

  // Exit process
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle errors during shutdown
process.on('exit', (code) => {
  logger.info(`Process exiting with code: ${code}`);
});
```

### 6.3 Request Timeout
```javascript
const timeout = require('connect-timeout');

// Add timeout middleware
app.use(timeout('30s'));

// Timeout handler
app.use((req, res, next) => {
  if (!req.timedout) next();
});
```

---

## Implementation Priority

### 🔴 High Priority (Week 1)
1. Add request size limits (Issue 1.1)
2. Fix API key verification inefficiency (Issue 4.3)
3. Implement custom error classes (Issue 3.1)
4. Add compression middleware (Issue 1.2)
5. Strengthen Helmet configuration (Issue 4.1)

### 🟡 Medium Priority (Week 2)
1. Implement async error handler (Warning 2.1)
2. Add express-validator (Warning 2.2)
3. Improve request logging (Warning 1.1)
4. Add request ID tracking (Warning 1.2)
5. Implement dynamic rate limiting (Warning 4.1)

### 🟢 Low Priority (Week 3)
1. Add caching headers (Issue 5.2)
2. Improve CORS configuration (Issue 4.2)
3. Add response time tracking (Warning 1.3)
4. Implement standardized response format (Warning 2.3)
5. Enhance health checks (6.1)

---

## Summary

The ReachstreamAPI Express.js backend has a solid foundation but needs improvements in:
1. **Error Handling:** Centralized error classes and proper error responses
2. **Security:** Stronger Helmet config, better CORS, efficient API key lookup
3. **Performance:** Compression, caching headers, connection pooling
4. **Code Quality:** Async handlers, validation middleware, consistent patterns

Implementing these recommendations will make the API production-ready with improved security, performance, and maintainability.

---

## Files to Create

1. `/home/user/ReachstreamAPI/backend/src/utils/asyncHandler.js`
2. `/home/user/ReachstreamAPI/backend/src/utils/errors.js`
3. `/home/user/ReachstreamAPI/backend/src/utils/apiResponse.js`
4. `/home/user/ReachstreamAPI/backend/src/middleware/errorHandler.js`
5. `/home/user/ReachstreamAPI/backend/src/middleware/validators.js`
6. `/home/user/ReachstreamAPI/backend/src/middleware/cache.js`

## Files to Modify

1. `/home/user/ReachstreamAPI/backend/src/server.js` - Core middleware improvements
2. `/home/user/ReachstreamAPI/backend/src/middleware/auth.js` - Optimize API key verification
3. `/home/user/ReachstreamAPI/backend/src/config/database.js` - Add connection pooling
4. `/home/user/ReachstreamAPI/backend/src/routes/*.js` - Apply new patterns

---

**End of Report**
