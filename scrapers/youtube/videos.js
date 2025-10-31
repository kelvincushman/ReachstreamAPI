/**
 * YouTube Channel Videos Scraper
 * Fetches list of videos from a YouTube channel
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
 * Extract videos from YouTube HTML
 */
const extractVideosData = (html, channelId) => {
  try {
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find videos data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];

    let videoRenderer = null;
    for (const tab of tabs) {
      if (tab.tabRenderer?.content?.richGridRenderer) {
        videoRenderer = tab.tabRenderer.content.richGridRenderer;
        break;
      }
    }

    if (!videoRenderer) {
      throw new Error('Videos data structure not found');
    }

    const contents = videoRenderer.contents || [];
    const videos = contents
      .filter(item => item.richItemRenderer?.content?.videoRenderer)
      .map(item => {
        const video = item.richItemRenderer.content.videoRenderer;
        return {
          video_id: video.videoId,
          title: video.title?.runs?.[0]?.text || video.title?.simpleText,
          description: video.descriptionSnippet?.runs?.map(r => r.text).join('') || '',
          thumbnail_url: video.thumbnail?.thumbnails?.[video.thumbnail.thumbnails.length - 1]?.url,
          duration: video.lengthText?.simpleText,
          view_count: video.viewCountText?.simpleText,
          published_time: video.publishedTimeText?.simpleText,
          video_url: `https://www.youtube.com/watch?v=${video.videoId}`,
        };
      });

    return {
      success: true,
      data: {
        channel_id: channelId,
        video_count: videos.length,
        videos,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract videos data: ${error.message}`);
  }
};

/**
 * Scrape YouTube channel videos
 */
const scrapeVideos = async (channelId) => {
  const startTime = Date.now();

  try {
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Invalid channel ID provided');
    }

    const url = channelId.startsWith('@')
      ? `https://www.youtube.com/${channelId}/videos`
      : `https://www.youtube.com/channel/${channelId}/videos`;

    console.log(`Scraping YouTube videos: ${url}`);

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

    const videosData = extractVideosData(response.body, channelId);
    const responseTime = Date.now() - startTime;

    return {
      ...videosData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('YouTube videos scraping error:', error.message);

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
    const channelId = event.queryStringParameters?.channel_id || event.channel_id;

    if (!channelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: channel_id',
          example: 'channel_id=@MrBeast or channel_id=UCX6OQ3DkcsbYNE6H8uQQuVA',
        }),
      };
    }

    const result = await scrapeVideos(channelId);

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

module.exports = { scrapeVideos, handler };
