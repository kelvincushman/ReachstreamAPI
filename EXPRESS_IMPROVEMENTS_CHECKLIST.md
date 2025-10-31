# Express.js Improvements Checklist
## Implementation Guide for ReachstreamAPI

Track your progress as you implement the recommended improvements.

---

## Phase 1: Critical Security & Performance (Week 1)

### Day 1-2: Security Hardening
- [ ] **Add request size limits**
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Line: 41-42
  - Code:
    ```javascript
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb', parameterLimit: 1000 }));
    ```

- [ ] **Fix Helmet configuration**
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Line: 27-30
  - Copy config from `EXPRESSJS_AUDIT_REPORT.md` Section 4.1

- [ ] **Add compression middleware**
  - Install: `npm install compression`
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Add after helmet, before CORS

- [ ] **Install additional security packages**
  ```bash
  npm install express-mongo-sanitize hpp xss-clean
  ```

### Day 3-4: Error Handling Infrastructure
- [x] **Create error utility classes**
  - File: `/home/user/ReachstreamAPI/backend/src/utils/errors.js`
  - Status: ✅ Created

- [x] **Create async handler utility**
  - File: `/home/user/ReachstreamAPI/backend/src/utils/asyncHandler.js`
  - Status: ✅ Created

- [ ] **Create error handler middleware**
  - File: `/home/user/ReachstreamAPI/backend/src/middleware/errorHandler.js`
  - Copy from `EXPRESSJS_AUDIT_REPORT.md` Section 3.1

- [ ] **Update server.js to use new error handlers**
  - Replace existing error handling middleware
  - Add error converter
  - Add unhandled rejection handlers

### Day 5: API Key Optimization
- [ ] **Optimize API key verification**
  - File: `/home/user/ReachstreamAPI/backend/src/middleware/auth.js`
  - Line: 106-173
  - Change query to use `key_prefix` lookup
  - Copy optimized code from `EXPRESSJS_AUDIT_REPORT.md` Section 4.3

- [ ] **Update API key generation to include prefix**
  - File: `/home/user/ReachstreamAPI/backend/src/services/apiKeyService.js`
  - Format: `rsk_[prefix]_[secret]`
  - Store prefix separately for efficient lookup

- [ ] **Add database index**
  ```sql
  CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
  ```

---

## Phase 2: Code Quality Improvements (Week 2)

### Day 6-7: Response Standardization
- [x] **Create ApiResponse utility**
  - File: `/home/user/ReachstreamAPI/backend/src/utils/apiResponse.js`
  - Status: ✅ Created

- [ ] **Create cache middleware**
  - File: `/home/user/ReachstreamAPI/backend/src/middleware/cache.js`
  - Copy from `EXPRESSJS_AUDIT_REPORT.md` Section 5.2

- [ ] **Enable ETags**
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Add: `app.set('etag', 'strong');`

### Day 8-9: Validation Middleware
- [ ] **Create validators middleware**
  - File: `/home/user/ReachstreamAPI/backend/src/middleware/validators.js`
  - Copy from `EXPRESSJS_AUDIT_REPORT.md` Section 2.2

- [ ] **Apply validators to routes**
  - Start with: `/home/user/ReachstreamAPI/backend/src/routes/credits.js`
  - Then: `/home/user/ReachstreamAPI/backend/src/routes/scrape.js`
  - Finally: Other routes

### Day 10: Logging Enhancement
- [ ] **Setup Winston logger**
  - File: `/home/user/ReachstreamAPI/backend/src/config/logger.js`
  - Create log directories: `logs/error.log`, `logs/combined.log`

- [ ] **Add Morgan middleware**
  - Install: `npm install morgan`
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Replace basic console.log with Morgan + Winston

- [ ] **Add request ID tracking**
  - Install: `npm install uuid` (if not already)
  - Add middleware before logging
  - Include in all log messages

---

## Phase 3: Route Refactoring (Week 3)

### Day 11-12: Refactor Auth Routes
- [ ] **Update /api/auth/me**
  - Add asyncHandler
  - Add caching
  - Use ApiResponse
  - Add structured logging

- [ ] **Update /api/auth/me PATCH**
  - Add validation middleware
  - Use error classes
  - Standardize response

- [ ] **Update /api/auth/me DELETE**
  - Add confirmation validation
  - Proper error handling

### Day 13-14: Refactor Credits Routes
- [ ] **Update /api/credits/balance**
  - Follow example in `EXAMPLE_REFACTOR.md`

- [ ] **Update /api/credits/history**
  - Add pagination validator
  - Use paginated response

- [ ] **Update /api/credits/checkout**
  - Add checkout validator
  - Better error messages

- [ ] **Fix webhook route**
  - Move raw body parser to app level
  - Use error classes

### Day 15: Refactor Scrape Routes (High Priority)
- [ ] **Add route-level validators**
  - TikTok profile: username validation
  - Instagram: shortcode validation
  - YouTube: video_id validation

- [ ] **Apply asyncHandler to all routes**
  - Remove try-catch blocks
  - Use error classes

- [ ] **Add response time tracking**
  - Already in afterRequest middleware
  - Just verify it's working

---

## Phase 4: Advanced Optimizations (Week 4)

### Day 16: Database Optimization
- [ ] **Configure connection pooling**
  - File: `/home/user/ReachstreamAPI/backend/src/config/database.js`
  - Add pool configuration from audit report
  - Add pool event handlers

