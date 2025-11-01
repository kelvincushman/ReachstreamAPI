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
// TikTok scrapers
const { scrapeProfile: scrapeTikTokProfile } = require('../../scrapers/tiktok/profile');
const { scrapeFeed: scrapeTikTokFeed } = require('../../scrapers/tiktok/feed');
const { scrapeHashtag: scrapeTikTokHashtag } = require('../../scrapers/tiktok/hashtag');
const { scrapeVideo: scrapeTikTokVideo } = require('../../scrapers/tiktok/video');
const { scrapeTrending: scrapeTikTokTrending } = require('../../scrapers/tiktok/trending');
const { scrapeComments: scrapeTikTokComments } = require('../../scrapers/tiktok/comments');

// TikTok Shop scrapers
const { searchShop: searchTikTokShop } = require('../../scrapers/tiktok/shop-search');
const { scrapeProduct: scrapeTikTokShopProduct } = require('../../scrapers/tiktok/shop-product');
const { scrapeReviews: scrapeTikTokShopReviews } = require('../../scrapers/tiktok/shop-reviews');

// TikTok enhancement scrapers
const { searchTikTok } = require('../../scrapers/tiktok/search');
const { scrapeSound: scrapeTikTokSound } = require('../../scrapers/tiktok/sound');
const { scrapeAnalytics: scrapeTikTokAnalytics } = require('../../scrapers/tiktok/analytics');
const { scrapeDemographics: scrapeTikTokDemographics } = require('../../scrapers/tiktok/demographics');
const { scrapeTranscript: scrapeTikTokTranscript } = require('../../scrapers/tiktok/transcript');

// TikTok social graph scrapers
const { scrapeFollowers: scrapeTikTokFollowers } = require('../../scrapers/tiktok/followers');
const { scrapeFollowing: scrapeTikTokFollowing } = require('../../scrapers/tiktok/following');

// Instagram scrapers
const { scrapeProfile: scrapeInstagramProfile } = require('../../scrapers/instagram/profile');
const { scrapePosts: scrapeInstagramPosts } = require('../../scrapers/instagram/posts');
const { scrapePost: scrapeInstagramPost } = require('../../scrapers/instagram/post');
const { scrapeComments: scrapeInstagramComments } = require('../../scrapers/instagram/comments');
const { searchInstagram } = require('../../scrapers/instagram/search');
const { scrapeReels: scrapeInstagramReels } = require('../../scrapers/instagram/reels');
const { scrapeStories: scrapeInstagramStories } = require('../../scrapers/instagram/stories');
const { scrapeHashtag: scrapeInstagramHashtag } = require('../../scrapers/instagram/hashtag');

// YouTube scrapers
const { scrapeChannel: scrapeYouTubeChannel } = require('../../scrapers/youtube/channel');
const { scrapeVideos: scrapeYouTubeVideos } = require('../../scrapers/youtube/videos');
const { scrapeVideo: scrapeYouTubeVideo } = require('../../scrapers/youtube/video');
const { scrapeComments: scrapeYouTubeComments } = require('../../scrapers/youtube/comments');
const { searchVideos: searchYouTubeVideos } = require('../../scrapers/youtube/search');

// Twitter scrapers
const { scrapeProfile: scrapeTwitterProfile } = require('../../scrapers/twitter/profile');
const { scrapeFeed: scrapeTwitterFeed } = require('../../scrapers/twitter/feed');
const { searchTweets: searchTwitter } = require('../../scrapers/twitter/search');

// LinkedIn scrapers
const { scrapeProfile: scrapeLinkedInProfile } = require('../../scrapers/linkedin/profile');
const { scrapeCompany: scrapeLinkedInCompany } = require('../../scrapers/linkedin/company');

// Facebook scrapers
const { scrapeProfile: scrapeFacebookProfile } = require('../../scrapers/facebook/profile');
const { scrapePosts: scrapeFacebookPosts } = require('../../scrapers/facebook/posts');

