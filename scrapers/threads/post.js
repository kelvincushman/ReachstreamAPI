/**
 * Threads Single Post Scraper
 * Fetches detailed information about a single Threads post
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
 * Extract post data from Threads HTML
 * @param {string} html - HTML content
 * @param {string} postId - Threads post ID or shortcode
 * @returns {object} Extracted post data
 */
const extractPostData = (html, postId) => {
  try {
    // Threads embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find post data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to post data
    const postData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.xdt_shortcode_media;

    if (!postData) {
      throw new Error('Post data structure not found');
    }

    // Determine post type
    let postType = 'text';
    if (postData.__typename === 'GraphVideo') {
      postType = 'video';
    } else if (postData.__typename === 'GraphImage') {
      postType = 'image';
    } else if (postData.__typename === 'GraphSidecar') {
      postType = 'carousel';
    }

    // Extract media URLs
    let mediaUrls = [];
    if (postData.is_video && postData.video_url) {
      mediaUrls.push({
        type: 'video',
        url: postData.video_url,
        thumbnail: postData.display_url,
        duration: postData.video_duration || null,
      });
    } else if (postData.display_url) {
      mediaUrls.push({
        type: 'image',
        url: postData.display_url,
      });
    }

    // Extract carousel media if applicable
    if (postData.edge_sidecar_to_children) {
      mediaUrls = postData.edge_sidecar_to_children.edges.map(child => {
        const childNode = child.node;
        return {
          type: childNode.is_video ? 'video' : 'image',
          url: childNode.is_video ? childNode.video_url : childNode.display_url,
          thumbnail: childNode.display_url,
          dimensions: childNode.dimensions,
        };
      });
    }

    // Extract caption and hashtags
    const caption = postData.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    const hashtags = caption.match(/#[\w]+/g) || [];
    const mentions = caption.match(/@[\w]+/g) || [];

    // Extract author information
    const author = postData.owner;

    // Extract top comments
    const commentsEdges = postData.edge_media_to_parent_comment?.edges || [];
    const comments = commentsEdges.slice(0, 10).map(edge => {
      const comment = edge.node;
      return {
        id: comment.id,
        text: comment.text,
        created_at: new Date(comment.created_at * 1000).toISOString(),
        likes: comment.edge_liked_by?.count || 0,
        author: {
          username: comment.owner?.username,
          is_verified: comment.owner?.is_verified,
          profile_pic: comment.owner?.profile_pic_url,
        },
      };
    });

    return {
      success: true,
      data: {
        id: postData.id,
        shortcode: postData.shortcode,
        url: `https://www.threads.net/t/${postData.shortcode}`,
        type: postType,
        caption,
        hashtags,
        mentions,
        created_at: new Date(postData.taken_at_timestamp * 1000).toISOString(),
        timestamp: postData.taken_at_timestamp,
        media: mediaUrls,
        stats: {
          likes: postData.edge_media_preview_like?.count || 0,
          comments: postData.edge_media_to_parent_comment?.count || 0,
          plays: postData.video_view_count || null,
        },
        author: {
          user_id: author.id,
          username: author.username,
          full_name: author.full_name,
          profile_pic: author.profile_pic_url,
          is_verified: author.is_verified,
          is_private: author.is_private,
        },
        location: postData.location ? {
          id: postData.location.id,
          name: postData.location.name,
          slug: postData.location.slug,
        } : null,
        dimensions: postData.dimensions ? {
          width: postData.dimensions.width,
          height: postData.dimensions.height,
        } : null,
        is_video: postData.is_video || false,
        is_paid_partnership: postData.is_paid_partnership || false,
        accessibility_caption: postData.accessibility_caption || null,
        top_comments: comments,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting post data:', error);
    throw new Error(`Failed to extract post data: ${error.message}`);
  }
};

/**
 * Scrape Threads post by ID or shortcode
 * @param {string} postId - Threads post ID or shortcode
 * @returns {Promise<object>} Post data
 */
const scrapePost = async (postId) => {
  const startTime = Date.now();

  try {
    // Validate postId
    if (!postId || typeof postId !== 'string') {
      throw new Error('Invalid post ID provided');
    }

    // Construct Threads post URL
    const url = `https://www.threads.net/t/${postId}`;

    console.log(`Scraping Threads post: ${url}`);

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
      throw new Error(`Threads returned status ${response.statusCode}`);
    }

    // Extract post data
    const postData = extractPostData(response.body, postId);

    const responseTime = Date.now() - startTime;

    return {
      ...postData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Threads post scraping error:', error.message);

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
    // Extract post_id from event (API Gateway or direct invocation)
    const postId = event.queryStringParameters?.post_id || event.post_id;

    if (!postId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: post_id',
        }),
      };
    }

    // Scrape post
    const result = await scrapePost(postId);

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
  scrapePost,
  handler,
};
