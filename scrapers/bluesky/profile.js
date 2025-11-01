/**
 * Bluesky Profile Scraper
 * Fetches Bluesky profile data including follower count, bio, and statistics
 */

const { gotScraping } = require('got-scraping');
require('dotenv').config();

// Oxylabs proxy configuration
const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;
const OXYLABS_HOST = process.env.OXYLABS_HOST || 'pr.oxylabs.io';
const OXYLABS_PORT = process.env.OXYLABS_PORT || 7777;

/**
 * Create proxy URL for Oxylabs
 * @returns {string} Proxy URL
 */
const getProxyUrl = () => {
  return `http://${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}@${OXYLABS_HOST}:${OXYLABS_PORT}`;
};

/**
 * Scrape Bluesky profile by handle
 * @param {string} handle - Bluesky handle (e.g., user.bsky.social)
 * @returns {Promise<object>} Profile data
 */
const scrapeProfile = async (handle) => {
  const startTime = Date.now();

  try {
    // Validate handle
    if (!handle || typeof handle !== 'string') {
      throw new Error('Invalid handle provided');
    }

    // Clean handle (remove @ if present)
    const cleanHandle = handle.replace('@', '');

    // Bluesky API endpoint for profile
    const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(cleanHandle)}`;

    console.log(`Scraping Bluesky profile: ${apiUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: apiUrl,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: {
        request: 30000, // 30 second timeout
      },
      retry: {
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`Bluesky API returned status ${response.statusCode}`);
    }

    // Parse JSON response
    const data = JSON.parse(response.body);

    // Extract profile information
    const profileData = {
      did: data.did,
      handle: data.handle,
      display_name: data.displayName || '',
      description: data.description || '',
      avatar: data.avatar || null,
      banner: data.banner || null,
      follower_count: data.followersCount || 0,
      following_count: data.followsCount || 0,
      post_count: data.postsCount || 0,
      created_at: data.createdAt || null,
      indexed_at: data.indexedAt || null,
      is_verified: data.associated?.labeler || false,
      labels: data.labels || [],
      profile_url: `https://bsky.app/profile/${cleanHandle}`,
    };

    // Calculate engagement metrics if available
    if (data.postsCount > 0 && data.followersCount > 0) {
      // Estimate average engagement (this is an approximation)
      const avgPostsPerDay = data.postsCount / Math.max(1, Math.floor((Date.now() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)));

      profileData.metrics = {
        avg_posts_per_day: parseFloat(avgPostsPerDay.toFixed(2)),
        follower_to_following_ratio: data.followsCount > 0
          ? parseFloat((data.followersCount / data.followsCount).toFixed(2))
          : data.followersCount,
      };
    }

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: profileData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Bluesky profile scraping error:', error.message);

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

/**
 * Lambda handler function for AWS Lambda deployment
 * @param {object} event - Lambda event object
 * @returns {Promise<object>} Lambda response
 */
const handler = async (event) => {
  try {
    // Extract handle from event (API Gateway or direct invocation)
    const handle = event.queryStringParameters?.handle || event.handle;

    if (!handle) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: handle',
        }),
      };
    }

    // Scrape profile
    const result = await scrapeProfile(handle);

    if (!result.success) {
      return {
        statusCode: 500,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 200,
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

module.exports = {
  scrapeProfile,
  handler,
};
