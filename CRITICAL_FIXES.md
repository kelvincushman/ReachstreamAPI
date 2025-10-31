# Critical Node.js Fixes - Implementation Guide

This document provides **ready-to-implement code** for the 4 critical issues identified in the audit.

---

## 🚨 Fix #1: Add Global Error Handlers

**File:** `/home/user/ReachstreamAPI/backend/src/server.js`

**Add this code BEFORE `startServer()` function (around line 195):**

```javascript
// ==================== Global Process Error Handlers ====================

/**
 * Handle unhandled promise rejections
 * This prevents the app from crashing on unhandled async errors
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Promise Rejection:', reason);
  console.error('Promise:', promise);

  // Log to Sentry if available
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(reason);
  }

  // Log to monitoring service
  // Note: Don't crash immediately - let monitoring handle it
  // In production, you may want to gracefully shutdown after logging
});

/**
 * Handle uncaught exceptions
 * This is a last resort - the app should be restarted after this
 */
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);

  // Log to Sentry if available
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(error);
  }

  // Attempt graceful shutdown
  console.error('Attempting graceful shutdown...');

  // Close server gracefully (implementation in Fix #2)
  if (typeof gracefulShutdown === 'function') {
    gracefulShutdown('uncaughtException')
      .then(() => process.exit(1))
      .catch(() => process.exit(1));
  } else {
    // If gracefulShutdown not available, exit immediately
    process.exit(1);
  }
});
```

---

## 🚨 Fix #2: Implement Proper Graceful Shutdown

**File:** `/home/user/ReachstreamAPI/backend/src/server.js`

**Replace the existing SIGTERM/SIGINT handlers (lines 228-236) with this:**

```javascript
// ==================== Graceful Shutdown ====================

let isShuttingDown = false;
let server = null; // Will be assigned in startServer()

/**
 * Gracefully shutdown the server
 * Closes HTTP server, database connections, and external clients
 */
async function gracefulShutdown(signal) {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    console.log('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`🛑 ${signal} signal received - Starting graceful shutdown`);
  console.log('═══════════════════════════════════════════════════════');

  // Set a timeout for forced shutdown (30 seconds)
  const forceShutdownTimer = setTimeout(() => {
    console.error('⏱️  Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000);

  // Unref the timer so it doesn't keep the process alive
  forceShutdownTimer.unref();

  try {
    // Step 1: Stop accepting new connections
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            console.error('❌ Error closing HTTP server:', err);
            reject(err);
          } else {
            console.log('✅ HTTP server closed (no new connections accepted)');
            resolve();
          }
        });
      });
    }

    // Step 2: Close database pool
    console.log('🔌 Closing database pool...');
    const { pool } = require('./config/database');
    await pool.end();
    console.log('✅ Database pool closed');

    // Step 3: Cleanup any other resources
    // Add cleanup for AWS SDK clients, Redis, etc. if you add them later

    // Step 4: Clear the force shutdown timer
    clearTimeout(forceShutdownTimer);

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Graceful shutdown completed successfully');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('❌ Error during graceful shutdown:', error);
    console.error('═══════════════════════════════════════════════════════');
    console.error('');

    clearTimeout(forceShutdownTimer);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Also handle SIGUSR2 (used by nodemon)
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));
```

**Update the `startServer()` function to store server reference (around line 209):**

```javascript
// Start server
server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 ReachstreamAPI Server Started');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Set server timeouts
server.keepAliveTimeout = 65000; // 65 seconds (must be > load balancer timeout)
server.headersTimeout = 66000; // 66 seconds (must be > keepAliveTimeout)
```

---

## 🚨 Fix #3: Secure API Key Verification (Fix Timing Attack & Performance)

**File:** `/home/user/ReachstreamAPI/backend/src/middleware/auth.js`

**Replace the `verifyApiKey` function (lines 86-173) with this optimized version:**

### Option A: Add key_prefix column to database (Recommended)

**Step 1: Add migration to create key_prefix column**

Create file: `/home/user/ReachstreamAPI/backend/migrations/add_key_prefix.sql`
```sql
-- Add key_prefix column to api_keys table
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(10);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- Backfill existing keys (assumes format 'rsk_xxxx...')
UPDATE api_keys SET key_prefix = SUBSTRING(key_hash, 1, 7) WHERE key_prefix IS NULL;
```

**Step 2: Update verifyApiKey middleware**

