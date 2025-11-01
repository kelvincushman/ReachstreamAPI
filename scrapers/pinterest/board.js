/**
 * Pinterest Board Details Scraper
 * Get details and pins from a specific Pinterest board
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
 * Get Pinterest board details
 * @param {string} username - Pinterest username
 * @param {string} boardSlug - Board slug/name
 * @param {number} limit - Number of pins to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Board details
 */
const getBoardDetails = async (username, boardSlug, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate inputs
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    if (!boardSlug || typeof boardSlug !== 'string') {
      throw new Error('Invalid board slug provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct Pinterest board URL
    const boardUrl = `https://www.pinterest.com/${username}/${boardSlug}/`;

    console.log(`Getting Pinterest board: ${boardUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: boardUrl,
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
      throw new Error('Could not find board data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Get board data
    const boards = data?.initialReduxState?.boards || {};
    const boardId = Object.keys(boards)[0];
    const board = boards[boardId];

    if (!board) {
      throw new Error('Board not found');
    }

    // Get pins from the board
    const pins = data?.initialReduxState?.pins || {};
    const pinIds = Object.keys(pins).slice(0, limit);

    const boardPins = pinIds.map(pinId => {
      const pin = pins[pinId];

      return {
        pin_id: pin.id,
        title: pin.title || '',
        description: pin.description || '',
        url: `https://www.pinterest.com/pin/${pin.id}/`,
        image_url: pin.images?.['736x']?.url || pin.images?.orig?.url || null,
        thumbnail_url: pin.images?.['236x']?.url || null,
        stats: {
          saves: pin.aggregated_pin_data?.aggregated_stats?.saves || 0,
          comments: pin.comment_count || 0,
        },
      };
    });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        board: {
          board_id: board.id,
          name: board.name,
          description: board.description || '',
          url: boardUrl,
          pin_count: board.pin_count || 0,
          follower_count: board.follower_count || 0,
          cover_image: board.image_cover_url || null,
          privacy: board.privacy || 'public',
          created_at: board.created_at || null,
        },
        pins: boardPins,
        total_pins_returned: boardPins.length,
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

    console.error('Pinterest board details error:', error.message);

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
    const username = event.queryStringParameters?.username || event.username;
    const boardSlug = event.queryStringParameters?.board_slug || event.board_slug;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    if (!boardSlug) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: board_slug',
        }),
      };
    }

    const result = await getBoardDetails(username, boardSlug, parseInt(limit, 10));

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
  getBoardDetails,
  handler,
};
