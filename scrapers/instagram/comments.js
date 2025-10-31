/**
 * Instagram Post Comments Scraper
 * Fetches comments from Instagram post using Oxylabs proxy
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
 * Extract comments from Instagram HTML
 */
const extractCommentsData = (html, shortcode) => {
  try {
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find comments data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const postData = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;

    if (!postData) {
      throw new Error('Post data structure not found');
    }

    const commentEdges = postData.edge_media_to_parent_comment?.edges || [];

    const comments = commentEdges.map((edge) => {
      const comment = edge.node;

      return {
        comment_id: comment.id,
        user: {
          user_id: comment.owner?.id,
          username: comment.owner?.username,
          profile_picture: comment.owner?.profile_pic_url,
          is_verified: comment.owner?.is_verified,
        },
        text: comment.text,
        created_at: comment.created_at,
        like_count: comment.edge_liked_by?.count || 0,
        reply_count: comment.edge_threaded_comments?.count || 0,
        is_pinned: comment.pinned_comment_badge !== null,
        viewer_has_liked: comment.viewer_has_liked,
        replies: comment.edge_threaded_comments?.edges?.map(replyEdge => {
          const reply = replyEdge.node;
          return {
            comment_id: reply.id,
            user: {
              user_id: reply.owner?.id,
              username: reply.owner?.username,
              profile_picture: reply.owner?.profile_pic_url,
              is_verified: reply.owner?.is_verified,
            },
            text: reply.text,
            created_at: reply.created_at,
            like_count: reply.edge_liked_by?.count || 0,
          };
        }) || [],
      };
    });

    return {
      success: true,
      data: {
        shortcode,
        post_url: `https://www.instagram.com/p/${shortcode}/`,
        comment_count: comments.length,
        total_comments: postData.edge_media_to_parent_comment?.count || 0,
        comments,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract comments data: ${error.message}`);
  }
};

/**
 * Scrape Instagram post comments
 */
const scrapeComments = async (shortcode, limit = 50) => {
  const startTime = Date.now();

  try {
    if (!shortcode || typeof shortcode !== 'string') {
      throw new Error('Invalid shortcode provided');
    }

    const url = `https://www.instagram.com/p/${shortcode}/`;

    console.log(`Scraping Instagram comments: ${url}`);

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
      throw new Error(`Instagram returned status ${response.statusCode}`);
    }

    const commentsData = extractCommentsData(response.body, shortcode);
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
    console.error('Instagram comments scraping error:', error.message);

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
    const shortcode = event.queryStringParameters?.shortcode || event.shortcode;
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '50', 10);

    if (!shortcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: shortcode',
          example: 'shortcode=CXtWMB2goFp&limit=50',
          note: 'Get shortcode from Instagram post URL: instagram.com/p/SHORTCODE/',
        }),
      };
    }

    const result = await scrapeComments(shortcode, limit);

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