```javascript
/**
 * Verify API key from request headers
 * OPTIMIZED: Uses key prefix for O(1) lookup instead of O(n) loop
 */
const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'No API key provided in x-api-key header',
      });
    }

    // Check API key format
    if (!apiKey.startsWith('rsk_')) {
      return res.status(401).json({
        error: 'Invalid API key format',
        message: 'API key must start with rsk_',
      });
    }

    // Extract key prefix (first 7 characters: 'rsk_xxx')
    // This assumes your API keys are at least 7 characters
    const keyPrefix = apiKey.substring(0, 7);

    // Query ONLY keys with matching prefix (dramatically reduces search space)
    const result = await query(
      `SELECT ak.*, u.*
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_prefix = $1
       AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyPrefix]
    );

    // If no keys with this prefix, fast reject
    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or expired',
      });
    }

    // Now only compare against keys with matching prefix (usually 1-2 keys max)
    let matchedKey = null;
    let matchedUser = null;

    for (const row of result.rows) {
      const isMatch = await bcrypt.compare(apiKey, row.key_hash);
      if (isMatch) {
        matchedKey = row;
        matchedUser = {
          id: row.user_id,
          clerk_user_id: row.clerk_user_id,
          email: row.email,
          full_name: row.full_name,
          credits_balance: row.credits_balance,
          subscription_tier: row.subscription_tier,
        };
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or expired',
      });
    }

    // Check if user has credits
    if (matchedUser.credits_balance <= 0) {
      return res.status(402).json({
        error: 'Insufficient credits',
        message: 'Your credit balance is 0. Please purchase more credits.',
        credits_balance: 0,
      });
    }

    // Update last used timestamp (don't await - fire and forget)
    query(
      'UPDATE api_keys SET last_used_at = NOW(), total_requests = total_requests + 1 WHERE id = $1',
      [matchedKey.id]
    ).catch(err => console.error('Failed to update API key stats:', err));

    // Attach user and API key to request
    req.user = matchedUser;
    req.apiKey = {
      id: matchedKey.id,
      name: matchedKey.name,
      key_prefix: matchedKey.key_prefix,
    };

    next();
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
};
```

**Step 3: Update API key creation to store prefix**

In `/home/user/ReachstreamAPI/backend/src/services/apiKeyService.js` (or wherever you create API keys):

```javascript
// When creating a new API key:
const apiKey = `rsk_${randomBytes(32).toString('hex')}`; // Your existing key generation
const keyPrefix = apiKey.substring(0, 7); // Extract prefix
const keyHash = await bcrypt.hash(apiKey, 10);

await query(
  `INSERT INTO api_keys (user_id, key_hash, key_prefix, name, ...)
   VALUES ($1, $2, $3, $4, ...)`,
  [userId, keyHash, keyPrefix, name, ...]
);
```

### Option B: Alternative - Hash-based lookup (if you can't modify DB schema)

```javascript
/**
 * Alternative: Use SHA256 hash for O(1) lookup, then bcrypt for verification
 */
const crypto = require('crypto');

