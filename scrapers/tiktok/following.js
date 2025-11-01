/**
 * TikTok Following Scraper
 * Fetches list of users that a TikTok user is following with pagination support
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
 * Extract following data from TikTok HTML
 * @param {string} html - HTML content
 * @param {string} username - TikTok username
 * @param {number} limit - Number of users to extract
 * @returns {object} Extracted following data
 */
const extractFollowingData = (html, username, limit) => {
  try {
    // TikTok embeds data in script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find following data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to following data
    const followingData = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo?.user?.followingCount;
    const followingListData = data?.__DEFAULT_SCOPE__?.['webapp.user-following']?.following;

    if (!followingListData) {
      throw new Error('Following list data structure not found');
    }

    // Extract following information
    const following = followingListData.slice(0, limit).map(user => {
      return {
        user_id: user.uid || user.id,
        username: user.uniqueId,
        nickname: user.nickname,
        avatar: user.avatarThumb || user.avatarMedium || user.avatarLarger,
        signature: user.signature || '',
        is_verified: user.verified || false,
        follower_count: user.followerCount || 0,
        following_count: user.followingCount || 0,
        video_count: user.videoCount || 0,
        profile_url: `https://www.tiktok.com/@${user.uniqueId}`,
      };
    });

    // Check if there are more users available
    const hasMore = followingListData.length > limit;
    const nextCursor = hasMore ? followingListData[limit]?.uid : null;

    return {
      success: true,
      data: {
        username,
        profile_url: `https://www.tiktok.com/@${username}`,
        total_following: followingData || following.length,
        following,
        has_more: hasMore,
        next_cursor: nextCursor,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting following data:', error);
    throw new Error(`Failed to extract following data: ${error.message}`);
  }
};

/**
 * Scrape TikTok following by username
 * @param {string} username - TikTok username (with or without @)
 * @param {string} cursor - Pagination cursor (optional)
 * @param {number} limit - Number of users to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Following data
 */
const scrapeFollowing = async (username, cursor = null, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct TikTok following URL
    let url = `https://www.tiktok.com/@${cleanUsername}/following`;
    if (cursor) {
      url += `?cursor=${cursor}`;
    }

    console.log(`Scraping TikTok following: ${url}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
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

    // Extract following data
    const followingData = extractFollowingData(response.body, cleanUsername, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...followingData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok following scraping error:', error.message);

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
    const username = event.queryStringParameters?.username || event.username;
    const cursor = event.queryStringParameters?.cursor || event.cursor || null;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape following
    const result = await scrapeFollowing(username, cursor, parseInt(limit, 10));

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
  scrapeFollowing,
  handler,
};
