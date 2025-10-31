---
name: code-quality-completion
description: PROACTIVELY review code quality, enforce standards, ensure completion, and identify improvements. MUST BE USED before committing code and when implementing new features for ReachstreamAPI.
---

# Code Quality and Completion Agent

## Overview

This agent ensures code quality, completeness, and consistency across the ReachstreamAPI codebase. It enforces project standards, identifies incomplete implementations, suggests improvements, and ensures all code follows established patterns.

**Invoke this agent when:**
- Implementing new features or scrapers
- Refactoring existing code
- Before committing changes
- Adding new API endpoints
- Reviewing pull requests
- Identifying technical debt

## ReachstreamAPI Architecture Context

### Tech Stack
- **Backend:** Node.js 18+, Express.js 4.18
- **Database:** PostgreSQL 14+ with pg driver
- **Frontend:** React 18, Vite 5, Tailwind CSS
- **Auth:** Clerk SDK (JWT tokens)
- **Payments:** Stripe SDK
- **Scraping:** Oxylabs proxy + got-scraping
- **Monitoring:** Sentry, AWS CloudWatch
- **Infrastructure:** AWS Lambda, API Gateway, CDK

### Key Patterns
- Async/await for all async operations
- Express middleware chain: `verifyApiKey → logApiRequest → afterRequest`
- Credit deduction after successful requests
- Consistent error responses: `{ success: false, error: string, message: string }`
- Bcrypt hashing for API keys (10 rounds)
- PostgreSQL parameterized queries to prevent SQL injection
- Winston for logging
- Response time tracking

## Quick Start

### Run Code Quality Check

```bash
# Lint check
cd backend
npm run lint

# Type check (if using TypeScript)
npm run type-check

# Test coverage
npm run test:coverage
```

## Core Workflows

### Workflow 1: New API Endpoint Quality Check

When adding a new scraping endpoint:

**1. Verify Scraper Function Structure**

```javascript
// ✅ GOOD: Complete scraper implementation
const scrapePlatformEndpoint = async (param1, param2 = defaultValue) => {
  const startTime = Date.now();

  try {
    // Input validation
    if (!param1 || typeof param1 !== 'string') {
      throw new Error('Invalid param1 provided');
    }

    // Build URL
    const url = `https://platform.com/${param1}`;

    // Fetch with proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0...',
        'Accept': 'text/html,application/xhtml+xml...',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    // Status check
    if (response.statusCode !== 200) {
      throw new Error(`Platform returned status ${response.statusCode}`);
    }

    // Data extraction
    const data = extractData(response.body, param1);
    const responseTime = Date.now() - startTime;

    // Success response
    return {
      success: true,
      data,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Scraper error:', error.message);

    // Error response
    return {
      success: false,
      error: error.message,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

// ✅ Lambda handler
const handler = async (event) => {
  try {
    const param1 = event.queryStringParameters?.param1 || event.param1;

    if (!param1) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: param1',
          example: 'param1=value',
        }),
      };
    }

    const result = await scrapePlatformEndpoint(param1);

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

// ✅ Export both functions
module.exports = { scrapePlatformEndpoint, handler };
```

**2. Verify Route Handler Structure**

```javascript
// ✅ GOOD: Complete route handler
router.get('/platform/endpoint', verifyApiKey, logApiRequest, afterRequest('platform', 'endpoint'), async (req, res) => {
  try {
    const { param1, limit } = req.query;

    // Parameter validation
    if (!param1) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: param1',
        example: '/api/scrape/platform/endpoint?param1=value&limit=20',
      });
    }

    // Call scraper
    const result = await scrapePlatformEndpoint(param1, limit ? parseInt(limit, 10) : 20);

    // Return response
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Route handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape platform endpoint',
      message: error.message,
    });
  }
});
```

**3. Quality Checklist**

- [ ] Input validation for all parameters
- [ ] Consistent error handling (try-catch)
- [ ] Response time tracking
- [ ] Proxy configuration
- [ ] Retry logic (2 attempts)
- [ ] 30-second timeout
- [ ] Consistent response format
- [ ] Lambda handler included
- [ ] Both functions exported
- [ ] Route handler added to backend/src/routes/scrape.js
- [ ] Route includes middleware chain
- [ ] Example parameter provided in error
- [ ] Console.error for debugging
- [ ] Status codes: 200 (success), 400 (bad request), 500 (error)

### Workflow 2: Database Query Quality Check

**1. Always Use Parameterized Queries**

```javascript
// ❌ BAD: SQL Injection vulnerability
const username = req.query.username;
await query(`SELECT * FROM users WHERE username = '${username}'`);

// ✅ GOOD: Parameterized query
const username = req.query.username;
await query('SELECT * FROM users WHERE username = $1', [username]);
```

**2. Transaction Safety**

```javascript
// ✅ GOOD: Atomic transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');

  // Deduct credits
  await client.query(
    'UPDATE users SET credits_balance = credits_balance - $1 WHERE id = $2',
    [creditsToDeduct, userId]
  );

  // Log transaction
  await client.query(
    'INSERT INTO credit_transactions (user_id, amount, transaction_type) VALUES ($1, $2, $3)',
    [userId, -creditsToDeduct, 'usage']
  );

  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