const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'No API key provided in x-api-key header',
      });
    }

    // Create a fast hash of the API key for lookup
    const quickHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Query by the quick hash (requires new column: key_lookup_hash)
    const result = await query(
      `SELECT ak.*, u.*
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_lookup_hash = $1
       AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [quickHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or expired',
      });
    }

    const row = result.rows[0];

    // Verify with bcrypt for security
    const isMatch = await bcrypt.compare(apiKey, row.key_hash);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or expired',
      });
    }

    // ... rest of the function
  } catch (error) {
    console.error('API key verification error:', error);
    return res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
};
```

---

## 🚨 Fix #4: Reduce Database Error Handler Aggressiveness

**File:** `/home/user/ReachstreamAPI/backend/src/config/database.js`

**Replace the pool error handler (lines 26-29) with this:**

```javascript
// Handle pool errors - don't crash immediately, log and monitor
let consecutivePoolErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

pool.on('error', (err, client) => {
  consecutivePoolErrors++;

  console.error('⚠️  Unexpected error on idle database client:', err.message);
  console.error('Error count:', consecutivePoolErrors);

  // Log to monitoring/alerting service if available
  // Example: Send to Sentry, CloudWatch, etc.
  if (typeof monitoringService !== 'undefined') {
    monitoringService.sendAlert(
      'Database Pool Error',
      `Idle client error: ${err.message}. Count: ${consecutivePoolErrors}`,
      consecutivePoolErrors >= MAX_CONSECUTIVE_ERRORS ? 'critical' : 'warning'
    );
  }

  // Only exit if we've had multiple consecutive errors
  // This indicates a systemic problem, not a transient issue
  if (consecutivePoolErrors >= MAX_CONSECUTIVE_ERRORS) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════');
    console.error('🚨 CRITICAL: Multiple consecutive database pool errors');
    console.error('🚨 Database connection pool is likely broken');
    console.error('🚨 Forcing shutdown for safety');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');

    // Attempt graceful shutdown if function exists
    if (typeof gracefulShutdown === 'function') {
      gracefulShutdown('database-pool-error')
        .then(() => process.exit(1))
        .catch(() => process.exit(1));
    } else {
      process.exit(1);
    }
  }
});

// Reset error counter on successful query
const originalQuery = query;
query = async (text, params) => {
  try {
    const result = await originalQuery(text, params);
    consecutivePoolErrors = 0; // Reset on success
    return result;
  } catch (error) {
    throw error;
  }
};
```

**Or, simpler version that just logs and monitors:**

```javascript
// Handle pool errors - log and monitor but don't crash
pool.on('error', (err, client) => {
  console.error('⚠️  Unexpected error on idle database client:', err);

  // Log to monitoring/alerting service
  // Let external monitoring handle alerts and restart decisions
  if (typeof monitoringService !== 'undefined') {
    monitoringService.sendAlert(
      'Database Pool Error',
      `Idle client error: ${err.message}`,
      'warning'
    );
  }

  // Don't call process.exit() - let the app try to recover
  // If the pool is truly broken, queries will fail and trigger proper error handling
});
```

---

## Additional Quick Wins

### Add Request Timeout

**File:** `/home/user/ReachstreamAPI/backend/src/server.js`

Add this middleware before your routes (around line 64):

```javascript
// Request timeout middleware (60 seconds)
app.use((req, res, next) => {
  req.setTimeout(60000, () => {
    console.error('Request timeout:', req.method, req.path);
    res.status(408).json({
      success: false,
      error: 'Request timeout',
      message: 'Request took too long to process',
    });
  });

  res.setTimeout(60000, () => {
    console.error('Response timeout:', req.method, req.path);
  });

  next();
});
```

### Add Health Check Timeout

**File:** `/home/user/ReachstreamAPI/backend/src/server.js`

Replace the `/health` route (lines 85-94):

```javascript
app.get('/health', async (req, res) => {
  // Create a timeout promise
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Health check timeout')), 5000);
  });

  try {
    // Race between health check and timeout
    const dbConnected = await Promise.race([
      testConnection(),
      timeout
    ]);

    res.status(dbConnected ? 200 : 503).json({
      success: dbConnected,
      status: dbConnected ? 'healthy' : 'unhealthy',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    // Health check failed or timed out
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: error.message === 'Health check timeout' ? 'timeout' : 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
});
```

---

## Testing Your Fixes

### Test Graceful Shutdown

```bash
# Start your server
npm start

# In another terminal, send SIGTERM
kill -TERM <pid>

# Check logs - should see:
# ✅ HTTP server closed
# ✅ Database pool closed
# ✅ Graceful shutdown completed successfully
```

### Test Unhandled Rejection Handler

Add this temporary test endpoint:

```javascript
app.get('/test/unhandled-rejection', async (req, res) => {
  // Trigger unhandled rejection
  Promise.reject(new Error('Test unhandled rejection'));

  res.json({ message: 'Unhandled rejection triggered' });
});
```

Visit `/test/unhandled-rejection` - server should log error but NOT crash.

### Test API Key Performance

```bash
# Before fix - time with 1000+ keys in DB
time curl -H "x-api-key: rsk_yourkey" http://localhost:3000/api/scrape/tiktok/profile?username=test

# After fix - should be much faster
```

---

## Deployment Checklist

Before deploying these fixes:

- [ ] Add `key_prefix` column to `api_keys` table in production database
- [ ] Backfill existing API keys with their prefix
- [ ] Test graceful shutdown in staging environment
- [ ] Test with high load to ensure no memory leaks
- [ ] Update monitoring alerts for new error handling
- [ ] Document new error handling behavior for team
- [ ] Set up auto-restart policy (PM2, Docker, K8s) for uncaught exceptions

---

## Migration Script

**File:** `/home/user/ReachstreamAPI/backend/migrations/001_add_key_prefix.js`

```javascript
const { pool } = require('../src/config/database');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Adding key_prefix column...');
    await client.query(`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS key_prefix VARCHAR(10)
    `);

    console.log('Creating index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_prefix
      ON api_keys(key_prefix)
    `);

    console.log('Backfilling key_prefix for existing keys...');
    // This assumes you store some part of the key unencrypted
    // If not, you'll need to regenerate keys or handle differently
    await client.query(`
      UPDATE api_keys
      SET key_prefix = LEFT(key_hash, 7)
      WHERE key_prefix IS NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
```

Run with:
```bash
node backend/migrations/001_add_key_prefix.js
```

---

**These fixes address the 4 most critical issues.** Implement them in order of priority:

1. Fix #1 (Global error handlers) - 15 minutes
2. Fix #2 (Graceful shutdown) - 30 minutes
3. Fix #4 (Database error handler) - 10 minutes
4. Fix #3 (API key verification) - 1-2 hours (includes DB migration)

**Total implementation time: ~2.5 hours**
