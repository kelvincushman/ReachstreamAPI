/**
 * Instagram Reels Scraper
 * Fetches Instagram Reels (short-form videos) from a user's profile
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
 * Extract Reels data from Instagram HTML/API response
 * @param {string} html - HTML content
 * @param {string} username - Instagram username
 * @param {number} limit - Number of reels to extract
 * @returns {object} Extracted Reels data
 */
const extractReelsData = (html, username, limit) => {
  try {
    // Instagram embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find Reels data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user data and reels
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.user;

    if (!userData) {
      throw new Error('Reels data structure not found');
    }

    // Extract reels from edge_felix_video_timeline (Reels tab)
    const reelsEdge = userData.edge_felix_video_timeline || userData.edge_owner_to_timeline_media || {};
    const reelsNodes = reelsEdge.edges || [];

    const reels = reelsNodes.slice(0, limit).map(edge => {
      const node = edge.node;

      return {
        id: node.id,
        shortcode: node.shortcode,
        url: `https://www.instagram.com/reel/${node.shortcode}/`,
        video_url: node.video_url,
        thumbnail_url: node.thumbnail_src || node.display_url,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        duration: node.video_duration || 0,
        dimensions: {
          width: node.dimensions?.width || 0,
          height: node.dimensions?.height || 0,
        },
        stats: {
          views: node.video_view_count || 0,
          likes: node.edge_media_preview_like?.count || node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          plays: node.video_play_count || node.video_view_count || 0,
        },
        is_video: true,
        taken_at: node.taken_at_timestamp,
        created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
        owner: {
          id: node.owner?.id,
          username: node.owner?.username || username,
        },
        accessibility_caption: node.accessibility_caption,
        music: {
          has_audio: !node.is_muted,
          original_audio: node.clips_music_attribution_info?.artist_name || null,
        },
      };
    });

    // Calculate performance metrics
    const totalViews = reels.reduce((sum, reel) => sum + reel.stats.views, 0);
    const avgViews = reels.length > 0 ? Math.round(totalViews / reels.length) : 0;
    const totalLikes = reels.reduce((sum, reel) => sum + reel.stats.likes, 0);
    const avgLikes = reels.length > 0 ? Math.round(totalLikes / reels.length) : 0;

    // Find best performing reel
    const bestReel = reels.length > 0
      ? reels.reduce((best, reel) =>
          reel.stats.views > best.stats.views ? reel : best
        )
      : null;

    return {
      success: true,
      data: {
        username,
        total_reels: reelsEdge.count || reels.length,
        reels,
        performance_metrics: {
          total_views: totalViews,
          avg_views_per_reel: avgViews,
          total_likes: totalLikes,
          avg_likes_per_reel: avgLikes,
          best_performing_reel: bestReel ? {
            shortcode: bestReel.shortcode,
            url: bestReel.url,
            views: bestReel.stats.views,
            likes: bestReel.stats.likes,
          } : null,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting Reels data:', error);
    throw new Error(`Failed to extract Reels data: ${error.message}`);
  }
};

/**
 * Scrape Instagram Reels from a user's profile
 * @param {string} username - Instagram username
 * @param {number} limit - Number of reels to fetch (default 12)
 * @returns {Promise<object>} Reels data
 */
const scrapeReels = async (username, limit = 12) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct Instagram Reels URL
    const url = `https://www.instagram.com/${cleanUsername}/reels/`;

    console.log(`Scraping Instagram Reels: ${url}`);

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
      throw new Error(`Instagram returned status ${response.statusCode}`);
    }

    // Extract Reels data
    const reelsData = extractReelsData(response.body, cleanUsername, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...reelsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Instagram Reels scraping error:', error.message);

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
    // Extract username from event (API Gateway or direct invocation)
    const username = event.queryStringParameters?.username || event.username;
    const limit = event.queryStringParameters?.limit || event.limit || 12;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape Reels
    const result = await scrapeReels(username, parseInt(limit, 10));

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
  scrapeReels,
  handler,
};
