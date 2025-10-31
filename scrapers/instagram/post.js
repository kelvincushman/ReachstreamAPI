/**
 * Instagram Post Details Scraper
 * Fetches detailed information about a specific Instagram post/reel
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
 * Extract post details from Instagram HTML
 */
const extractPostData = (html, shortcode) => {
  try {
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find post data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const media = data?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;

    if (!media) {
      throw new Error('Post data structure not found');
    }

    return {
      success: true,
      data: {
        post_id: media.id,
        shortcode: media.shortcode,
        post_url: `https://www.instagram.com/p/${shortcode}/`,
        type: media.__typename,
        caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        timestamp: media.taken_at_timestamp,
        owner: {
          user_id: media.owner?.id,
          username: media.owner?.username,
          full_name: media.owner?.full_name,
          profile_pic_url: media.owner?.profile_pic_url,
          is_verified: media.owner?.is_verified,
        },
        display_url: media.display_url,
        is_video: media.is_video,
        video_url: media.video_url || null,
        video_view_count: media.video_view_count || null,
        dimensions: {
          width: media.dimensions?.width,
          height: media.dimensions?.height,
        },
        engagement: {
          likes: media.edge_media_preview_like?.count || 0,
          comments: media.edge_media_to_parent_comment?.count || 0,
        },
        location: media.location ? {
          id: media.location.id,
          name: media.location.name,
          slug: media.location.slug,
        } : null,
        tagged_users: media.edge_media_to_tagged_user?.edges?.map(e => e.node.user.username) || [],
        accessibility_caption: media.accessibility_caption,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract post data: ${error.message}`);
  }
};

/**
 * Scrape Instagram post details
 */
const scrapePost = async (shortcode) => {
  const startTime = Date.now();

  try {
    if (!shortcode || typeof shortcode !== 'string') {
      throw new Error('Invalid shortcode provided');
    }

    const url = `https://www.instagram.com/p/${shortcode}/`;

    console.log(`Scraping Instagram post: ${url}`);

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

    const postData = extractPostData(response.body, shortcode);
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
    console.error('Instagram post scraping error:', error.message);

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

    if (!shortcode) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: shortcode',
          example: 'shortcode=ABC123xyz (from instagram.com/p/ABC123xyz/)',
        }),
      };
    }

    const result = await scrapePost(shortcode);

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

module.exports = { scrapePost, handler };
