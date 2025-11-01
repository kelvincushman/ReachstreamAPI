/**
 * Instagram Hashtag Performance Scraper
 * Analyzes hashtag performance, top posts, and engagement metrics
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
 * Extract hashtag data from Instagram HTML
 * @param {string} html - HTML content
 * @param {string} hashtag - Hashtag name
 * @param {number} limit - Number of posts to extract
 * @returns {object} Extracted hashtag data
 */
const extractHashtagData = (html, hashtag, limit) => {
  try {
    // Instagram embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find hashtag data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to hashtag data
    const hashtagData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.hashtag;

    if (!hashtagData) {
      throw new Error('Hashtag data structure not found');
    }

    // Extract hashtag metadata
    const totalPosts = hashtagData.edge_hashtag_to_media?.count || 0;
    const profilePicUrl = hashtagData.profile_pic_url;

    // Extract top posts
    const topPostsEdge = hashtagData.edge_hashtag_to_top_posts?.edges || [];
    const recentPostsEdge = hashtagData.edge_hashtag_to_media?.edges || [];

    // Process top posts (highest engagement)
    const topPosts = topPostsEdge.slice(0, limit).map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        shortcode: node.shortcode,
        url: `https://www.instagram.com/p/${node.shortcode}/`,
        type: node.__typename === 'GraphVideo' ? 'video' : 'photo',
        thumbnail_url: node.thumbnail_src || node.display_url,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        dimensions: {
          width: node.dimensions?.width || 0,
          height: node.dimensions?.height || 0,
        },
        stats: {
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          engagement: (node.edge_liked_by?.count || 0) + (node.edge_media_to_comment?.count || 0),
        },
        is_video: node.is_video || false,
        taken_at: node.taken_at_timestamp,
        created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
        owner: {
          id: node.owner?.id,
          username: node.owner?.username,
        },
        accessibility_caption: node.accessibility_caption,
      };
    });

    // Process recent posts
    const recentPosts = recentPostsEdge.slice(0, limit).map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        shortcode: node.shortcode,
        url: `https://www.instagram.com/p/${node.shortcode}/`,
        type: node.__typename === 'GraphVideo' ? 'video' : 'photo',
        thumbnail_url: node.thumbnail_src || node.display_url,
        caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
        stats: {
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          engagement: (node.edge_liked_by?.count || 0) + (node.edge_media_to_comment?.count || 0),
        },
        is_video: node.is_video || false,
        taken_at: node.taken_at_timestamp,
        created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
        owner: {
          id: node.owner?.id,
          username: node.owner?.username,
        },
      };
    });

    // Calculate engagement metrics from top posts
    const totalLikes = topPosts.reduce((sum, post) => sum + post.stats.likes, 0);
    const totalComments = topPosts.reduce((sum, post) => sum + post.stats.comments, 0);
    const totalEngagement = totalLikes + totalComments;
    const avgEngagement = topPosts.length > 0 ? Math.round(totalEngagement / topPosts.length) : 0;
    const avgLikes = topPosts.length > 0 ? Math.round(totalLikes / topPosts.length) : 0;
    const avgComments = topPosts.length > 0 ? Math.round(totalComments / topPosts.length) : 0;

    // Find best performing post
    const bestPost = topPosts.length > 0
      ? topPosts.reduce((best, post) =>
          post.stats.engagement > best.stats.engagement ? post : best
        )
      : null;

    // Content type distribution
    const videoCount = topPosts.filter(p => p.is_video).length;
    const photoCount = topPosts.filter(p => !p.is_video).length;

    // Determine hashtag popularity tier
    let popularityTier = 'niche';
    if (totalPosts > 10000000) popularityTier = 'extremely_popular';
    else if (totalPosts > 1000000) popularityTier = 'very_popular';
    else if (totalPosts > 100000) popularityTier = 'popular';
    else if (totalPosts > 10000) popularityTier = 'moderate';

    // Engagement rate estimation (based on avg engagement vs post count)
    const estimatedReach = totalPosts > 0 ? avgEngagement / totalPosts * 100000 : 0;
    const competitionLevel = totalPosts > 1000000 ? 'high' : totalPosts > 100000 ? 'medium' : 'low';

    return {
      success: true,
      data: {
        hashtag: `#${hashtag}`,
        hashtag_name: hashtag,
        profile_pic_url: profilePicUrl,
        total_posts: totalPosts,
        popularity_tier: popularityTier,
        competition_level: competitionLevel,
        top_posts: {
          count: topPosts.length,
          posts: topPosts,
        },
        recent_posts: {
          count: recentPosts.length,
          posts: recentPosts,
        },
        performance_metrics: {
          total_engagement: totalEngagement,
          avg_engagement_per_post: avgEngagement,
          avg_likes_per_post: avgLikes,
          avg_comments_per_post: avgComments,
          engagement_rate: avgEngagement > 0 ? parseFloat((avgEngagement / avgLikes * 100).toFixed(2)) : 0,
          best_performing_post: bestPost ? {
            shortcode: bestPost.shortcode,
            url: bestPost.url,
            engagement: bestPost.stats.engagement,
            likes: bestPost.stats.likes,
            comments: bestPost.stats.comments,
          } : null,
        },
        content_insights: {
          video_count: videoCount,
          photo_count: photoCount,
          video_percentage: topPosts.length > 0 ? Math.round((videoCount / topPosts.length) * 100) : 0,
          photo_percentage: topPosts.length > 0 ? Math.round((photoCount / topPosts.length) * 100) : 0,
          preferred_content_type: videoCount > photoCount ? 'video' : 'photo',
        },
        recommendations: {
          use_case: popularityTier === 'niche' || popularityTier === 'moderate'
            ? 'Good for targeted reach and engagement'
            : 'High competition - requires exceptional content quality',
          estimated_reach: Math.round(estimatedReach),
          posting_strategy: competitionLevel === 'high'
            ? 'Post during peak hours with high-quality content'
            : 'Consistent posting with engaging captions',
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting hashtag data:', error);
    throw new Error(`Failed to extract hashtag data: ${error.message}`);
  }
};

/**
 * Scrape Instagram hashtag performance
 * @param {string} hashtag - Hashtag name (without #)
 * @param {number} limit - Number of posts to fetch (default 12)
 * @returns {Promise<object>} Hashtag data
 */
const scrapeHashtag = async (hashtag, limit = 12) => {
  const startTime = Date.now();

  try {
    // Validate hashtag
    if (!hashtag || typeof hashtag !== 'string') {
      throw new Error('Invalid hashtag provided');
    }

    // Remove # if present
    const cleanHashtag = hashtag.replace('#', '').trim();

    if (!cleanHashtag) {
      throw new Error('Hashtag cannot be empty');
    }

    // Construct Instagram hashtag URL
    const url = `https://www.instagram.com/explore/tags/${cleanHashtag}/`;

    console.log(`Scraping Instagram hashtag: ${url}`);

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

    // Extract hashtag data
    const hashtagData = extractHashtagData(response.body, cleanHashtag, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...hashtagData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Instagram hashtag scraping error:', error.message);

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
    // Extract hashtag from event (API Gateway or direct invocation)
    const hashtag = event.queryStringParameters?.hashtag || event.hashtag;
    const limit = event.queryStringParameters?.limit || event.limit || 12;

    if (!hashtag) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: hashtag',
        }),
      };
    }

    // Scrape hashtag
    const result = await scrapeHashtag(hashtag, parseInt(limit, 10));

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
  scrapeHashtag,
  handler,
};
