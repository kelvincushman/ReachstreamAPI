/**
 * YouTube Video Details Scraper
 * Fetches detailed information about a specific YouTube video
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
 * Extract video details from YouTube HTML
 */
const extractVideoData = (html, videoId) => {
  try {
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find video data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

    let videoDetails = null;
    for (const content of contents) {
      if (content.videoPrimaryInfoRenderer) {
        videoDetails = content.videoPrimaryInfoRenderer;
        break;
      }
    }

    if (!videoDetails) {
      throw new Error('Video data structure not found');
    }

    // Extract secondary info (channel, description)
    let secondaryInfo = null;
    for (const content of contents) {
      if (content.videoSecondaryInfoRenderer) {
        secondaryInfo = content.videoSecondaryInfoRenderer;
        break;
      }
    }

    const title = videoDetails.title?.runs?.[0]?.text || '';
    const viewCount = videoDetails.viewCount?.videoViewCountRenderer?.viewCount?.simpleText || '0';
    const likeButton = videoDetails.videoActions?.menuRenderer?.topLevelButtons?.find(
      b => b.segmentedLikeDislikeButtonViewModel
    );
    const likeCount = likeButton?.segmentedLikeDislikeButtonViewModel?.likeButtonViewModel?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel?.defaultButtonViewModel?.buttonViewModel?.accessibilityText || '0';

    const channel = secondaryInfo?.owner?.videoOwnerRenderer;
    const description = secondaryInfo?.attributedDescription?.content || '';

    return {
      success: true,
      data: {
        video_id: videoId,
        title,
        description,
        view_count: viewCount,
        like_count: likeCount,
        channel: {
          channel_id: channel?.navigationEndpoint?.browseEndpoint?.browseId,
          channel_name: channel?.title?.runs?.[0]?.text,
          channel_url: `https://www.youtube.com/channel/${channel?.navigationEndpoint?.browseEndpoint?.browseId}`,
          subscriber_count: channel?.subscriberCountText?.simpleText || channel?.subscriberCountText?.runs?.[0]?.text,
          thumbnail: channel?.thumbnail?.thumbnails?.[0]?.url,
          verified: channel?.badges?.some(b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED') || false,
        },
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract video data: ${error.message}`);
  }
};

/**
 * Scrape YouTube video details
 */
const scrapeVideo = async (videoId) => {
  const startTime = Date.now();

  try {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID provided');
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`Scraping YouTube video: ${url}`);

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

    const videoData = extractVideoData(response.body, videoId);
    const responseTime = Date.now() - startTime;

    return {
      ...videoData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('YouTube video scraping error:', error.message);

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
    const videoId = event.queryStringParameters?.video_id || event.video_id;

    if (!videoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: video_id',
          example: 'video_id=dQw4w9WgXcQ',
        }),
      };
    }

    const result = await scrapeVideo(videoId);

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

module.exports = { scrapeVideo, handler };
