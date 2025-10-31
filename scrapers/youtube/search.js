/**
 * YouTube Search Scraper
 * Searches YouTube for videos by keyword
 */

const { gotScraping } = require('got-scraping');
require('dotenv').config();

const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;
const OXYLABS_HOST = process.env.OXYLABS_HOST || 'pr.oxylabs.io';
const OXYLABS_PORT = process.env.OXYLABS_PORT || 7777;

const getProxyUrl = () => {
  return `http://${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}@${OXYLABS_HOST}:${OXYLABS_PORT}`;
};

/**
 * Extract search results from YouTube HTML
 */
const extractSearchResults = (html, query) => {
  try {
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find search results in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    let itemSection = null;
    for (const content of contents) {
      if (content.itemSectionRenderer) {
        itemSection = content.itemSectionRenderer;
        break;
      }
    }

    if (!itemSection) {
      throw new Error('Search results section not found');
    }

    const results = itemSection.contents
      .filter(item => item.videoRenderer)
      .map(item => {
        const video = item.videoRenderer;
        return {
          video_id: video.videoId,
          title: video.title?.runs?.[0]?.text || video.title?.simpleText,
          description: video.descriptionSnippet?.runs?.map(r => r.text).join('') || '',
          thumbnail_url: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url,
          duration: video.lengthText?.simpleText,
          view_count: video.viewCountText?.simpleText,
          published_time: video.publishedTimeText?.simpleText,
          channel: {
            channel_id: video.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
            name: video.ownerText?.runs?.[0]?.text,
            thumbnail: video.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer?.thumbnail?.thumbnails?.[0]?.url,
          },
          video_url: `https://www.youtube.com/watch?v=${video.videoId}`,
        };
      });

    return {
      success: true,
      data: {
        query,
        result_count: results.length,
        results,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract search results: ${error.message}`);
  }
};

/**
 * Search YouTube videos
 */
const searchVideos = async (query) => {
  const startTime = Date.now();

  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    console.log(`Searching YouTube: ${url}`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`YouTube returned status ${response.statusCode}`);
    }

    const searchResults = extractSearchResults(response.body, query);
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
    console.error('YouTube search error:', error.message);

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
 * Lambda handler
 */
const handler = async (event) => {
  try {
    const query = event.queryStringParameters?.query || event.query || event.queryStringParameters?.q || event.q;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query or q',
          example: 'query=javascript tutorial',
        }),
      };
    }

    const result = await searchVideos(query);

    return {
      statusCode: result.success ? 200 : 500,
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

module.exports = { searchVideos, handler };
