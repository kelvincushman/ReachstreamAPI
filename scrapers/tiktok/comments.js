/**
 * TikTok Video Comments Scraper
 * Fetches comments from TikTok video using Oxylabs proxy
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
 * Extract comments from TikTok HTML
 */
const extractCommentsData = (html, videoId) => {
  try {
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find comments data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const commentsData = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct?.comments || [];

    const comments = commentsData.map((comment) => ({
      comment_id: comment.cid,
      user: {
        user_id: comment.user.uid,
        username: comment.user.uniqueId,
        nickname: comment.user.nickname,
        avatar_url: comment.user.avatarThumb,
        verified: comment.user.verified,
      },
      text: comment.text,
      create_time: comment.createTime,
      like_count: comment.diggCount || 0,
      reply_count: comment.replyCommentTotal || 0,
      is_author_liked: comment.authorLiked,
      is_pinned: comment.isPinned || false,
      language: comment.commentLanguage,
      replies: comment.replies?.map(reply => ({
        comment_id: reply.cid,
        user: {
          user_id: reply.user.uid,
          username: reply.user.uniqueId,
          nickname: reply.user.nickname,
          avatar_url: reply.user.avatarThumb,
        },
        text: reply.text,
        create_time: reply.createTime,
        like_count: reply.diggCount || 0,
      })) || [],
    }));

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
 * Scrape TikTok video comments
 */
const scrapeComments = async (videoId, limit = 50) => {
  const startTime = Date.now();

  try {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID provided');
    }

    const url = `https://www.tiktok.com/video/${videoId}`;

    console.log(`Scraping TikTok comments: ${url}`);

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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    const commentsData = extractCommentsData(response.body, videoId);
    const responseTime = Date.now() - startTime;

    // Limit results
    if (commentsData.data.comments.length > limit) {
      commentsData.data.comments = commentsData.data.comments.slice(0, limit);
      commentsData.data.comment_count = limit;
    }

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
    console.error('TikTok comments scraping error:', error.message);

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
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '50', 10);

    if (!videoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: video_id',
          example: 'video_id=7234567890123456789&limit=50',
        }),
      };
    }

    const result = await scrapeComments(videoId, limit);

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
