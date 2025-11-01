/**
 * Threads Posts Scraper
 * Fetches posts from a Threads user's profile
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
 * Extract posts data from Threads HTML
 * @param {string} html - HTML content
 * @param {string} username - Threads username
 * @param {number} limit - Number of posts to extract
 * @returns {object} Extracted posts data
 */
const extractPostsData = (html, username, limit) => {
  try {
    // Threads embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find posts data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to posts data
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.userData;

    if (!userData) {
      throw new Error('Posts data structure not found');
    }

    // Extract posts from timeline
    const postsEdges = userData.edge_owner_to_timeline_media?.edges || [];

    const posts = postsEdges.slice(0, limit).map(edge => {
      const node = edge.node;

      // Determine post type
      let postType = 'text';
      if (node.__typename === 'GraphVideo') {
        postType = 'video';
      } else if (node.__typename === 'GraphImage') {
        postType = 'image';
      } else if (node.__typename === 'GraphSidecar') {
        postType = 'carousel';
      }

      // Extract media URLs
      let mediaUrls = [];
      if (node.is_video && node.video_url) {
        mediaUrls.push({ type: 'video', url: node.video_url });
      } else if (node.display_url) {
        mediaUrls.push({ type: 'image', url: node.display_url });
      }

      // Extract carousel media if applicable
      if (node.edge_sidecar_to_children) {
        mediaUrls = node.edge_sidecar_to_children.edges.map(child => {
          const childNode = child.node;
          return {
            type: childNode.is_video ? 'video' : 'image',
            url: childNode.is_video ? childNode.video_url : childNode.display_url,
            thumbnail: childNode.display_url,
          };
        });
      }

      return {
        id: node.id,
        shortcode: node.shortcode,
        url: `https://www.threads.net/t/${node.shortcode}`,
        type: postType,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
        timestamp: node.taken_at_timestamp,
        media: mediaUrls,
        stats: {
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          plays: node.video_view_count || null,
        },
        dimensions: node.dimensions ? {
          width: node.dimensions.width,
          height: node.dimensions.height,
        } : null,
        is_video: node.is_video || false,
        accessibility_caption: node.accessibility_caption || null,
      };
    });

    // Calculate summary statistics
    const totalLikes = posts.reduce((sum, post) => sum + post.stats.likes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.stats.comments, 0);
    const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
    const avgComments = posts.length > 0 ? Math.round(totalComments / posts.length) : 0;

    // Content type breakdown
    const videoCount = posts.filter(p => p.type === 'video').length;
    const imageCount = posts.filter(p => p.type === 'image').length;
    const carouselCount = posts.filter(p => p.type === 'carousel').length;
    const textCount = posts.filter(p => p.type === 'text').length;

    return {
      success: true,
      data: {
        username,
        profile_url: `https://www.threads.net/@${username}`,
        total_posts: posts.length,
        posts,
        summary_stats: {
          total_likes: totalLikes,
          total_comments: totalComments,
          avg_likes_per_post: avgLikes,
          avg_comments_per_post: avgComments,
        },
        content_breakdown: {
          video: videoCount,
          image: imageCount,
          carousel: carouselCount,
          text: textCount,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting posts data:', error);
    throw new Error(`Failed to extract posts data: ${error.message}`);
  }
};

/**
 * Scrape Threads posts from user profile
 * @param {string} username - Threads username (with or without @)
 * @param {number} limit - Number of posts to fetch (default: 20)
 * @returns {Promise<object>} Posts data
 */
const scrapePosts = async (username, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct Threads profile URL
    const url = `https://www.threads.net/@${cleanUsername}`;

    console.log(`Scraping Threads posts: ${url}`);

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

    // Extract posts data
    const postsData = extractPostsData(response.body, cleanUsername, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...postsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Threads posts scraping error:', error.message);

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
    const username = event.queryStringParameters?.username || event.username;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape posts
    const result = await scrapePosts(username, parseInt(limit, 10));

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
  scrapePosts,
  handler,
};
