/**
 * TikTok Search Users Scraper
 * Search for TikTok users by keyword
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
 * Extract user search results from TikTok HTML
 * @param {string} html - HTML content
 * @param {string} query - Search query
 * @param {number} limit - Number of users to extract
 * @returns {object} Extracted search results
 */
const extractUserSearchResults = (html, query, limit) => {
  try {
    // TikTok embeds data in script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to search results
    const searchResults = data?.__DEFAULT_SCOPE__?.['webapp.search-results']?.userList || [];

    // Extract user information
    const users = searchResults.slice(0, limit).map(user => {
      return {
        user_id: user.user?.id || user.user?.uid,
        username: user.user?.uniqueId,
        nickname: user.user?.nickname,
        avatar: user.user?.avatarThumb || user.user?.avatarMedium || user.user?.avatarLarger,
        signature: user.user?.signature || '',
        is_verified: user.user?.verified || false,
        follower_count: user.user?.followerCount || 0,
        following_count: user.user?.followingCount || 0,
        video_count: user.user?.videoCount || 0,
        likes_count: user.user?.heartCount || 0,
        profile_url: `https://www.tiktok.com/@${user.user?.uniqueId}`,
      };
    });

    // Calculate statistics
    const totalFollowers = users.reduce((sum, user) => sum + user.follower_count, 0);
    const avgFollowers = users.length > 0 ? Math.round(totalFollowers / users.length) : 0;
    const verifiedCount = users.filter(u => u.is_verified).length;

    return {
      success: true,
      data: {
        query,
        total_results: users.length,
        users,
        statistics: {
          total_followers: totalFollowers,
          avg_followers: avgFollowers,
          verified_count: verifiedCount,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting user search results:', error);
    throw new Error(`Failed to extract search results: ${error.message}`);
  }
};

/**
 * Search TikTok users
 * @param {string} query - Search query
 * @param {number} limit - Number of users to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Search results
 */
const searchUsers = async (query, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct TikTok search URL for users
    const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`;

    console.log(`Searching TikTok users: ${searchUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: searchUrl,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.tiktok.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1',
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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    // Extract search results
    const searchResults = extractUserSearchResults(response.body, query, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...searchResults,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok user search error:', error.message);

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
    // Extract parameters from event (API Gateway or direct invocation)
    const query = event.queryStringParameters?.query || event.query;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
        }),
      };
    }

    // Search users
    const result = await searchUsers(query, parseInt(limit, 10));

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
  searchUsers,
  handler,
};
