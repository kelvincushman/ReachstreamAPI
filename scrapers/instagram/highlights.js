/**
 * Instagram Story Highlights Scraper
 * Fetches Instagram Story Highlights from a user's profile
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
 * Extract Story Highlights data from Instagram HTML/API response
 * @param {string} html - HTML content
 * @param {string} username - Instagram username
 * @param {number} limit - Number of highlights to extract
 * @returns {object} Extracted Story Highlights data
 */
const extractHighlightsData = (html, username, limit) => {
  try {
    // Instagram embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find Story Highlights data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user data and highlights
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.user;

    if (!userData) {
      throw new Error('Story Highlights data structure not found');
    }

    // Extract highlights from edge_highlight_reels
    const highlightsEdge = userData.edge_highlight_reels || {};
    const highlightNodes = highlightsEdge.edges || [];

    if (highlightNodes.length === 0) {
      return {
        success: true,
        data: {
          username,
          total_highlights: 0,
          highlights: [],
          statistics: {
            total_items: 0,
            total_highlights: 0,
            avg_items_per_highlight: 0,
          },
          scraped_at: new Date().toISOString(),
        },
      };
    }

    const highlights = highlightNodes.slice(0, limit).map(edge => {
      const node = edge.node;

      return {
        id: node.id,
        title: node.title || '',
        cover_image: node.cover_media?.thumbnail_src || node.cover_media_cropped_thumbnail?.url || null,
        url: `https://www.instagram.com/stories/highlights/${node.id}/`,
        owner: {
          id: node.owner?.id,
          username: node.owner?.username || username,
        },
        items_count: node.media_count || 0,
      };
    });

    // Calculate statistics
    const totalItems = highlights.reduce((sum, highlight) => sum + highlight.items_count, 0);
    const avgItemsPerHighlight = highlights.length > 0 ? Math.round(totalItems / highlights.length) : 0;

    return {
      success: true,
      data: {
        username,
        total_highlights: highlights.length,
        highlights,
        statistics: {
          total_items: totalItems,
          total_highlights: highlights.length,
          avg_items_per_highlight: avgItemsPerHighlight,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting Story Highlights data:', error);
    throw new Error(`Failed to extract Story Highlights data: ${error.message}`);
  }
};

/**
 * Scrape Instagram Story Highlights
 * @param {string} username - Instagram username
 * @param {number} limit - Number of highlights to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Story Highlights data
 */
const scrapeHighlights = async (username, limit = 20) => {
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

    // Clean username (remove @ if present)
    const cleanUsername = username.replace('@', '');

    // Construct Instagram URL
    const url = `https://www.instagram.com/${cleanUsername}/`;

    console.log(`Scraping Instagram Story Highlights: ${url}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
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
      throw new Error(`Instagram returned status ${response.statusCode}`);
    }

    // Extract Story Highlights data
    const highlightsData = extractHighlightsData(response.body, cleanUsername, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...highlightsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Instagram Story Highlights scraping error:', error.message);

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
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape Story Highlights
    const result = await scrapeHighlights(username, parseInt(limit, 10));

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
  scrapeHighlights,
  handler,
};
