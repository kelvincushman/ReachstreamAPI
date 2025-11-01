/**
 * YouTube Trending Shorts Scraper
 * Fetches trending YouTube Shorts videos
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
 * Extract trending Shorts data from YouTube HTML
 * @param {string} html - HTML content
 * @param {number} limit - Number of Shorts to extract
 * @returns {object} Extracted trending Shorts data
 */
const extractTrendingShortsData = (html, limit) => {
  try {
    // YouTube embeds data in script tag
    const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find trending Shorts data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to trending content
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const nowTab = tabs.find(tab => tab.tabRenderer?.selected);

    if (!nowTab) {
      throw new Error('Trending tab not found');
    }

    const richGrid = nowTab.tabRenderer?.content?.richGridRenderer;
    const contents = richGrid?.contents || [];

    // Filter for Shorts (reelItemRenderer)
    const shorts = contents
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

        // Extract channel info if available
        const overlayMetadata = reel.navigationEndpoint?.reelWatchEndpoint?.overlay?.reelPlayerOverlayRenderer?.reelPlayerHeaderSupportedRenderers?.reelPlayerHeaderRenderer;

        return {
          video_id: reel.videoId,
          title: reel.headline?.simpleText || '',
          url: `https://www.youtube.com/shorts/${reel.videoId}`,
          thumbnail: reel.thumbnail?.thumbnails?.[0]?.url || null,
          view_count: viewCount,
          view_count_text: viewText,
          channel: {
            name: overlayMetadata?.channelTitleText?.simpleText || null,
            id: overlayMetadata?.channelNavigationEndpoint?.browseEndpoint?.browseId || null,
          },
          accessibility_label: reel.accessibility?.accessibilityData?.label || '',
        };
      });

    // Calculate statistics
    const totalViews = shorts.reduce((sum, short) => sum + short.view_count, 0);
    const avgViews = shorts.length > 0 ? Math.round(totalViews / shorts.length) : 0;
    const maxViews = shorts.length > 0 ? Math.max(...shorts.map(s => s.view_count)) : 0;
    const minViews = shorts.length > 0 ? Math.min(...shorts.map(s => s.view_count)) : 0;

    return {
      success: true,
      data: {
        total_shorts: shorts.length,
        shorts,
        statistics: {
          total_views: totalViews,
          avg_views: avgViews,
          max_views: maxViews,
          min_views: minViews,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting trending Shorts data:', error);
    throw new Error(`Failed to extract trending Shorts data: ${error.message}`);
  }
};

/**
 * Scrape trending YouTube Shorts
 * @param {string} country - Country code for trending (default: 'US')
 * @param {number} limit - Number of Shorts to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Trending Shorts data
 */
const scrapeTrendingShorts = async (country = 'US', limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct YouTube trending Shorts URL
    const url = `https://www.youtube.com/feed/trending?bp=6gQJRkVleHBsb3Jl&gl=${country}`;

    console.log(`Scraping YouTube trending Shorts: ${url}`);

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

    // Extract trending Shorts data
    const shortsData = extractTrendingShortsData(response.body, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...shortsData,
      metadata: {
        country,
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube trending Shorts scraping error:', error.message);

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
    const country = event.queryStringParameters?.country || event.country || 'US';
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    // Scrape trending Shorts
    const result = await scrapeTrendingShorts(country, parseInt(limit, 10));

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
  scrapeTrendingShorts,
  handler,
};
