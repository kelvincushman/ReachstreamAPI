/**
 * Scraping API Routes
 * Handles social media scraping requests for all platforms
 */

const express = require('express');
const router = express.Router();
const { verifyApiKey } = require('../middleware/auth');
const creditService = require('../services/creditService');
const { query } = require('../config/database');

// Import all scrapers
const { scrapeProfile: scrapeTikTokProfile } = require('../../scrapers/tiktok/profile');
const { scrapeFeed: scrapeTikTokFeed } = require('../../scrapers/tiktok/feed');
const { scrapeHashtag: scrapeTikTokHashtag } = require('../../scrapers/tiktok/hashtag');
const { scrapeProfile: scrapeInstagramProfile } = require('../../scrapers/instagram/profile');
const { scrapeChannel: scrapeYouTubeChannel } = require('../../scrapers/youtube/channel');
const { scrapeProfile: scrapeTwitterProfile } = require('../../scrapers/twitter/profile');
const { scrapeProfile: scrapeLinkedInProfile } = require('../../scrapers/linkedin/profile');
const { scrapePosts: scrapeRedditPosts } = require('../../scrapers/reddit/posts');

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

    const result = await scrapeTikTokProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok profile',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/feed
 * Scrape TikTok user feed
 */
router.get('/tiktok/feed', verifyApiKey, logApiRequest, afterRequest('tiktok', 'feed'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/feed?username=charlidamelio&limit=30',
      });
    }

    const result = await scrapeTikTokFeed(username, limit ? parseInt(limit, 10) : 30);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok feed scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok feed',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/hashtag
 * Scrape TikTok hashtag videos
 */
router.get('/tiktok/hashtag', verifyApiKey, logApiRequest, afterRequest('tiktok', 'hashtag'), async (req, res) => {
  try {
    const { hashtag } = req.query;

    if (!hashtag) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: hashtag',
        example: '/api/scrape/tiktok/hashtag?hashtag=fyp',
      });
    }

    const result = await scrapeTikTokHashtag(hashtag);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok hashtag scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok hashtag',
      message: error.message,
    });
  }
});

// ==================== Instagram Routes ====================

/**
 * GET /api/scrape/instagram/profile
 * Scrape Instagram profile
 */
router.get('/instagram/profile', verifyApiKey, logApiRequest, afterRequest('instagram', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/instagram/profile?username=instagram',
      });
    }

    const result = await scrapeInstagramProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram profile',
      message: error.message,
    });
  }
});

// ==================== YouTube Routes ====================

/**
 * GET /api/scrape/youtube/channel
 * Scrape YouTube channel
 */
router.get('/youtube/channel', verifyApiKey, logApiRequest, afterRequest('youtube', 'channel'), async (req, res) => {
  try {
    const { channel_id } = req.query;

    if (!channel_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: channel_id',
        example: '/api/scrape/youtube/channel?channel_id=@MrBeast or channel_id=UCX6OQ3DkcsbYNE6H8uQQuVA',
      });
    }

    const result = await scrapeYouTubeChannel(channel_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('YouTube channel scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape YouTube channel',
      message: error.message,
    });
  }
});

// ==================== Twitter/X Routes ====================

/**
 * GET /api/scrape/twitter/profile
 * Scrape Twitter/X profile
 */
router.get('/twitter/profile', verifyApiKey, logApiRequest, afterRequest('twitter', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/twitter/profile?username=elonmusk',
      });
    }

    const result = await scrapeTwitterProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Twitter profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Twitter profile',
      message: error.message,
    });
  }
});

// ==================== LinkedIn Routes ====================

/**
 * GET /api/scrape/linkedin/profile
 * Scrape LinkedIn profile
 */
router.get('/linkedin/profile', verifyApiKey, logApiRequest, afterRequest('linkedin', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/linkedin/profile?username=williamhgates',
      });
    }

    const result = await scrapeLinkedInProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('LinkedIn profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape LinkedIn profile',
      message: error.message,
    });
  }
});

// ==================== Reddit Routes ====================

/**
 * GET /api/scrape/reddit/posts
 * Scrape Reddit subreddit posts
 */
router.get('/reddit/posts', verifyApiKey, logApiRequest, afterRequest('reddit', 'posts'), async (req, res) => {
  try {
    const { subreddit, limit, sort } = req.query;

    if (!subreddit) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: subreddit',
        example: '/api/scrape/reddit/posts?subreddit=programming&sort=hot&limit=25',
      });
    }

    const result = await scrapeRedditPosts(
      subreddit,
      limit ? parseInt(limit, 10) : 25,
      sort || 'hot'
    );
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Reddit scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Reddit posts',
      message: error.message,
    });
  }
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

/**
 * GET /api/scrape/platforms
 * List all available platforms and endpoints
 */
router.get('/platforms', async (req, res) => {
  res.json({
    success: true,
    data: {
      platforms: [
        {
          name: 'TikTok',
          endpoints: [
            {
              path: '/api/scrape/tiktok/profile',
              description: 'Get TikTok profile data',
              params: ['username'],
              example: '?username=charlidamelio',
            },
            {
              path: '/api/scrape/tiktok/feed',
              description: 'Get TikTok user feed videos',
              params: ['username', 'limit (optional)'],
              example: '?username=charlidamelio&limit=30',
            },
            {
              path: '/api/scrape/tiktok/hashtag',
              description: 'Get TikTok hashtag videos',
              params: ['hashtag'],
              example: '?hashtag=fyp',
            },
          ],
        },
        {
          name: 'Instagram',
          endpoints: [
            {
              path: '/api/scrape/instagram/profile',
              description: 'Get Instagram profile data',
              params: ['username'],
              example: '?username=instagram',
            },
          ],
        },
        {
          name: 'YouTube',
          endpoints: [
            {
              path: '/api/scrape/youtube/channel',
              description: 'Get YouTube channel data',
              params: ['channel_id (ID or @handle)'],
              example: '?channel_id=@MrBeast',
            },
          ],
        },
        {
          name: 'Twitter/X',
          endpoints: [
            {
              path: '/api/scrape/twitter/profile',
              description: 'Get Twitter/X profile data',
              params: ['username'],
              example: '?username=elonmusk',
            },
          ],
        },
        {
          name: 'LinkedIn',
          endpoints: [
            {
              path: '/api/scrape/linkedin/profile',
              description: 'Get LinkedIn profile data',
              params: ['username'],
              example: '?username=williamhgates',
            },
          ],
        },
        {
          name: 'Reddit',
          endpoints: [
            {
              path: '/api/scrape/reddit/posts',
              description: 'Get Reddit subreddit posts',
              params: ['subreddit', 'limit (optional)', 'sort (optional)'],
              example: '?subreddit=programming&sort=hot&limit=25',
            },
          ],
        },
      ],
    },
  });
});

module.exports = router;
