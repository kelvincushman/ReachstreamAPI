/**
 * TikTok Profile Scraper
 * Fetches public profile data from TikTok using Oxylabs proxy
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
 * Extract profile data from TikTok HTML
 * @param {string} html - HTML content
 * @param {string} username - TikTok username
 * @returns {object} Extracted profile data
 */
const extractProfileData = (html, username) => {
  try {
    // TikTok embeds data in a script tag with id="__UNIVERSAL_DATA_FOR_REHYDRATION__"
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find profile data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const userDetail = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;

    if (!userDetail) {
      throw new Error('Profile data structure not found');
    }

    const user = userDetail.user;
    const stats = userDetail.stats;

    return {
      success: true,
      data: {
        user_id: user.id,
        username: user.uniqueId,
        nickname: user.nickname,
        avatar_url: user.avatarLarger || user.avatarMedium || user.avatarThumb,
        signature: user.signature,
        verified: user.verified,
        private_account: user.privateAccount,
        follower_count: stats.followerCount,
        following_count: stats.followingCount,
        video_count: stats.videoCount,
        heart_count: stats.heartCount,
        profile_url: `https://www.tiktok.com/@${username}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    throw new Error(`Failed to extract profile data: ${error.message}`);
  }
};

/**
 * Scrape TikTok profile by username
 * @param {string} username - TikTok username (without @)
 * @returns {Promise<object>} Profile data
 */
const scrapeProfile = async (username) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct TikTok profile URL
    const url = `https://www.tiktok.com/@${cleanUsername}`;

    console.log(`Scraping TikTok profile: ${url}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: {
        request: 30000, // 30 second timeout
      },
      retry: {
        limit: 2, // Retry twice on failure
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    // Extract profile data from HTML
    const profileData = extractProfileData(response.body, cleanUsername);

    const responseTime = Date.now() - startTime;

    return {
      ...profileData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok scraping error:', error.message);

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
    // Extract username from event (API Gateway or direct invocation)
    const username = event.queryStringParameters?.username || event.username;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape profile
    const result = await scrapeProfile(username);

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