// Reddit scrapers
const { scrapePosts: scrapeRedditPosts } = require('../../scrapers/reddit/posts');
const { scrapeComments: scrapeRedditComments } = require('../../scrapers/reddit/comments');

// Threads scrapers
const { scrapeProfile: scrapeThreadsProfile } = require('../../scrapers/threads/profile');
const { scrapePosts: scrapeThreadsPosts } = require('../../scrapers/threads/posts');
const { scrapePost: scrapeThreadsPost } = require('../../scrapers/threads/post');
const { searchPosts: searchThreadsPosts } = require('../../scrapers/threads/search');
const { searchUsers: searchThreadsUsers } = require('../../scrapers/threads/search-users');

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

/**
 * GET /api/scrape/tiktok/video
 * Scrape TikTok video details
 */
router.get('/tiktok/video', verifyApiKey, logApiRequest, afterRequest('tiktok', 'video'), async (req, res) => {
  try {
    const { video_id } = req.query;

    if (!video_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: video_id',
        example: '/api/scrape/tiktok/video?video_id=7234567890123456789',
      });
    }

    const result = await scrapeTikTokVideo(video_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok video scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok video',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/trending
 * Scrape TikTok trending/For You videos
 */
router.get('/tiktok/trending', verifyApiKey, logApiRequest, afterRequest('tiktok', 'trending'), async (req, res) => {
  try {
    const { limit } = req.query;

    const result = await scrapeTikTokTrending(limit ? parseInt(limit, 10) : 30);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok trending scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok trending',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/comments
 * Scrape TikTok video comments
 */
router.get('/tiktok/comments', verifyApiKey, logApiRequest, afterRequest('tiktok', 'comments'), async (req, res) => {
  try {
    const { video_id, limit } = req.query;

    if (!video_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: video_id',
        example: '/api/scrape/tiktok/comments?video_id=7234567890123456789&limit=50',
      });
    }

    const result = await scrapeTikTokComments(video_id, limit ? parseInt(limit, 10) : 50);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok comments scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok comments',
      message: error.message,
    });
  }
});

// ==================== TikTok Shop Routes ====================

/**
 * GET /api/scrape/tiktok-shop/search
 * Search TikTok Shop products
 */
router.get('/tiktok-shop/search', verifyApiKey, logApiRequest, afterRequest('tiktok-shop', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, cursor, limit } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/tiktok-shop/search?query=sneakers&limit=20',
      });
    }

    const result = await searchTikTokShop(searchQuery, cursor || null, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok Shop search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search TikTok Shop',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok-shop/product
 * Scrape TikTok Shop product details
 */
router.get('/tiktok-shop/product', verifyApiKey, logApiRequest, afterRequest('tiktok-shop', 'product'), async (req, res) => {
  try {
    const { product_id } = req.query;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: product_id',
        example: '/api/scrape/tiktok-shop/product?product_id=1234567890',
      });
    }

    const result = await scrapeTikTokShopProduct(product_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok Shop product scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok Shop product',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok-shop/reviews
 * Scrape TikTok Shop product reviews
 */
router.get('/tiktok-shop/reviews', verifyApiKey, logApiRequest, afterRequest('tiktok-shop', 'reviews'), async (req, res) => {
  try {
    const { product_id, limit, cursor, filter } = req.query;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: product_id',
        example: '/api/scrape/tiktok-shop/reviews?product_id=1234567890&limit=50&filter=all',
      });
    }

    const result = await scrapeTikTokShopReviews(
      product_id,
      limit ? parseInt(limit, 10) : 50,
      cursor || null,
      filter || 'all'
    );
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok Shop reviews scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok Shop reviews',
      message: error.message,
    });
  }
});

// ==================== TikTok Enhancement Routes ====================

/**
 * GET /api/scrape/tiktok/search
 * Search TikTok for users, videos, hashtags, sounds
 */
