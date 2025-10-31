# Security Fixes - Quick Action Checklist

## 🔴 CRITICAL - Fix Before Production (Priority 1)

### ✅ Task 1: Fix Invalid NPM Package (30 minutes)

**File:** `backend/package.json`

```bash
# Remove line 39: "impit": "^2.0.0"
cd backend
# Edit package.json and remove the impit line
npm install
npm audit
npm audit fix
```

**Verification:**
```bash
npm audit --audit-level=high
# Should show: 0 vulnerabilities
```

---

### ✅ Task 2: Implement Centralized Error Handler (2 hours)

**Create:** `backend/src/utils/errorHandler.js`

```javascript
const Sentry = require('@sentry/node');

const handleError = (error, req, res) => {
  console.error('Internal error:', {
    error: error.message,
    stack: error.stack,
    userId: req.user?.id,
    endpoint: req.path,
  });

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error);
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: 'An error occurred. Please try again.',
    request_id: req.id,
  });
};

module.exports = { handleError };
```

**Update all catch blocks in:**
- `backend/src/routes/credits.js`
- `backend/src/routes/apiKeys.js`
- `backend/src/routes/auth.js`
- `backend/src/routes/scrape.js`

**Replace:**
```javascript
catch (error) {
  res.status(500).json({
    success: false,
    error: 'Some error',
    message: error.message  // ❌ REMOVE THIS
  });
}
```

**With:**
```javascript
const { handleError } = require('../utils/errorHandler');

catch (error) {
  handleError(error, req, res);
}
```

---

### ✅ Task 3: Add Input Validation (4 hours)

**Create:** `backend/src/middleware/validators.js`

```javascript
const { query, validationResult } = require('express-validator');

const validateTikTokUsername = [
  query('username')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9._]+$/)
    .withMessage('Invalid username format'),
];

const validateSubreddit = [
  query('subreddit')
    .trim()
    .notEmpty()
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/),
  query('sort')
    .optional()
    .isIn(['hot', 'new', 'top', 'rising']),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.param, message: e.msg })),
    });
  }
  next();
};

module.exports = {
  validateTikTokUsername,
  validateSubreddit,
  handleValidationErrors,
};
```

**Update:** `backend/src/routes/scrape.js`

Add validation to each endpoint:
```javascript
const { validateTikTokUsername, handleValidationErrors } = require('../middleware/validators');

router.get('/tiktok/profile',
  verifyApiKey,
  validateTikTokUsername,  // ✅ ADD
  handleValidationErrors,   // ✅ ADD
  logApiRequest,
  afterRequest('tiktok', 'profile'),
  async (req, res) => {
    // ...
  }
);
```

**Create validators for all 29 endpoints** (see full report for patterns).

---

### ✅ Task 4: Implement Per-User Rate Limiting (3 hours)

**Install Redis:**
```bash
npm install redis rate-limit-redis
```

**Create:** `backend/src/middleware/rateLimiter.js`

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

const createApiKeyLimiter = (maxRequests, windowMinutes) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    keyGenerator: (req) => req.apiKey?.id || req.ip,
    store: new RedisStore({ client: redisClient, prefix: 'rl:' }),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per ${windowMinutes} minutes.`,
      });
    },
  });
};

const tierLimits = {
  free: createApiKeyLimiter(100, 15),
  freelance: createApiKeyLimiter(1000, 15),
  business: createApiKeyLimiter(5000, 15),
};

const dynamicRateLimiter = async (req, res, next) => {
  const tier = req.user?.subscription_tier || 'free';
  const limiter = tierLimits[tier];
  return limiter(req, res, next);
};

module.exports = { dynamicRateLimiter };
```

**Update:** `backend/src/routes/scrape.js`

```javascript
const { dynamicRateLimiter } = require('../middleware/rateLimiter');

router.get('/tiktok/profile',
  verifyApiKey,
  dynamicRateLimiter,  // ✅ ADD
  // ... rest of middleware
);
```

**Verification:**
```bash
# Send 101 requests as same user
for i in {1..101}; do
  curl "https://api.reachstream.com/api/scrape/tiktok/profile?username=test" \
    -H "x-api-key: rsk_test_key"
done
# 101st should return 429
```

---

## 🟠 HIGH - Fix Before Production (Priority 2)

All 4 critical tasks above must be completed before production deployment.

---

## 🟡 MEDIUM - Fix Within 2 Weeks (Priority 3)

### ✅ Task 5: Fix CORS Configuration (30 minutes)

