/**
 * Instagram Posts/Feed Scraper
 * Fetches user's posts from Instagram using Oxylabs proxy
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
 * Extract posts from Instagram HTML
 */
const extractPostsData = (html, username) => {
  try {
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find posts data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const userInfo = data?.entry_data?.ProfilePage?.[0]?.graphql?.user;

    if (!userInfo) {
      throw new Error('User data structure not found');
    }

    const edges = userInfo.edge_owner_to_timeline_media?.edges || [];

    const posts = edges.map((edge) => {
      const node = edge.node;
      return {
        post_id: node.id,
        shortcode: node.shortcode,
        post_url: `https://www.instagram.com/p/${node.shortcode}/`,
        type: node.__typename, // GraphImage, GraphVideo, GraphSidecar
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        timestamp: node.taken_at_timestamp,
        display_url: node.display_url,
        thumbnail_url: node.thumbnail_src,
        is_video: node.is_video,
        video_view_count: node.video_view_count || null,
        dimensions: {
          width: node.dimensions?.width,
          height: node.dimensions?.height,
        },
        engagement: {
          likes: node.edge_media_preview_like?.count || node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
        },
        location: node.location ? {
          id: node.location.id,
          name: node.location.name,
        } : null,
        accessibility_caption: node.accessibility_caption,
      };
    });

    return {
      success: true,
      data: {
        username,
        post_count: posts.length,
        posts,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract posts data: ${error.message}`);
  }
};

/**
 * Scrape Instagram user posts
 */
const scrapePosts = async (username, limit = 12) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://www.instagram.com/${cleanUsername}/`;

    console.log(`Scraping Instagram posts: ${url}`);

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

    const postsData = extractPostsData(response.body, cleanUsername);
    const responseTime = Date.now() - startTime;

    // Limit results
    if (postsData.data.posts.length > limit) {
      postsData.data.posts = postsData.data.posts.slice(0, limit);
      postsData.data.post_count = limit;
    }

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
    console.error('Instagram posts scraping error:', error.message);

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
    const username = event.queryStringParameters?.username || event.username;
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '12', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
          example: 'username=instagram&limit=12',
        }),
      };
    }

    const result = await scrapePosts(username, limit);

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

module.exports = { scrapePosts, handler };
