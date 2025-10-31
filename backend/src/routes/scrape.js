/**
 * Scraping API Routes
 * Handles social media scraping requests
 */

const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth');
const creditService = require('../services/creditService');
const { query } = require('../config/database');
const { scrapeProfile: scrapeTikTokProfile } = require('../../scrapers/tiktok/profile');

/**
 * Middleware to log API requests
 */
const logApiRequest = async (req, res, next) => {
  req.requestStartTime = Date.now();
  req.requestMetadata = {
    platform: req.baseUrl.split('/').pop(),
    endpoint: req.path,
    ip_address: req.ip,
    user_agent: req.get('user-agent'),
  };
  next();
};

/**
 * Middleware to deduct credits and log request after completion
 */
const afterRequest = (platform, requestType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (body) {
    const responseTime = Date.now() - req.requestStartTime;
    const success = body.success === true;

    try {
      // Deduct credits if request was successful
      if (success && req.user) {
        await creditService.deductCredits(req.user.id, 1, {
          referenceType: 'api_request',
          description: `${platform} ${requestType} scraping`,
        });
      }

      // Log request to database
      if (req.user && req.apiKey) {
        await query(
          `INSERT INTO api_requests (user_id, api_key_id, endpoint, platform, request_type, request_params, response_status, response_time_ms, credits_used, success, error_message, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            req.user.id,
            req.apiKey.id,
            `${req.baseUrl}${req.path}`,
            platform,
            requestType,
            JSON.stringify(req.query),
            res.statusCode,
            responseTime,
            success ? 1 : 0,
            success,
            body.error || null,
            req.requestMetadata.ip_address,
            req.requestMetadata.user_agent,
          ]
        );
      }
    } catch (error) {
      console.error('After request middleware error:', error);
    }

    // Add response time to body
    body.response_time_ms = responseTime;

    return originalJson(body);
  };

  next();
};

// ==================== TikTok Routes ====================

/**
 * GET /api/scrape/tiktok/profile
 * Scrape TikTok profile by username
 */
router.get('/tiktok/profile', verifyApiKey, logApiRequest, afterRequest('tiktok', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/profile?username=charlidamelio',
      });
    }

    // Scrape TikTok profile
    const result = await scrapeTikTokProfile(username);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('TikTok profile scraping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok profile',
      message: error.message,
    });
  }
});

// ==================== Instagram Routes (Coming Soon) ====================

router.get('/instagram/profile', verifyApiKey, async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Instagram scraping coming soon',
    message: 'This endpoint is under development',
  });
});

// ==================== YouTube Routes (Coming Soon) ====================

router.get('/youtube/channel', verifyApiKey, async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'YouTube scraping coming soon',
    message: 'This endpoint is under development',
  });
});

// ==================== General Stats Route ====================

/**
 * GET /api/scrape/stats
 * Get user's scraping statistics
 */
router.get('/stats', verifyApiKey, async (req, res) => {
  try {
    const stats = await query(
      `SELECT
         COUNT(*) as total_requests,
         COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
         COUNT(CASE WHEN success = false THEN 1 END) as failed_requests,
         AVG(response_time_ms) as avg_response_time_ms,
         COUNT(DISTINCT platform) as platforms_used,
         MAX(created_at) as last_request_at
       FROM api_requests
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Get platform breakdown
    const platformStats = await query(
      `SELECT
         platform,
         COUNT(*) as requests,
         COUNT(CASE WHEN success = true THEN 1 END) as successful,
         AVG(response_time_ms) as avg_response_time
       FROM api_requests
       WHERE user_id = $1
       GROUP BY platform
       ORDER BY requests DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        overall: stats.rows[0],
        by_platform: platformStats.rows,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
});

module.exports = router;