**Update:** `backend/src/server.js` (lines 33-38)

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://reachstreamapi.com',
      'https://dashboard.reachstreamapi.com',
    ]
  : [
      'http://localhost:3000',
      'http://localhost:5173',
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

### ✅ Task 6: Sanitize Query Logging (1 hour)

**Update:** `backend/src/config/database.js` (lines 52-62)

```javascript
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    const queryType = text.trim().split(' ')[0].toUpperCase();
    const table = text.match(/FROM|INTO|UPDATE\s+(\w+)/i)?.[1] || 'unknown';

    console.log('Executed query', {
      type: queryType,
      table,
      duration,
      rows: res.rowCount,
      // DO NOT log: text, params
    });

    return res;
  } catch (error) {
    console.error('Database query error:', {
      type: text.split(' ')[0],
      error: error.code,
    });
    throw error;
  }
};
```

---

### ✅ Task 7: Secure .env.example (30 minutes)

**Update:** `backend/.env.example`

```bash
# ⚠️ CRITICAL: Replace ALL values below before production!

# Database
DB_PASSWORD=REPLACE_WITH_YOUR_DB_PASSWORD_NEVER_USE_THIS_VALUE

# Oxylabs
OXYLABS_USERNAME=your_oxylabs_username_here
OXYLABS_PASSWORD=your_oxylabs_password_here

# Security
# Generate: openssl rand -base64 64
JWT_SECRET=REPLACE_WITH_RANDOM_64_CHARACTER_STRING
```

**Create:** `backend/src/config/validateEnv.js`

```javascript
const DANGEROUS_DEFAULTS = [
  'your_db_password',
  'your_super_secret',
  'REPLACE_WITH',
  'password123',
];

const validateEnvVars = () => {
  const criticalVars = ['DB_PASSWORD', 'JWT_SECRET', 'CLERK_SECRET_KEY', 'STRIPE_SECRET_KEY'];

  for (const varName of criticalVars) {
    const value = process.env[varName];

    if (!value) {
      throw new Error(`❌ ${varName} is not set`);
    }

    if (DANGEROUS_DEFAULTS.some(d => value.includes(d))) {
      throw new Error(`❌ ${varName} contains default value`);
    }

    if (value.length < 20 && varName.includes('SECRET')) {
      throw new Error(`❌ ${varName} is too short`);
    }
  }

  console.log('✅ Environment variables validated');
};

module.exports = { validateEnvVars };
```

**Update:** `backend/src/server.js`

```javascript
const { validateEnvVars } = require('./config/validateEnv');

const startServer = async () => {
  validateEnvVars();  // ✅ ADD THIS
  // ... rest of startup
};
```

---

### ✅ Task 8: Remove Stack Traces (15 minutes)

**Update:** `backend/src/server.js` (line 180-193)

```javascript
app.use((err, req, res, next) => {
  const { handleError } = require('./utils/errorHandler');
  handleError(err, req, res);
  // Remove all stack trace logic
});
```

---

## 🟢 LOW - Best Practices (Priority 4)

### ✅ Task 9: Migrate to Winston Logging (2 hours)

**Create:** `backend/src/config/logger.js`

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
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

module.exports = logger;
```

**Replace all `console.log/error`:**
```javascript
// BEFORE:
console.log('User authenticated:', userId);
console.error('Error:', error);

// AFTER:
const logger = require('./config/logger');
logger.info('User authenticated', { userId });
logger.error('Error occurred', { error: error.message });
```

---

### ✅ Task 10: Enhance Security Headers (30 minutes)

**Update:** `backend/src/server.js` (lines 27-30)

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
}));
```

---

### ✅ Task 11: Add Request ID Tracing (15 minutes)

**Update:** `backend/src/server.js`

```javascript
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

## Testing Checklist

After completing all fixes, run these tests:

```bash
# 1. Dependency audit
cd backend && npm audit

# 2. Start server
npm run dev

# 3. Test rate limiting
for i in {1..101}; do curl "http://localhost:3000/api/scrape/tiktok/profile?username=test" -H "x-api-key: test"; done

# 4. Test input validation
curl "http://localhost:3000/api/scrape/tiktok/profile?username=<script>alert(1)</script>" -H "x-api-key: test"

# 5. Test error handling
curl "http://localhost:3000/api/credits/checkout" -X POST -H "Authorization: Bearer invalid"

# 6. Test CORS
curl -H "Origin: https://evil.com" -X OPTIONS "http://localhost:3000/api/credits/checkout"
```

---

## Progress Tracking

**Priority 1 (CRITICAL):**
- [ ] Task 1: Fix NPM package (30min)
- [ ] Task 2: Error handler (2hrs)
- [ ] Task 3: Input validation (4hrs)
- [ ] Task 4: Rate limiting (3hrs)

**Total Time:** ~9 hours (1-2 days)

**Priority 2 (MEDIUM):**
- [ ] Task 5: CORS (30min)
- [ ] Task 6: Query logging (1hr)
- [ ] Task 7: .env validation (30min)
- [ ] Task 8: Stack traces (15min)

**Total Time:** ~2 hours

**Priority 3 (LOW):**
- [ ] Task 9: Winston logging (2hrs)
- [ ] Task 10: Security headers (30min)
- [ ] Task 11: Request IDs (15min)

**Total Time:** ~3 hours

**Grand Total:** ~14 hours of development work

---

## Need Help?

Reference the full security audit report: `/home/user/ReachstreamAPI/SECURITY_AUDIT_REPORT.md`

Each task includes:
- Detailed code examples
- File locations
- Testing procedures
- Compliance notes

