/**
 * Pinterest Boards Scraper
 * Get user's Pinterest boards
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
 * Get user's Pinterest boards
 * @param {string} username - Pinterest username
 * @returns {Promise<object>} User boards
 */
const getUserBoards = async (username) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Construct Pinterest user URL
    const userUrl = `https://www.pinterest.com/${username}/`;

    console.log(`Getting Pinterest boards: ${userUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: userUrl,
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
      throw new Error('Could not find boards data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const boards = data?.initialReduxState?.boards || {};
    const boardIds = Object.keys(boards);

    // Extract board information
    const results = boardIds.map(boardId => {
      const board = boards[boardId];

      return {
        board_id: board.id,
        name: board.name,
        description: board.description || '',
        url: `https://www.pinterest.com${board.url}`,
        pin_count: board.pin_count || 0,
        follower_count: board.follower_count || 0,
        cover_image: board.image_cover_url || null,
        privacy: board.privacy || 'public',
        created_at: board.created_at || null,
      };
    });

    // Calculate statistics
    const totalPins = results.reduce((sum, board) => sum + board.pin_count, 0);
    const totalFollowers = results.reduce((sum, board) => sum + board.follower_count, 0);
    const avgPinsPerBoard = results.length > 0 ? Math.round(totalPins / results.length) : 0;

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        username,
        total_boards: results.length,
        boards: results,
        statistics: {
          total_pins: totalPins,
          total_followers: totalFollowers,
          avg_pins_per_board: avgPinsPerBoard,
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

    console.error('Pinterest boards error:', error.message);

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

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    const result = await getUserBoards(username);

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
  getUserBoards,
  handler,
};