**3. Database Quality Checklist**

- [ ] All queries use parameterized syntax ($1, $2, etc.)
- [ ] No string concatenation in queries
- [ ] Transactions for multi-step operations
- [ ] Connection released in finally block
- [ ] Proper error handling with rollback
- [ ] Indexes exist for queried columns
- [ ] LIMIT clauses for large result sets

### Workflow 3: Authentication & Security Quality

**1. API Key Verification**

```javascript
// ✅ GOOD: Bcrypt comparison (timing-safe)
const apiKey = req.headers['x-api-key'];
const keyPrefix = apiKey.substring(0, 7);

const rows = await query(
  'SELECT * FROM api_keys WHERE key_prefix = $1 AND is_active = true',
  [keyPrefix]
);

for (const row of rows) {
  const isMatch = await bcrypt.compare(apiKey, row.key_hash);
  if (isMatch) {
    req.apiKey = row;
    req.user = await getUser(row.user_id);
    return next();
  }
}

// ❌ BAD: Direct comparison (timing attack)
if (apiKey === row.key_hash) {
  // Vulnerable!
}
```

**2. Secret Management**

```javascript
// ❌ BAD: Hardcoded secrets
const stripeKey = 'sk_live_abc123';

// ✅ GOOD: Environment variables
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable not set');
}
```

**3. Security Checklist**

- [ ] No hardcoded secrets or API keys
- [ ] All secrets in .env (not committed)
- [ ] Bcrypt for password/key hashing (10+ rounds)
- [ ] Timing-safe comparisons for secrets
- [ ] HTTPS in production
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Helmet.js for HTTP headers
- [ ] Input sanitization
- [ ] Error messages don't leak sensitive info

### Workflow 4: Error Handling Quality

**1. Consistent Error Responses**

```javascript
// ✅ GOOD: Structured error handling
try {
  const result = await riskyOperation();
  res.json({ success: true, data: result });
} catch (error) {
  console.error('Operation failed:', error.message);

  // Don't expose internal errors to client
  const userMessage = error.message.includes('Database')
    ? 'A server error occurred. Please try again.'
    : error.message;

  res.status(500).json({
    success: false,
    error: userMessage,
    message: error.message,
  });
}
```

**2. Error Logging**

```javascript
// ✅ GOOD: Comprehensive error logging
const winston = require('winston');

try {
  await operation();
} catch (error) {
  winston.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: {
      userId: req.user?.id,
      endpoint: req.path,
      params: req.query,
    },
  });
  throw error;
}
```

**3. Error Handling Checklist**

- [ ] All async operations wrapped in try-catch
- [ ] Errors logged with context
- [ ] User-friendly error messages
- [ ] No sensitive data in error responses
- [ ] Appropriate HTTP status codes
- [ ] Stack traces not exposed to clients
- [ ] Sentry integration for critical errors

### Workflow 5: Performance & Optimization

**1. Avoid N+1 Queries**

```javascript
// ❌ BAD: N+1 queries
const users = await query('SELECT * FROM users');
for (const user of users.rows) {
  user.apiKeys = await query('SELECT * FROM api_keys WHERE user_id = $1', [user.id]);
}

// ✅ GOOD: Single JOIN query
const result = await query(`
  SELECT u.*,
         json_agg(json_build_object('id', k.id, 'name', k.name)) as api_keys
  FROM users u
  LEFT JOIN api_keys k ON k.user_id = u.id
  GROUP BY u.id
`);
```

**2. Connection Pooling**

```javascript
// ✅ GOOD: Reuse pool connections
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
```

**3. Performance Checklist**

- [ ] Database queries optimized (no N+1)
- [ ] Indexes on frequently queried columns
- [ ] Connection pooling configured
- [ ] Caching for expensive operations
- [ ] Pagination for large result sets
- [ ] Async operations run in parallel when possible
- [ ] Memory leaks checked (event listeners cleaned up)

## Best Practices for ReachstreamAPI

### 1. Scraper Best Practices

```javascript
// ✅ Always include:
- Input validation
- Proxy usage via Oxylabs
- 30-second timeout
- Retry logic (2 attempts)
- Response time tracking
- Consistent error format
- Lambda handler
- Module exports
```

### 2. Route Best Practices

```javascript
// ✅ Always include:
- Middleware chain: verifyApiKey, logApiRequest, afterRequest
- Parameter validation with examples
- Try-catch error handling
- Consistent response format
- Appropriate status codes
```

### 3. Service Best Practices

```javascript
// ✅ Always include:
- Input validation
- Transaction support for multi-step DB operations
- Error logging with Winston
- Return values with success/error indicators
- JSDoc comments for public functions
```

### 4. Frontend Best Practices

```javascript
// ✅ Always include:
- Protected routes with Clerk
- Loading states
- Error boundaries
- Proper TypeScript/PropTypes
- Accessibility (ARIA labels)
- Responsive design (mobile-first)
```

## Common Issues & Fixes

### Issue 1: Missing Error Handling

