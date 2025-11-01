/**
 * YouTube Shorts Scraper
 * Fetches YouTube Shorts videos from a channel
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
 * Extract Shorts data from YouTube HTML
 * @param {string} html - HTML content
 * @param {string} channelId - YouTube channel ID
 * @param {number} limit - Number of Shorts to extract
 * @returns {object} Extracted Shorts data
 */
const extractShortsData = (html, channelId, limit) => {
  try {
    // YouTube embeds data in script tag
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find Shorts data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to Shorts tab content
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const shortsTab = tabs.find(tab =>
      tab.tabRenderer?.title === 'Shorts' ||
      tab.tabRenderer?.endpoint?.browseEndpoint?.canonicalBaseUrl?.includes('/shorts')
    );

    if (!shortsTab) {
      throw new Error('Shorts tab not found - channel may not have Shorts');
    }

    const shortsContent = shortsTab.tabRenderer?.content?.richGridRenderer?.contents || [];

    // Extract Shorts information
    const shorts = shortsContent
      .filter(item => item.richItemRenderer?.content?.reelItemRenderer)
      .slice(0, limit)
      .map(item => {
        const reel = item.richItemRenderer.content.reelItemRenderer;

        return {
          video_id: reel.videoId,
          title: reel.headline?.simpleText || '',
          url: `https://www.youtube.com/shorts/${reel.videoId}`,
          thumbnail: reel.thumbnail?.thumbnails?.[0]?.url || null,
          view_count: reel.viewCountText?.simpleText || '0',
          accessibility_label: reel.accessibility?.accessibilityData?.label || '',
        };
      });

    return {
      success: true,
      data: {
        channel_id: channelId,
        total_shorts: shorts.length,
        shorts,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting Shorts data:', error);
    throw new Error(`Failed to extract Shorts data: ${error.message}`);
  }
};

/**
 * Scrape YouTube Shorts from channel
 * @param {string} channelId - YouTube channel ID or handle
 * @param {number} limit - Number of Shorts to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Shorts data
 */
const scrapeShorts = async (channelId, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate channelId
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Invalid channel ID provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct YouTube Shorts URL
    // Support both channel IDs (UC...) and handles (@username)
    let url;
    if (channelId.startsWith('@')) {
      url = `https://www.youtube.com/${channelId}/shorts`;
    } else if (channelId.startsWith('UC')) {
      url = `https://www.youtube.com/channel/${channelId}/shorts`;
    } else {
      url = `https://www.youtube.com/@${channelId}/shorts`;
    }

    console.log(`Scraping YouTube Shorts: ${url}`);

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
      throw new Error(`YouTube returned status ${response.statusCode}`);
    }

    // Extract Shorts data
    const shortsData = extractShortsData(response.body, channelId, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...shortsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube Shorts scraping error:', error.message);

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
    const channelId = event.queryStringParameters?.channel_id || event.channel_id;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!channelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: channel_id',
        }),
      };
    }

    // Scrape Shorts
    const result = await scrapeShorts(channelId, parseInt(limit, 10));

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
  scrapeShorts,
  handler,
};
