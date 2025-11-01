/**
 * Threads Profile Scraper
 * Fetches Threads profile data including follower count, bio, and statistics
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
 * Extract profile data from Threads HTML
 * @param {string} html - HTML content
 * @param {string} username - Threads username
 * @returns {object} Extracted profile data
 */
const extractProfileData = (html, username) => {
  try {
    // Threads embeds data in script tag similar to Instagram
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find profile data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user data - Threads uses similar structure to Instagram
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.userData;

    if (!userData) {
      throw new Error('Profile data structure not found');
    }

    const user = userData.user;

    // Extract profile information
    const profileData = {
      user_id: user.pk || user.id,
      username: user.username,
      full_name: user.full_name || '',
      biography: user.biography || '',
      biography_links: user.bio_links || [],
      profile_pic_url: user.profile_pic_url || user.hd_profile_pic_url_info?.url || '',
      is_verified: user.is_verified || false,
      is_private: user.is_private || false,
      follower_count: user.follower_count || 0,
      following_count: user.following_count || 0,
      post_count: user.media_count || 0,
      external_url: user.external_url || null,
      is_business_account: user.is_business || false,
      category: user.category || null,
      profile_url: `https://www.threads.net/@${username}`,
    };

    // Calculate engagement metrics if available
    const recentPosts = userData.edge_owner_to_timeline_media?.edges || [];

    if (recentPosts.length > 0) {
      const totalLikes = recentPosts.reduce((sum, edge) => sum + (edge.node.edge_liked_by?.count || 0), 0);
      const totalComments = recentPosts.reduce((sum, edge) => sum + (edge.node.edge_media_to_comment?.count || 0), 0);
      const avgLikes = Math.round(totalLikes / recentPosts.length);
      const avgComments = Math.round(totalComments / recentPosts.length);

      profileData.engagement = {
        avg_likes_per_post: avgLikes,
        avg_comments_per_post: avgComments,
        engagement_rate: user.follower_count > 0
          ? parseFloat((((avgLikes + avgComments) / user.follower_count) * 100).toFixed(2))
          : 0,
      };
    }

    return {
      success: true,
      data: profileData,
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    throw new Error(`Failed to extract profile data: ${error.message}`);
  }
};

/**
 * Scrape Threads profile by username
 * @param {string} username - Threads username (with or without @)
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

    // Construct Threads profile URL
    const url = `https://www.threads.net/@${cleanUsername}`;

    console.log(`Scraping Threads profile: ${url}`);

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
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`Threads returned status ${response.statusCode}`);
    }

    // Extract profile data
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

    console.error('Threads profile scraping error:', error.message);

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
