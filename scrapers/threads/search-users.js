/**
 * Threads User Search Scraper
 * Search for Threads users by keyword
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
 * Extract user search results from Threads HTML
 * @param {string} html - HTML content
 * @param {string} query - Search query
 * @param {number} limit - Number of results to extract
 * @returns {object} Extracted user search results
 */
const extractUserSearchResults = (html, query, limit) => {
  try {
    // Threads embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user search results
    const searchData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data;

    if (!searchData) {
      throw new Error('User search data structure not found');
    }

    // Extract users from search results
    const usersEdges = searchData.xdt_api__v1__users__search?.users || [];

    const users = usersEdges.slice(0, limit).map(user => {
      return {
        user_id: user.pk || user.id,
        username: user.username,
        full_name: user.full_name || '',
        biography: user.biography || '',
        profile_pic_url: user.profile_pic_url || user.hd_profile_pic_url_info?.url || '',
        profile_url: `https://www.threads.net/@${user.username}`,
        is_verified: user.is_verified || false,
        is_private: user.is_private || false,
        follower_count: user.follower_count || 0,
        following_count: user.following_count || null,
        post_count: user.media_count || null,
        is_business_account: user.is_business || false,
        category: user.category || null,
        external_url: user.external_url || null,
      };
    });

    // Calculate search statistics
    const totalResults = users.length;
    const verifiedCount = users.filter(u => u.is_verified).length;
    const businessCount = users.filter(u => u.is_business_account).length;
    const privateCount = users.filter(u => u.is_private).length;

    // Calculate average follower count
    const avgFollowers = users.length > 0
      ? Math.round(users.reduce((sum, u) => sum + u.follower_count, 0) / users.length)
      : 0;

    // Sort users by follower count
    const sortedByFollowers = [...users].sort((a, b) => b.follower_count - a.follower_count);
    const topUser = sortedByFollowers[0] || null;

    return {
      success: true,
      data: {
        query,
        total_results: totalResults,
        users,
        statistics: {
          verified_users: verifiedCount,
          business_accounts: businessCount,
          private_accounts: privateCount,
          avg_follower_count: avgFollowers,
          top_user: topUser ? {
            username: topUser.username,
            followers: topUser.follower_count,
          } : null,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting user search results:', error);
    throw new Error(`Failed to extract user search results: ${error.message}`);
  }
};

/**
 * Search Threads users by keyword
 * @param {string} query - Search query
 * @param {number} limit - Number of results to fetch (default: 20)
 * @returns {Promise<object>} User search results
 */
const searchUsers = async (query, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Construct Threads search URL for users
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.threads.net/search?q=${encodedQuery}&type=users`;

    console.log(`Searching Threads users: ${url}`);

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

    // Extract user search results
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

    console.error('Threads user search error:', error.message);

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
