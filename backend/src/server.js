/**
 * ReachstreamAPI Backend Server
 * Main Express.js application
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const creditsRoutes = require('./routes/credits');
const apiKeysRoutes = require('./routes/apiKeys');
const scrapeRoutes = require('./routes/scrape');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// ==================== Middleware ====================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Adjust based on your needs
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://reachstreamapi.com', 'https://dashboard.reachstreamapi.com']
    : '*',
  credentials: true,
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (adjust based on tier)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ==================== Health Check ====================

app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'ReachstreamAPI',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      credits: '/api/credits',
      apiKeys: '/api/keys',
      scrape: '/api/scrape',
      docs: '/api/docs',
    },
  });
});

app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();

  res.status(dbConnected ? 200 : 503).json({
    success: dbConnected,
    status: dbConnected ? 'healthy' : 'unhealthy',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ==================== API Routes ====================

app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/scrape', scrapeRoutes);

// API documentation route
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    documentation: {
      base_url: process.env.API_BASE_URL || 'http://localhost:3000',
      authentication: {
        method: 'API Key',
        header: 'x-api-key',
        format: 'rsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      },
      endpoints: {
        auth: {
          '/api/auth/me': {
            method: 'GET',
            auth: 'Clerk Token',
            description: 'Get current user profile',
          },
        },
        credits: {
          '/api/credits/balance': {
            method: 'GET',
            auth: 'Clerk Token',
            description: 'Get credit balance',
          },
          '/api/credits/checkout': {
            method: 'POST',
            auth: 'Clerk Token',
            description: 'Create Stripe checkout session',
            params: { tier: 'freelance | business' },
          },
        },
        apiKeys: {
          '/api/keys': {
            method: 'GET',
            auth: 'Clerk Token',
            description: 'List all API keys',
          },
          'POST /api/keys': {
            method: 'POST',
            auth: 'Clerk Token',
            description: 'Create new API key',
            params: { name: 'string', expires_at: 'ISO date (optional)' },
          },
        },
        scraping: {
          '/api/scrape/tiktok/profile': {
            method: 'GET',
            auth: 'API Key',
            description: 'Scrape TikTok profile',
            params: { username: 'string' },
            example: '/api/scrape/tiktok/profile?username=charlidamelio',
            cost: '1 credit per request',
          },
        },
      },
      pricing: {
        free: { credits: 100, price: 0 },
        freelance: { credits: 25000, price: 47, price_per_1k: 1.88 },
        business: { credits: 500000, price: 497, price_per_1k: 0.99 },
      },
    },
  });
});

// ==================== Error Handling ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`,
    documentation: '/api/docs',
  });
});

// Global error handler
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

// ==================== Server Startup ====================

const startServer = async () => {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
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
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;
