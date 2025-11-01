/**
 * YouTube Hashtag Search Scraper
 * Search for videos by hashtag on YouTube
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
 * Parse view count from text
 * @param {string} viewText - View count text
 * @returns {number} Numeric view count
 */
const parseViewCount = (viewText) => {
  if (!viewText) return 0;

  const match = viewText.match(/([\d.]+)([KMB]?)/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const multiplier = match[2];

  return multiplier === 'K' ? num * 1000 :
         multiplier === 'M' ? num * 1000000 :
         multiplier === 'B' ? num * 1000000000 : num;
};

/**
 * Extract hashtag search results from YouTube HTML
 * @param {string} html - HTML content
 * @param {string} hashtag - Hashtag searched
 * @param {number} limit - Number of results to extract
 * @returns {object} Extracted hashtag search results
 */
const extractHashtagResults = (html, hashtag, limit) => {
  try {
    // YouTube embeds data in ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find search results in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to search results
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    let videos = [];

    for (const content of contents) {
      if (content.itemSectionRenderer) {
        const items = content.itemSectionRenderer.contents || [];

        for (const item of items) {
          if (item.videoRenderer && videos.length < limit) {
            const video = item.videoRenderer;

            const views = parseViewCount(video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '0');

            videos.push({
              video_id: video.videoId,
              title: video.title?.runs?.[0]?.text || '',
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              thumbnail: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || null,
              channel: {
                name: video.ownerText?.runs?.[0]?.text || '',
                id: video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null,
                url: `https://www.youtube.com/channel/${video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId}`,
                verified: video.ownerBadges?.some(b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED') || false,
              },
              description: video.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map(r => r.text).join('') || '',
              length: video.lengthText?.simpleText || '0:00',
              views,
              view_text: video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '0 views',
              published: video.publishedTimeText?.simpleText || '',
            });
          }
        }
      }
    }

    // Calculate statistics
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const maxViews = videos.length > 0 ? Math.max(...videos.map(v => v.views)) : 0;

    // Find most popular video
    const mostPopular = videos.length > 0
      ? videos.reduce((best, video) => video.views > best.views ? video : best)
      : null;

    return {
      success: true,
      data: {
        hashtag: hashtag.startsWith('#') ? hashtag : `#${hashtag}`,
        hashtag_url: `https://www.youtube.com/hashtag/${hashtag.replace('#', '')}`,
        total_results: videos.length,
        videos,
        statistics: {
          total_views: totalViews,
          avg_views_per_video: avgViews,
          max_views: maxViews,
          most_popular_video: mostPopular ? {
            video_id: mostPopular.video_id,
            title: mostPopular.title,
            views: mostPopular.views,
            url: mostPopular.url,
          } : null,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting hashtag results:', error);
    throw new Error(`Failed to extract hashtag results: ${error.message}`);
  }
};

/**
 * Search YouTube videos by hashtag
 * @param {string} hashtag - Hashtag to search (with or without #)
 * @param {number} limit - Number of results to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Hashtag search results
 */
const searchHashtag = async (hashtag, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate hashtag
    if (!hashtag || typeof hashtag !== 'string') {
      throw new Error('Invalid hashtag provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Clean hashtag (remove # if present)
    const cleanHashtag = hashtag.replace('#', '');

    // Construct YouTube hashtag URL
    const url = `https://www.youtube.com/hashtag/${encodeURIComponent(cleanHashtag)}`;

    console.log(`Searching YouTube hashtag: ${url}`);

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

    // Extract hashtag results
    const hashtagData = extractHashtagResults(response.body, cleanHashtag, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...hashtagData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube hashtag search error:', error.message);

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
    const hashtag = event.queryStringParameters?.hashtag || event.hashtag;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!hashtag) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: hashtag',
        }),
      };
    }

    // Search hashtag
    const result = await searchHashtag(hashtag, parseInt(limit, 10));

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
  searchHashtag,
  handler,
};
