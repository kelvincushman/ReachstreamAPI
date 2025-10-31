/**
 * Reddit Post Comments Scraper
 * Fetches comments from a Reddit post using JSON API
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
 * Parse Reddit comments recursively
 */
const parseComments = (commentData, depth = 0) => {
  if (!commentData || commentData.kind !== 't1') return null;

  const comment = commentData.data;

  const parsed = {
    comment_id: comment.id,
    author: comment.author,
    text: comment.body,
    score: comment.score,
    created_utc: comment.created_utc,
    is_submitter: comment.is_submitter,
    stickied: comment.stickied,
    distinguished: comment.distinguished,
    depth: depth,
    awards: comment.all_awardings?.length || 0,
    replies: [],
  };

  // Recursively parse replies
  if (comment.replies && comment.replies.data && comment.replies.data.children) {
    parsed.replies = comment.replies.data.children
      .map(child => parseComments(child, depth + 1))
      .filter(Boolean);
  }

  return parsed;
};

/**
 * Scrape Reddit post comments
 */
const scrapeComments = async (postId, subreddit, limit = 50) => {
  const startTime = Date.now();

  try {
    if (!postId || typeof postId !== 'string') {
      throw new Error('Invalid post ID provided');
    }

    if (!subreddit || typeof subreddit !== 'string') {
      throw new Error('Invalid subreddit provided');
    }

    const cleanSubreddit = subreddit.replace('r/', '').replace(/^\//, '').replace(/\/$/, '');
    const url = `https://www.reddit.com/r/${cleanSubreddit}/comments/${postId}.json?limit=${limit}`;

    console.log(`Scraping Reddit comments: ${url}`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Reddit returned status ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);

    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid Reddit response format');
    }

    // data[0] is the post, data[1] is the comments
    const postData = data[0].data.children[0].data;
    const commentsData = data[1].data.children;

    const comments = commentsData
      .map(child => parseComments(child))
      .filter(Boolean);

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        post: {
          post_id: postData.id,
          title: postData.title,
          author: postData.author,
          subreddit: postData.subreddit,
          score: postData.score,
          num_comments: postData.num_comments,
          permalink: `https://www.reddit.com${postData.permalink}`,
        },
        comment_count: comments.length,
        comments,
        scraped_at: new Date().toISOString(),
      },
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Reddit comments scraping error:', error.message);

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
    const postId = event.queryStringParameters?.post_id || event.post_id;
    const subreddit = event.queryStringParameters?.subreddit || event.subreddit;
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '50', 10);

    if (!postId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: post_id',
          example: 'post_id=abc123&subreddit=programming&limit=50',
        }),
      };
    }

    if (!subreddit) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: subreddit',
          example: 'post_id=abc123&subreddit=programming&limit=50',
        }),
      };
    }

    const result = await scrapeComments(postId, subreddit, limit);

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