```javascript
// ❌ BAD: Unhandled promise rejection
app.get('/endpoint', async (req, res) => {
  const data = await fetchData(); // Can throw!
  res.json(data);
});

// ✅ GOOD: Proper error handling
app.get('/endpoint', async (req, res) => {
  try {
    const data = await fetchData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Fetch failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data'
    });
  }
});
```

### Issue 2: Memory Leaks from Event Listeners

```javascript
// ❌ BAD: Event listener not removed
class Service {
  constructor() {
    process.on('SIGTERM', this.cleanup);
  }
}

// ✅ GOOD: Cleanup listener
class Service {
  constructor() {
    this.cleanupHandler = this.cleanup.bind(this);
    process.on('SIGTERM', this.cleanupHandler);
  }

  destroy() {
    process.removeListener('SIGTERM', this.cleanupHandler);
  }
}
```

### Issue 3: Inconsistent Response Format

```javascript
// ❌ BAD: Inconsistent responses
return { data: result }; // Missing success flag
return { error: err }; // Missing success flag

// ✅ GOOD: Consistent format
return {
  success: true,
  data: result,
  metadata: { ... }
};

return {
  success: false,
  error: 'Error message',
  metadata: { ... }
};
```

## Code Completion Checklist

### New Scraper Implementation

- [ ] Scraper function created in `scrapers/{platform}/{endpoint}.js`
- [ ] Input validation included
- [ ] Oxylabs proxy configured
- [ ] 30-second timeout set
- [ ] Retry logic (2 attempts)
- [ ] Response time tracked
- [ ] Error handling implemented
- [ ] Lambda handler included
- [ ] Module exports both functions
- [ ] Route handler added to `backend/src/routes/scrape.js`
- [ ] Route includes complete middleware chain
- [ ] Platform list updated in `/platforms` endpoint
- [ ] Documentation added to API_REFERENCE.md
- [ ] Tested locally

### New API Endpoint Implementation

- [ ] Route handler created with middleware
- [ ] Authentication required (verifyApiKey)
- [ ] Input validation with example errors
- [ ] Database queries use parameterized syntax
- [ ] Error handling with try-catch
- [ ] Logging with Winston
- [ ] Response format consistent
- [ ] Status codes appropriate
- [ ] Credit deduction implemented (if applicable)
- [ ] Request logged to database
- [ ] Documentation updated
- [ ] Tested with valid/invalid inputs

### Frontend Component Implementation

- [ ] Component created in appropriate directory
- [ ] PropTypes or TypeScript types defined
- [ ] Clerk authentication integrated (if protected)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Tailwind CSS for styling
- [ ] No console.logs in production code
- [ ] Component exported properly

## Testing Recommendations

### Unit Tests

```javascript
// Example scraper test
describe('TikTok Profile Scraper', () => {
  it('should return profile data for valid username', async () => {
    const result = await scrapeTikTokProfile('charlidamelio');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('follower_count');
  });

  it('should handle invalid username', async () => {
    const result = await scrapeTikTokProfile('');
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
```

### Integration Tests

```javascript
// Example API test
describe('POST /api/keys', () => {
  it('should create new API key', async () => {
    const response = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Test Key' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.key).toMatch(/^rsk_/);
  });
});
```

## Documentation Standards

### JSDoc Comments

```javascript
/**
 * Scrape TikTok user profile data
 *
 * @param {string} username - TikTok username (without @)
 * @returns {Promise<Object>} Scrape result with success flag and data/error
 * @returns {boolean} result.success - Whether scraping succeeded
 * @returns {Object} result.data - Profile data (if successful)
 * @returns {string} result.error - Error message (if failed)
 *
 * @example
 * const result = await scrapeTikTokProfile('charlidamelio');
 * if (result.success) {
 *   console.log(result.data.follower_count);
 * }
 */
const scrapeTikTokProfile = async (username) => {
  // Implementation
};
```

## Quality Metrics

Track these metrics for code quality:

- **Test Coverage:** Target 80%+
- **ESLint Errors:** 0
- **Response Time:** < 5s average
- **Error Rate:** < 1%
- **Code Duplication:** < 5%
- **Documentation Coverage:** 100% of public APIs

## Pre-Commit Checklist

Before committing code:

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] No console.logs in production code
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] No hardcoded secrets
- [ ] Git commit message descriptive
- [ ] Related files updated (routes, docs, etc.)

## Advanced Topics

### Code Review Guidelines

When reviewing code, check:

1. **Security:** No vulnerabilities introduced
2. **Performance:** No performance regressions
3. **Maintainability:** Code is readable and documented
4. **Testability:** Code is testable with clear boundaries
5. **Consistency:** Follows project patterns
6. **Completeness:** All edge cases handled

### Refactoring Patterns

When refactoring, ensure:

1. Backward compatibility maintained
2. Tests updated alongside code
3. Documentation reflects changes
4. Performance not degraded
5. Error handling preserved

## Reference

For complete coding standards, see:
- ESLint config: `backend/.eslintrc.js`
- Database schema: `database/migrations/001_initial_schema.sql`
- API patterns: `backend/src/routes/scrape.js`
- Scraper patterns: `scrapers/tiktok/profile.js`