router.get('/tiktok/search', verifyApiKey, logApiRequest, afterRequest('tiktok', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, type, limit, cursor } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/tiktok/search?query=dance&type=videos&limit=20',
      });
    }

    const result = await searchTikTok(
      searchQuery,
      type || 'all',
      limit ? parseInt(limit, 10) : 20,
      cursor || null
    );
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search TikTok',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/sound
 * Scrape TikTok sound/music details
 */
router.get('/tiktok/sound', verifyApiKey, logApiRequest, afterRequest('tiktok', 'sound'), async (req, res) => {
  try {
    const { sound_id } = req.query;

    if (!sound_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: sound_id',
        example: '/api/scrape/tiktok/sound?sound_id=1234567890',
      });
    }

    const result = await scrapeTikTokSound(sound_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok sound scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok sound',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/analytics
 * Get TikTok user analytics with engagement metrics
 */
router.get('/tiktok/analytics', verifyApiKey, logApiRequest, afterRequest('tiktok', 'analytics'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/analytics?username=charlidamelio',
      });
    }

    const result = await scrapeTikTokAnalytics(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok analytics scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok analytics',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/demographics
 * Get TikTok user audience demographics
 */
router.get('/tiktok/demographics', verifyApiKey, logApiRequest, afterRequest('tiktok', 'demographics'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/demographics?username=charlidamelio',
      });
    }

    const result = await scrapeTikTokDemographics(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok demographics scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok demographics',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/transcript
 * Get TikTok video transcript, captions, and subtitles
 */
router.get('/tiktok/transcript', verifyApiKey, logApiRequest, afterRequest('tiktok', 'transcript'), async (req, res) => {
  try {
    const { video_id, include_subtitles } = req.query;

    if (!video_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: video_id',
        example: '/api/scrape/tiktok/transcript?video_id=7234567890123456789&include_subtitles=true',
      });
    }

    const result = await scrapeTikTokTranscript(video_id, include_subtitles === 'true');
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok transcript scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok transcript',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/followers
 * Scrape TikTok user followers
 */
router.get('/tiktok/followers', verifyApiKey, logApiRequest, afterRequest('tiktok', 'followers'), async (req, res) => {
  try {
    const { username, cursor, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/followers?username=charlidamelio&limit=20',
      });
    }

    const result = await scrapeTikTokFollowers(username, cursor, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok followers scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok followers',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/tiktok/following
 * Scrape TikTok user following
 */
router.get('/tiktok/following', verifyApiKey, logApiRequest, afterRequest('tiktok', 'following'), async (req, res) => {
  try {
    const { username, cursor, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/tiktok/following?username=charlidamelio&limit=20',
      });
    }

    const result = await scrapeTikTokFollowing(username, cursor, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('TikTok following scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape TikTok following',
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

/**
 * GET /api/scrape/instagram/posts
 * Scrape Instagram user posts/feed
 */
router.get('/instagram/posts', verifyApiKey, logApiRequest, afterRequest('instagram', 'posts'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/instagram/posts?username=instagram&limit=12',
      });
    }

    const result = await scrapeInstagramPosts(username, limit ? parseInt(limit, 10) : 12);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram posts scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram posts',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/post
 * Scrape Instagram post details
 */
router.get('/instagram/post', verifyApiKey, logApiRequest, afterRequest('instagram', 'post'), async (req, res) => {
  try {
    const { shortcode } = req.query;

    if (!shortcode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: shortcode',
        example: '/api/scrape/instagram/post?shortcode=CXtWMB2goFp',
      });
    }

    const result = await scrapeInstagramPost(shortcode);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram post scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram post',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/comments
 * Scrape Instagram post comments
 */
router.get('/instagram/comments', verifyApiKey, logApiRequest, afterRequest('instagram', 'comments'), async (req, res) => {
  try {
    const { shortcode, limit } = req.query;

    if (!shortcode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: shortcode',
        example: '/api/scrape/instagram/comments?shortcode=CXtWMB2goFp&limit=50',
      });
    }

    const result = await scrapeInstagramComments(shortcode, limit ? parseInt(limit, 10) : 50);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram comments scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram comments',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/search
 * Search Instagram
 */
router.get('/instagram/search', verifyApiKey, logApiRequest, afterRequest('instagram', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, limit, type } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/instagram/search?query=travel&type=users&limit=20',
      });
    }

    const result = await searchInstagram(searchQuery, limit ? parseInt(limit, 10) : 20, type || 'all');
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search Instagram',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/reels
 * Scrape Instagram Reels from user profile
 */
router.get('/instagram/reels', verifyApiKey, logApiRequest, afterRequest('instagram', 'reels'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/instagram/reels?username=instagram&limit=12',
      });
    }

    const result = await scrapeInstagramReels(username, limit ? parseInt(limit, 10) : 12);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram reels scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram reels',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/stories
 * Scrape Instagram Stories from user profile
 */
router.get('/instagram/stories', verifyApiKey, logApiRequest, afterRequest('instagram', 'stories'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/instagram/stories?username=instagram',
      });
    }

    const result = await scrapeInstagramStories(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram stories scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram stories',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/instagram/hashtag
 * Scrape Instagram hashtag performance
 */
router.get('/instagram/hashtag', verifyApiKey, logApiRequest, afterRequest('instagram', 'hashtag'), async (req, res) => {
  try {
    const { hashtag, limit } = req.query;

    if (!hashtag) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: hashtag',
        example: '/api/scrape/instagram/hashtag?hashtag=travel&limit=12',
      });
    }

    const result = await scrapeInstagramHashtag(hashtag, limit ? parseInt(limit, 10) : 12);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Instagram hashtag scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram hashtag',
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

/**
 * GET /api/scrape/youtube/videos
 * Scrape YouTube channel videos
 */
router.get('/youtube/videos', verifyApiKey, logApiRequest, afterRequest('youtube', 'videos'), async (req, res) => {
  try {
    const { channel_id, limit } = req.query;

    if (!channel_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: channel_id',
        example: '/api/scrape/youtube/videos?channel_id=@MrBeast&limit=20',
      });
    }

    const result = await scrapeYouTubeVideos(channel_id, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('YouTube videos scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape YouTube videos',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/youtube/video
 * Scrape YouTube video details
 */
router.get('/youtube/video', verifyApiKey, logApiRequest, afterRequest('youtube', 'video'), async (req, res) => {
  try {
    const { video_id } = req.query;

    if (!video_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: video_id',
        example: '/api/scrape/youtube/video?video_id=dQw4w9WgXcQ',
      });
    }

    const result = await scrapeYouTubeVideo(video_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('YouTube video scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape YouTube video',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/youtube/comments
 * Scrape YouTube video comments
 */
router.get('/youtube/comments', verifyApiKey, logApiRequest, afterRequest('youtube', 'comments'), async (req, res) => {
  try {
    const { video_id, limit } = req.query;

    if (!video_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: video_id',
        example: '/api/scrape/youtube/comments?video_id=dQw4w9WgXcQ&limit=50',
      });
    }

    const result = await scrapeYouTubeComments(video_id, limit ? parseInt(limit, 10) : 50);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('YouTube comments scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape YouTube comments',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/youtube/search
 * Search YouTube videos
 */
router.get('/youtube/search', verifyApiKey, logApiRequest, afterRequest('youtube', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, limit } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/youtube/search?query=ai tutorial&limit=20',
      });
    }

    const result = await searchYouTubeVideos(searchQuery, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('YouTube search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search YouTube',
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

/**
 * GET /api/scrape/twitter/feed
 * Scrape Twitter/X user feed
 */
router.get('/twitter/feed', verifyApiKey, logApiRequest, afterRequest('twitter', 'feed'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/twitter/feed?username=elonmusk&limit=20',
      });
    }

    const result = await scrapeTwitterFeed(username, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Twitter feed scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Twitter feed',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/twitter/search
 * Search Twitter/X tweets
 */
router.get('/twitter/search', verifyApiKey, logApiRequest, afterRequest('twitter', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, limit, filter } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/twitter/search?query=artificial intelligence&filter=latest&limit=20',
      });
    }

    const result = await searchTwitter(searchQuery, limit ? parseInt(limit, 10) : 20, filter || 'top');
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Twitter search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search Twitter',
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

/**
 * GET /api/scrape/linkedin/company
 * Scrape LinkedIn company page
 */
router.get('/linkedin/company', verifyApiKey, logApiRequest, afterRequest('linkedin', 'company'), async (req, res) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: company_id',
        example: '/api/scrape/linkedin/company?company_id=microsoft',
      });
    }

    const result = await scrapeLinkedInCompany(company_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('LinkedIn company scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape LinkedIn company',
      message: error.message,
    });
  }
});

// ==================== Facebook Routes ====================

/**
 * GET /api/scrape/facebook/profile
 * Scrape Facebook profile
 */
router.get('/facebook/profile', verifyApiKey, logApiRequest, afterRequest('facebook', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/facebook/profile?username=zuck',
      });
    }

    const result = await scrapeFacebookProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Facebook profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Facebook profile',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/facebook/posts
 * Scrape Facebook user/page posts
 */
router.get('/facebook/posts', verifyApiKey, logApiRequest, afterRequest('facebook', 'posts'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/facebook/posts?username=zuck&limit=20',
      });
    }

    const result = await scrapeFacebookPosts(username, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Facebook posts scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Facebook posts',
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

/**
 * GET /api/scrape/reddit/comments
 * Scrape Reddit post comments
 */
router.get('/reddit/comments', verifyApiKey, logApiRequest, afterRequest('reddit', 'comments'), async (req, res) => {
  try {
    const { subreddit, post_id, limit } = req.query;

    if (!subreddit || !post_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: subreddit and post_id',
        example: '/api/scrape/reddit/comments?subreddit=programming&post_id=abc123&limit=50',
      });
    }

    const result = await scrapeRedditComments(subreddit, post_id, limit ? parseInt(limit, 10) : 50);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Reddit comments scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Reddit comments',
      message: error.message,
    });
  }
});

// ==================== Threads Routes ====================

/**
 * GET /api/scrape/threads/profile
 * Scrape Threads profile
 */
router.get('/threads/profile', verifyApiKey, logApiRequest, afterRequest('threads', 'profile'), async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/threads/profile?username=zuck',
      });
    }

    const result = await scrapeThreadsProfile(username);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Threads profile scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Threads profile',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/threads/posts
 * Scrape Threads user posts
 */
