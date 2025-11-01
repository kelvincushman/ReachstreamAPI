/**
 * YouTube Playlist Scraper
 * Fetches videos from a YouTube playlist
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
 * @param {string} viewText - View count text (e.g., "1.2M views", "534K views")
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
 * Extract playlist data from YouTube HTML
 * @param {string} html - HTML content
 * @param {string} playlistId - YouTube playlist ID
 * @param {number} limit - Number of videos to extract
 * @returns {object} Extracted playlist data
 */
const extractPlaylistData = (html, playlistId, limit) => {
  try {
    // YouTube embeds data in ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find playlist data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to playlist content
    const sidebar = data?.sidebar?.playlistSidebarRenderer?.items || [];
    const playlistInfo = sidebar.find(item => item.playlistSidebarPrimaryInfoRenderer)?.playlistSidebarPrimaryInfoRenderer;

    if (!playlistInfo) {
      throw new Error('Playlist info not found');
    }

    // Extract playlist metadata
    const playlistTitle = playlistInfo.title?.runs?.[0]?.text || playlistInfo.title?.simpleText || '';
    const videoCountText = playlistInfo.stats?.[0]?.runs?.[0]?.text || playlistInfo.stats?.[0]?.simpleText || '0';
    const totalVideos = parseInt(videoCountText.replace(/,/g, ''), 10) || 0;

    // Extract playlist videos
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents || [];

    const videos = contents
      .filter(item => item.playlistVideoRenderer)
      .slice(0, limit)
      .map(item => {
        const video = item.playlistVideoRenderer;

        const viewCount = parseViewCount(video.videoInfo?.runs?.[0]?.text || '0');
        const lengthText = video.lengthText?.simpleText || '0:00';

        return {
          video_id: video.videoId,
          title: video.title?.runs?.[0]?.text || '',
          url: `https://www.youtube.com/watch?v=${video.videoId}&list=${playlistId}`,
          thumbnail: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url || null,
          channel: {
            name: video.shortBylineText?.runs?.[0]?.text || '',
            id: video.shortBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null,
          },
          length: lengthText,
          views: viewCount,
          view_text: video.videoInfo?.runs?.[0]?.text || '0 views',
          published: video.videoInfo?.runs?.[2]?.text || '',
          index: video.index?.simpleText || '',
        };
      });

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
        playlist_id: playlistId,
        title: playlistTitle,
        total_videos: totalVideos,
        videos_returned: videos.length,
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
    console.error('Error extracting playlist data:', error);
    throw new Error(`Failed to extract playlist data: ${error.message}`);
  }
};

/**
 * Scrape YouTube playlist
 * @param {string} playlistId - YouTube playlist ID
 * @param {number} limit - Number of videos to fetch (default: 20, max: 100)
 * @returns {Promise<object>} Playlist data
 */
const scrapePlaylist = async (playlistId, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate playlist ID
    if (!playlistId || typeof playlistId !== 'string') {
      throw new Error('Invalid playlist ID provided');
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Construct YouTube playlist URL
    const url = `https://www.youtube.com/playlist?list=${playlistId}`;

    console.log(`Scraping YouTube playlist: ${url}`);

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

    // Extract playlist data
    const playlistData = extractPlaylistData(response.body, playlistId, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...playlistData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube playlist scraping error:', error.message);

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
    const playlistId = event.queryStringParameters?.playlist_id || event.playlist_id;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!playlistId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: playlist_id',
        }),
      };
    }

    // Scrape playlist
    const result = await scrapePlaylist(playlistId, parseInt(limit, 10));

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
  scrapePlaylist,
  handler,
};
