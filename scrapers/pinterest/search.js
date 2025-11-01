/**
 * Pinterest Search Scraper
 * Search for Pinterest pins by keyword
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
 * Search Pinterest pins
 * @param {string} query - Search query
 * @param {number} limit - Number of pins to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Search results
 */
const searchPins = async (query, limit = 20) => {
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

    // Construct Pinterest search URL
    const searchUrl = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;

    console.log(`Searching Pinterest: ${searchUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: searchUrl,
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
      throw new Error(`Pinterest returned status ${response.statusCode}`);
    }

    // Pinterest embeds data in script tag
    const dataMatch = response.body.match(/<script id="__PWS_INITIAL_PROPS__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find Pinterest data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to pins data
    const pins = data?.initialReduxState?.pins || {};
    const pinIds = Object.keys(pins).slice(0, limit);

    // Extract pin information
    const results = pinIds.map(pinId => {
      const pin = pins[pinId];

      return {
        pin_id: pin.id,
        title: pin.title || '',
        description: pin.description || '',
        url: `https://www.pinterest.com/pin/${pin.id}/`,
        image_url: pin.images?.['736x']?.url || pin.images?.orig?.url || null,
        thumbnail_url: pin.images?.['236x']?.url || null,
        pinner: {
          id: pin.pinner?.id || null,
          username: pin.pinner?.username || null,
          full_name: pin.pinner?.full_name || null,
        },
        board: {
          id: pin.board?.id || null,
          name: pin.board?.name || null,
          url: pin.board?.url ? `https://www.pinterest.com${pin.board.url}` : null,
        },
        stats: {
          saves: pin.aggregated_pin_data?.aggregated_stats?.saves || 0,
          comments: pin.comment_count || 0,
        },
        created_at: pin.created_at || null,
      };
    });

    // Calculate statistics
    const totalSaves = results.reduce((sum, pin) => sum + pin.stats.saves, 0);
    const avgSaves = results.length > 0 ? Math.round(totalSaves / results.length) : 0;
    const maxSaves = results.length > 0 ? Math.max(...results.map(p => p.stats.saves)) : 0;

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        query,
        total_results: results.length,
        pins: results,
        statistics: {
          total_saves: totalSaves,
          avg_saves: avgSaves,
          max_saves: maxSaves,
        },
        scraped_at: new Date().toISOString(),
      },
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Pinterest search error:', error.message);

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

    // Search pins
    const result = await searchPins(query, parseInt(limit, 10));

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
  searchPins,
  handler,
};