- [ ] **Add query timeout**
  ```javascript
  pool.query({
    text: 'SELECT * FROM users WHERE id = $1',
    values: [userId],
    timeout: 5000 // 5 second timeout
  });
  ```

### Day 17: Rate Limiting Enhancement
- [ ] **Implement dynamic rate limiting**
  - File: `/home/user/ReachstreamAPI/backend/src/server.js`
  - Different limits per subscription tier
  - Per-API-key instead of per-IP

- [ ] **Add rate limit per endpoint**
  - Auth endpoints: 5/15min
  - Checkout: 5/15min
  - Scraping: Dynamic by tier

### Day 18: CORS & Security
- [ ] **Fix CORS configuration**
  - Remove wildcard in development
  - Add origin validation function
  - Set proper headers

- [ ] **Add security middleware**
  - mongoSanitize (even for PostgreSQL)
  - hpp (parameter pollution)
  - xss-clean

### Day 19: Health Checks
- [ ] **Enhance /health endpoint**
  - Add database response time
  - Add memory usage check
  - Add uptime tracking
  - Copy from `EXPRESSJS_AUDIT_REPORT.md` Section 6.1

- [ ] **Add /metrics endpoint**
  - Connection pool stats
  - Request counts
  - Error rates

### Day 20: Graceful Shutdown
- [ ] **Improve shutdown handlers**
  - Close HTTP server first
  - Drain connection pool
  - Log shutdown events
  - Copy from `EXPRESSJS_AUDIT_REPORT.md` Section 6.2

---

## Testing & Validation

### After Each Phase
- [ ] **Run existing tests**
  ```bash
  npm test
  ```

- [ ] **Test error handling**
  - Invalid inputs
  - Missing parameters
  - Expired API keys
  - Insufficient credits

- [ ] **Check logs**
  - Verify Winston logging
  - Check error logs
  - Monitor performance

- [ ] **Test performance**
  - Compare response times
  - Check compression (response size)
  - Verify caching headers

### Load Testing
- [ ] **Install load testing tool**
  ```bash
  npm install -g artillery
  ```

- [ ] **Run load tests**
  ```bash
  artillery quick --count 100 --num 10 http://localhost:3000/api/scrape/tiktok/profile?username=test
  ```

- [ ] **Monitor during load**
  - Response times
  - Error rates
  - Memory usage
  - Database connections

---

## Verification Checklist

### Security ✅
- [ ] Request size limits: 10MB
- [ ] Helmet CSP enabled
- [ ] CORS restricted origins
- [ ] API key lookup optimized
- [ ] Input sanitization (mongoSanitize, xss-clean, hpp)
- [ ] Rate limiting per endpoint
- [ ] No stack traces in production

### Performance ✅
- [ ] Compression enabled
- [ ] Cache headers on GET requests
- [ ] ETags enabled
- [ ] Connection pooling configured
- [ ] Keep-alive timeouts set
- [ ] Response times < 200ms (non-scraping)

### Code Quality ✅
- [ ] No try-catch in routes
- [ ] Async error handler used
- [ ] Custom error classes used
- [ ] Validation middleware applied
- [ ] Consistent response format
- [ ] Structured logging with context

### Monitoring ✅
- [ ] Winston logger configured
- [ ] Morgan HTTP logging
- [ ] Request ID tracking
- [ ] Error logging to file
- [ ] Health check enhanced
- [ ] Graceful shutdown

---

## Package Installations

```bash
# Install all required packages
npm install compression morgan winston express-mongo-sanitize hpp xss-clean response-time connect-timeout

# Development tools
npm install --save-dev artillery
```

---

## Configuration Files to Update

1. **server.js** - Main middleware chain
2. **middleware/auth.js** - API key optimization
3. **middleware/errorHandler.js** - New error handling (create)
4. **middleware/validators.js** - Input validation (create)
5. **middleware/cache.js** - Cache control (create)
6. **utils/errors.js** - Error classes (✅ created)
7. **utils/asyncHandler.js** - Async wrapper (✅ created)
8. **utils/apiResponse.js** - Response utility (✅ created)
9. **config/database.js** - Connection pooling
10. **config/logger.js** - Winston setup (create)

---

## Environment Variables to Add

```env
# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Request Limits
REQUEST_SIZE_LIMIT=10mb
REQUEST_PARAMETER_LIMIT=1000

# Performance
KEEP_ALIVE_TIMEOUT=65000
HEADERS_TIMEOUT=66000

# Database Pool
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
```

---

## Success Metrics

Track these metrics before and after implementation:

### Performance
- **Response Time (P50):** Target < 100ms
- **Response Time (P95):** Target < 300ms
- **Response Size:** Target 70-90% reduction with compression
- **Database Query Time:** Target < 50ms for API key lookup

### Reliability
- **Error Rate:** Target < 0.1%
- **API Key Lookup Success:** Target > 99.9%
- **Uptime:** Target 99.9%

### Security
- **Invalid Request Attempts:** Should be logged
- **Rate Limit Hits:** Should be tracked
- **XSS/Injection Attempts:** Should be blocked

---

## Notes

- ✅ Files already created (green checkmarks)
- 🔴 Critical priority
- 🟡 High priority
- 🟢 Medium priority
- ℹ️ Nice to have

## Questions or Issues?

Reference the detailed audit report: `EXPRESSJS_AUDIT_REPORT.md`
Example patterns: `EXAMPLE_REFACTOR.md`

---

**Last Updated:** 2025-10-31
**Estimated Completion:** 4 weeks
**Current Phase:** Phase 1 - Critical Security & Performance
