/**
 * YouTube Shorts Paginated Scraper
 * Fetches YouTube Shorts with pagination support using continuation tokens
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
 * Extract Shorts data from YouTube HTML or API response
 * @param {string|object} content - HTML content or API response
 * @param {string} channelId - YouTube channel ID
 * @param {number} limit - Number of Shorts to extract
 * @returns {object} Extracted Shorts data with continuation token
 */
const extractShortsData = (content, channelId, limit) => {
  try {
    let data;

    // Check if content is already parsed JSON (from continuation request)
    if (typeof content === 'object') {
      data = content;
    } else {
      // Parse from HTML
      const dataMatch = content.match(/var ytInitialData = ({.*?});<\/script>/);
      if (!dataMatch) {
        throw new Error('Could not find Shorts data in HTML');
      }
      data = JSON.parse(dataMatch[1]);
    }

    // Extract Shorts content
    let shortsContent = [];
    let continuationToken = null;

    // Check if this is initial page load or continuation
    if (data.onResponseReceivedActions) {
      // This is a continuation response
      const actions = data.onResponseReceivedActions;
      for (const action of actions) {
        if (action.appendContinuationItemsAction) {
          shortsContent = action.appendContinuationItemsAction.continuationItems || [];
          break;
        }
      }
    } else {
      // This is initial page load
      const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
      const shortsTab = tabs.find(tab =>
        tab.tabRenderer?.title === 'Shorts' ||
        tab.tabRenderer?.endpoint?.browseEndpoint?.canonicalBaseUrl?.includes('/shorts')
      );

      if (!shortsTab) {
        throw new Error('Shorts tab not found - channel may not have Shorts');
      }

      shortsContent = shortsTab.tabRenderer?.content?.richGridRenderer?.contents || [];
    }

    // Extract continuation token for next page
    const continuationItem = shortsContent.find(item => item.continuationItemRenderer);
    if (continuationItem) {
      continuationToken = continuationItem.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    }

    // Extract Shorts information
    const shorts = shortsContent
      .filter(item => item.richItemRenderer?.content?.reelItemRenderer)
      .slice(0, limit)
      .map(item => {
        const reel = item.richItemRenderer.content.reelItemRenderer;

        // Parse view count
        let viewCount = 0;
        const viewText = reel.viewCountText?.simpleText || '';
        const viewMatch = viewText.match(/[\d,]+/);
        if (viewMatch) {
          viewCount = parseInt(viewMatch[0].replace(/,/g, ''), 10);
        }

        return {
          video_id: reel.videoId,
          title: reel.headline?.simpleText || '',
          url: `https://www.youtube.com/shorts/${reel.videoId}`,
          thumbnail: reel.thumbnail?.thumbnails?.[0]?.url || null,
          view_count: viewCount,
          view_count_text: viewText,
          accessibility_label: reel.accessibility?.accessibilityData?.label || '',
        };
      });

    return {
      success: true,
      data: {
        channel_id: channelId,
        total_shorts: shorts.length,
        shorts,
        continuation_token: continuationToken,
        has_more: !!continuationToken,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting Shorts data:', error);
    throw new Error(`Failed to extract Shorts data: ${error.message}`);
  }
};

/**
 * Scrape YouTube Shorts with pagination
 * @param {string} channelId - YouTube channel ID or handle
 * @param {number} limit - Number of Shorts to fetch (default: 20, max: 50)
 * @param {string} continuationToken - Token for next page (optional)
 * @returns {Promise<object>} Shorts data
 */
const scrapeShortsPaginated = async (channelId, limit = 20, continuationToken = null) => {
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

    let response;

    if (continuationToken) {
      // Fetch continuation page
      const apiUrl = 'https://www.youtube.com/youtubei/v1/browse';

      response = await gotScraping({
        url: apiUrl,
        method: 'POST',
        proxyUrl: getProxyUrl(),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        json: {
          continuation: continuationToken,
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20231201.00.00',
            },
          },
        },
        timeout: {
          request: 30000,
        },
        retry: {
          limit: 2,
          statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
      });

      const apiData = JSON.parse(response.body);
      const shortsData = extractShortsData(apiData, channelId, limit);

      const responseTime = Date.now() - startTime;

      return {
        ...shortsData,
        metadata: {
          response_time_ms: responseTime,
          proxy_used: true,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      // Fetch initial page
      let url;
      if (channelId.startsWith('@')) {
        url = `https://www.youtube.com/${channelId}/shorts`;
      } else if (channelId.startsWith('UC')) {
        url = `https://www.youtube.com/channel/${channelId}/shorts`;
      } else {
        url = `https://www.youtube.com/@${channelId}/shorts`;
      }

      console.log(`Scraping YouTube Shorts (paginated): ${url}`);

      response = await gotScraping({
        url,
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
        throw new Error(`YouTube returned status ${response.statusCode}`);
      }

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
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube Shorts paginated scraping error:', error.message);

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
    const continuationToken = event.queryStringParameters?.continuation_token || event.continuation_token || null;

    if (!channelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: channel_id',
        }),
      };
    }

    // Scrape Shorts
    const result = await scrapeShortsPaginated(channelId, parseInt(limit, 10), continuationToken);

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
  scrapeShortsPaginated,
  handler,
};
