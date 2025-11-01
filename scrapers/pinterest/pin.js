/**
 * Pinterest Pin Scraper
 * Get details of a single Pinterest pin
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
 * Get Pinterest pin details
 * @param {string} pinId - Pinterest pin ID
 * @returns {Promise<object>} Pin details
 */
const getPin = async (pinId) => {
  const startTime = Date.now();

  try {
    // Validate pinId
    if (!pinId || typeof pinId !== 'string') {
      throw new Error('Invalid pin ID provided');
    }

    // Construct Pinterest pin URL
    const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;

    console.log(`Getting Pinterest pin: ${pinUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: pinUrl,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: {
        request: 30000,
      },
      retry: {
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Pinterest returned status ${response.statusCode}`);
    }

    // Pinterest embeds data in script tag
    const dataMatch = response.body.match(/<script id="__PWS_INITIAL_PROPS__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find pin data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const pin = data?.initialReduxState?.pins?.[pinId];

    if (!pin) {
      throw new Error('Pin not found');
    }

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        pin_id: pin.id,
        title: pin.title || '',
        description: pin.description || '',
        url: pinUrl,
        image_url: pin.images?.orig?.url || null,
        thumbnail_url: pin.images?.['236x']?.url || null,
        pinner: {
          id: pin.pinner?.id || null,
          username: pin.pinner?.username || null,
          full_name: pin.pinner?.full_name || null,
          profile_url: pin.pinner?.username ? `https://www.pinterest.com/${pin.pinner.username}/` : null,
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

    console.error('Pinterest pin error:', error.message);

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
 * Lambda handler function
 */
const handler = async (event) => {
  try {
    const pinId = event.queryStringParameters?.pin_id || event.pin_id;

    if (!pinId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: pin_id',
        }),
      };
    }

    const result = await getPin(pinId);

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result),
    };
  } catch (error) {
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
  getPin,
  handler,
};
