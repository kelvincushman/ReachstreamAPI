/**
 * Instagram Video (IGTV) Scraper
 * Fetches Instagram IGTV videos (long-form videos) from a user's profile
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
 * Extract IGTV videos data from Instagram HTML/API response
 * @param {string} html - HTML content
 * @param {string} username - Instagram username
 * @param {number} limit - Number of videos to extract
 * @returns {object} Extracted IGTV videos data
 */
const extractIGTVData = (html, username, limit) => {
  try {
    // Instagram embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find IGTV data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user data and IGTV videos
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.user;

    if (!userData) {
      throw new Error('IGTV data structure not found');
    }

    // Extract IGTV videos from edge_felix_video_timeline or timeline media
    const igtvEdge = userData.edge_felix_video_timeline || userData.edge_owner_to_timeline_media || {};
    const videoNodes = igtvEdge.edges || [];

    // Filter for IGTV videos (longer duration, typically > 60 seconds)
    const videos = videoNodes
      .filter(edge => {
        const node = edge.node;
        return node.is_video && (node.video_duration > 60 || node.product_type === 'igtv');
      })
      .slice(0, limit)
      .map(edge => {
        const node = edge.node;

        return {
          id: node.id,
          shortcode: node.shortcode,
          url: `https://www.instagram.com/tv/${node.shortcode}/`,
          video_url: node.video_url,
          thumbnail_url: node.thumbnail_src || node.display_url,
          title: node.title || '',
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
          product_type: node.product_type || 'igtv',
          taken_at: node.taken_at_timestamp,
          created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
          owner: {
            id: node.owner?.id,
            username: node.owner?.username || username,
          },
          accessibility_caption: node.accessibility_caption,
        };
      });

    // Calculate performance metrics
    const totalViews = videos.reduce((sum, video) => sum + video.stats.views, 0);
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const totalLikes = videos.reduce((sum, video) => sum + video.stats.likes, 0);
    const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
    const totalDuration = videos.reduce((sum, video) => sum + video.duration, 0);
    const avgDuration = videos.length > 0 ? Math.round(totalDuration / videos.length) : 0;

    // Find best performing video
    const bestVideo = videos.length > 0
      ? videos.reduce((best, video) =>
          video.stats.views > best.stats.views ? video : best
        )
      : null;

    // Calculate engagement rate
    const avgEngagementRate = videos.length > 0
      ? videos.reduce((sum, video) => {
          const engagement = video.stats.views > 0
            ? ((video.stats.likes + video.stats.comments) / video.stats.views) * 100
            : 0;
          return sum + engagement;
        }, 0) / videos.length
      : 0;

    return {
      success: true,
      data: {
        username,
        total_videos: videos.length,
        videos,
        statistics: {
          total_views: totalViews,
          avg_views_per_video: avgViews,
          total_likes: totalLikes,
          avg_likes_per_video: avgLikes,
          total_duration_seconds: totalDuration,
          avg_duration_seconds: avgDuration,
          avg_engagement_rate: parseFloat(avgEngagementRate.toFixed(2)),
          best_performing: bestVideo ? {
            shortcode: bestVideo.shortcode,
            url: bestVideo.url,
            views: bestVideo.stats.views,
            likes: bestVideo.stats.likes,
          } : null,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting IGTV data:', error);
    throw new Error(`Failed to extract IGTV data: ${error.message}`);
  }
};

/**
 * Scrape Instagram IGTV videos
 * @param {string} username - Instagram username
 * @param {number} limit - Number of videos to fetch (default: 12, max: 50)
 * @returns {Promise<object>} IGTV videos data
 */
const scrapeIGTV = async (username, limit = 12) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Clean username (remove @ if present)
    const cleanUsername = username.replace('@', '');

    // Construct Instagram URL
    const url = `https://www.instagram.com/${cleanUsername}/channel/`;

    console.log(`Scraping Instagram IGTV: ${url}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
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

    // Extract IGTV data
    const igtvData = extractIGTVData(response.body, cleanUsername, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...igtvData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Instagram IGTV scraping error:', error.message);

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
    const limit = event.queryStringParameters?.limit || event.limit || 12;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape IGTV
    const result = await scrapeIGTV(username, parseInt(limit, 10));

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
  scrapeIGTV,
  handler,
};
