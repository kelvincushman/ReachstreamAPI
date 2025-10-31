/**
 * YouTube Video Comments Scraper
 * Fetches comments from a YouTube video
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
 * Extract comments from YouTube HTML
 */
const extractCommentsData = (html, videoId) => {
  try {
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find comments data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const contents = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

    let itemSection = null;
    for (const content of contents) {
      if (content.itemSectionRenderer) {
        itemSection = content.itemSectionRenderer;
        break;
      }
    }

    if (!itemSection) {
      throw new Error('Comments section not found');
    }

    const commentThreads = itemSection.contents?.filter(
      c => c.commentThreadRenderer
    ) || [];

    const comments = commentThreads.map(thread => {
      const comment = thread.commentThreadRenderer?.comment?.commentRenderer;
      if (!comment) return null;

      return {
        comment_id: comment.commentId,
        author: {
          channel_id: comment.authorEndpoint?.browseEndpoint?.browseId,
          name: comment.authorText?.simpleText,
          thumbnail: comment.authorThumbnail?.thumbnails?.[0]?.url,
          is_channel_owner: comment.authorIsChannelOwner || false,
          is_verified: comment.authorCommentBadge !== undefined,
        },
        text: comment.contentText?.runs?.map(r => r.text).join('') || '',
        published_time: comment.publishedTimeText?.runs?.[0]?.text,
        like_count: comment.likeCount || 0,
        reply_count: thread.commentThreadRenderer?.replies?.commentRepliesRenderer?.moreText?.simpleText || 0,
        is_pinned: comment.pinnedCommentBadge !== undefined,
        is_hearted: comment.creatorHeart !== undefined,
      };
    }).filter(Boolean);

    return {
      success: true,
      data: {
        video_id: videoId,
        comment_count: comments.length,
        comments,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract comments data: ${error.message}`);
  }
};

/**
 * Scrape YouTube video comments
 */
const scrapeComments = async (videoId) => {
  const startTime = Date.now();

  try {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID provided');
    }

    const url = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`Scraping YouTube comments: ${url}`);

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

    const commentsData = extractCommentsData(response.body, videoId);
    const responseTime = Date.now() - startTime;

    return {
      ...commentsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('YouTube comments scraping error:', error.message);

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

    const result = await scrapeComments(videoId);

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

module.exports = { scrapeComments, handler };