router.get('/threads/posts', verifyApiKey, logApiRequest, afterRequest('threads', 'posts'), async (req, res) => {
  try {
    const { username, limit } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: username',
        example: '/api/scrape/threads/posts?username=zuck&limit=20',
      });
    }

    const result = await scrapeThreadsPosts(username, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Threads posts scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Threads posts',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/threads/post
 * Scrape Threads single post
 */
router.get('/threads/post', verifyApiKey, logApiRequest, afterRequest('threads', 'post'), async (req, res) => {
  try {
    const { post_id } = req.query;

    if (!post_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: post_id',
        example: '/api/scrape/threads/post?post_id=ABC123',
      });
    }

    const result = await scrapeThreadsPost(post_id);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Threads post scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Threads post',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/threads/search
 * Search Threads posts
 */
router.get('/threads/search', verifyApiKey, logApiRequest, afterRequest('threads', 'search'), async (req, res) => {
  try {
    const { query: searchQuery, limit } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/threads/search?query=technology&limit=20',
      });
    }

    const result = await searchThreadsPosts(searchQuery, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Threads search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search Threads',
      message: error.message,
    });
  }
});

/**
 * GET /api/scrape/threads/search-users
 * Search Threads users
 */
router.get('/threads/search-users', verifyApiKey, logApiRequest, afterRequest('threads', 'search-users'), async (req, res) => {
  try {
    const { query: searchQuery, limit } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: query',
        example: '/api/scrape/threads/search-users?query=tech&limit=20',
      });
    }

    const result = await searchThreadsUsers(searchQuery, limit ? parseInt(limit, 10) : 20);
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Threads user search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to search Threads users',
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
      total_endpoints: 45,
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
            {
              path: '/api/scrape/tiktok/video',
              description: 'Get TikTok video details',
              params: ['video_id'],
              example: '?video_id=7234567890123456789',
            },
            {
              path: '/api/scrape/tiktok/trending',
              description: 'Get TikTok trending/For You videos',
              params: ['limit (optional)'],
              example: '?limit=30',
            },
            {
              path: '/api/scrape/tiktok/comments',
              description: 'Get TikTok video comments',
              params: ['video_id', 'limit (optional)'],
              example: '?video_id=7234567890123456789&limit=50',
            },
            {
              path: '/api/scrape/tiktok/search',
              description: 'Search TikTok for users, videos, hashtags, sounds',
              params: ['query', 'type (optional)', 'limit (optional)', 'cursor (optional)'],
              example: '?query=dance&type=videos&limit=20',
            },
            {
              path: '/api/scrape/tiktok/sound',
              description: 'Get TikTok sound/music details',
              params: ['sound_id'],
              example: '?sound_id=1234567890',
            },
            {
              path: '/api/scrape/tiktok/analytics',
              description: 'Get TikTok user analytics with engagement metrics',
              params: ['username'],
              example: '?username=charlidamelio',
            },
            {
              path: '/api/scrape/tiktok/demographics',
              description: 'Get TikTok user audience demographics',
              params: ['username'],
              example: '?username=charlidamelio',
            },
            {
              path: '/api/scrape/tiktok/transcript',
              description: 'Get TikTok video transcript, captions, and subtitles',
              params: ['video_id', 'include_subtitles (optional)'],
              example: '?video_id=7234567890123456789&include_subtitles=true',
            },
            {
              path: '/api/scrape/tiktok/followers',
              description: 'Get TikTok user followers list with pagination',
              params: ['username', 'cursor (optional)', 'limit (optional)'],
              example: '?username=charlidamelio&limit=20',
            },
            {
              path: '/api/scrape/tiktok/following',
              description: 'Get TikTok user following list with pagination',
              params: ['username', 'cursor (optional)', 'limit (optional)'],
              example: '?username=charlidamelio&limit=20',
            },
          ],
        },
        {
          name: 'TikTok Shop',
          endpoints: [
            {
              path: '/api/scrape/tiktok-shop/search',
              description: 'Search TikTok Shop products',
              params: ['query', 'cursor (optional)', 'limit (optional)'],
              example: '?query=sneakers&limit=20',
            },
            {
              path: '/api/scrape/tiktok-shop/product',
              description: 'Get TikTok Shop product details',
              params: ['product_id'],
              example: '?product_id=1234567890',
            },
            {
              path: '/api/scrape/tiktok-shop/reviews',
              description: 'Get TikTok Shop product reviews',
              params: ['product_id', 'limit (optional)', 'cursor (optional)', 'filter (optional)'],
              example: '?product_id=1234567890&limit=50&filter=all',
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
            {
              path: '/api/scrape/instagram/posts',
              description: 'Get Instagram user posts/feed',
              params: ['username', 'limit (optional)'],
              example: '?username=instagram&limit=12',
            },
            {
              path: '/api/scrape/instagram/post',
              description: 'Get Instagram post details',
              params: ['shortcode'],
              example: '?shortcode=CXtWMB2goFp',
            },
            {
              path: '/api/scrape/instagram/comments',
              description: 'Get Instagram post comments',
              params: ['shortcode', 'limit (optional)'],
              example: '?shortcode=CXtWMB2goFp&limit=50',
            },
            {
              path: '/api/scrape/instagram/search',
              description: 'Search Instagram (users, hashtags, posts, places)',
              params: ['query', 'type (optional)', 'limit (optional)'],
              example: '?query=travel&type=users&limit=20',
            },
            {
              path: '/api/scrape/instagram/reels',
              description: 'Get Instagram Reels from user profile',
              params: ['username', 'limit (optional)'],
              example: '?username=instagram&limit=12',
            },
            {
              path: '/api/scrape/instagram/stories',
              description: 'Get Instagram Stories from user profile',
              params: ['username'],
              example: '?username=instagram',
            },
            {
              path: '/api/scrape/instagram/hashtag',
              description: 'Get Instagram hashtag performance and top posts',
              params: ['hashtag', 'limit (optional)'],
              example: '?hashtag=travel&limit=12',
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
            {
              path: '/api/scrape/youtube/videos',
              description: 'Get YouTube channel videos',
              params: ['channel_id', 'limit (optional)'],
              example: '?channel_id=@MrBeast&limit=20',
            },
            {
              path: '/api/scrape/youtube/video',
              description: 'Get YouTube video details',
              params: ['video_id'],
              example: '?video_id=dQw4w9WgXcQ',
            },
            {
              path: '/api/scrape/youtube/comments',
              description: 'Get YouTube video comments',
              params: ['video_id', 'limit (optional)'],
              example: '?video_id=dQw4w9WgXcQ&limit=50',
            },
            {
              path: '/api/scrape/youtube/search',
              description: 'Search YouTube videos',
              params: ['query', 'limit (optional)'],
              example: '?query=ai tutorial&limit=20',
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
            {
              path: '/api/scrape/twitter/feed',
              description: 'Get Twitter/X user feed/tweets',
              params: ['username', 'limit (optional)'],
              example: '?username=elonmusk&limit=20',
            },
            {
              path: '/api/scrape/twitter/search',
              description: 'Search Twitter/X tweets',
              params: ['query', 'filter (optional)', 'limit (optional)'],
              example: '?query=artificial intelligence&filter=latest&limit=20',
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
            {
              path: '/api/scrape/linkedin/company',
              description: 'Get LinkedIn company page data',
              params: ['company_id'],
              example: '?company_id=microsoft',
            },
          ],
        },
        {
          name: 'Facebook',
          endpoints: [
            {
              path: '/api/scrape/facebook/profile',
              description: 'Get Facebook profile data',
              params: ['username'],
              example: '?username=zuck',
            },
            {
              path: '/api/scrape/facebook/posts',
              description: 'Get Facebook user/page posts',
              params: ['username', 'limit (optional)'],
              example: '?username=zuck&limit=20',
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
            {
              path: '/api/scrape/reddit/comments',
              description: 'Get Reddit post comments',
              params: ['subreddit', 'post_id', 'limit (optional)'],
              example: '?subreddit=programming&post_id=abc123&limit=50',
            },
          ],
        },
        {
          name: 'Threads',
          endpoints: [
            {
              path: '/api/scrape/threads/profile',
              description: 'Get Threads profile data',
              params: ['username'],
              example: '?username=zuck',
            },
            {
              path: '/api/scrape/threads/posts',
              description: 'Get Threads user posts',
              params: ['username', 'limit (optional)'],
              example: '?username=zuck&limit=20',
            },
            {
              path: '/api/scrape/threads/post',
              description: 'Get Threads single post details',
              params: ['post_id'],
              example: '?post_id=ABC123',
            },
            {
              path: '/api/scrape/threads/search',
              description: 'Search Threads posts by keyword',
              params: ['query', 'limit (optional)'],
              example: '?query=technology&limit=20',
            },
            {
              path: '/api/scrape/threads/search-users',
              description: 'Search Threads users by keyword',
              params: ['query', 'limit (optional)'],
              example: '?query=tech&limit=20',
            },
          ],
        },
      ],
    },
  });
});

module.exports = router;
