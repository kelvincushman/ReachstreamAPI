/**
 * TikTok User Analytics Scraper
 * Provides enhanced analytics including engagement rates, growth metrics, and performance indicators
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
 * Calculate engagement rate
 * @param {number} likes - Total likes
 * @param {number} comments - Total comments
 * @param {number} shares - Total shares
 * @param {number} followers - Follower count
 * @returns {number} Engagement rate percentage
 */
const calculateEngagementRate = (likes, comments, shares, followers) => {
  if (!followers || followers === 0) return 0;
  const totalEngagement = (likes || 0) + (comments || 0) + (shares || 0);
  return parseFloat(((totalEngagement / followers) * 100).toFixed(2));
};

/**
 * Calculate average views per video
 * @param {Array} videos - Array of video objects
 * @returns {number} Average views
 */
const calculateAverageViews = (videos) => {
  if (!videos || videos.length === 0) return 0;
  const totalViews = videos.reduce((sum, video) => sum + (video.stats?.playCount || 0), 0);
  return Math.round(totalViews / videos.length);
};

/**
 * Extract analytics data from profile and videos
 * @param {string} html - HTML content
 * @param {string} username - TikTok username
 * @returns {object} Extracted analytics data
 */
const extractAnalyticsData = (html, username) => {
  try {
    // TikTok embeds data in a script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find analytics data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const userDetail = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;

    if (!userDetail) {
      throw new Error('Analytics data structure not found');
    }

    const user = userDetail.user;
    const stats = userDetail.stats;

    // Get recent videos for calculating averages
    const videos = data?.__DEFAULT_SCOPE__?.['webapp.video-list']?.list || [];

    // Calculate engagement metrics
    const totalVideos = stats.videoCount || 0;
    const totalHearts = stats.heartCount || 0;
    const followers = stats.followerCount || 0;

    // Estimate total comments and shares (from recent videos)
    const recentTotalLikes = videos.reduce((sum, v) => sum + (v.stats?.diggCount || 0), 0);
    const recentTotalComments = videos.reduce((sum, v) => sum + (v.stats?.commentCount || 0), 0);
    const recentTotalShares = videos.reduce((sum, v) => sum + (v.stats?.shareCount || 0), 0);

    const avgViewsPerVideo = calculateAverageViews(videos);
    const avgLikesPerVideo = videos.length > 0 ? Math.round(recentTotalLikes / videos.length) : 0;
    const avgCommentsPerVideo = videos.length > 0 ? Math.round(recentTotalComments / videos.length) : 0;
    const avgSharesPerVideo = videos.length > 0 ? Math.round(recentTotalShares / videos.length) : 0;

    // Calculate engagement rate from recent videos
    const engagementRate = calculateEngagementRate(
      recentTotalLikes,
      recentTotalComments,
      recentTotalShares,
      followers
    );

    // Video performance tiers
    const videoPerformance = videos.map(video => {
      const views = video.stats?.playCount || 0;
      const likes = video.stats?.diggCount || 0;
      const comments = video.stats?.commentCount || 0;
      const shares = video.stats?.shareCount || 0;
      const videoEngagement = calculateEngagementRate(likes, comments, shares, followers);

      return {
        video_id: video.id,
        create_time: video.createTime,
        description: video.desc?.substring(0, 100) || '',
        views,
        likes,
        comments,
        shares,
        engagement_rate: videoEngagement,
        performance_tier: views > avgViewsPerVideo ? 'above_average' : 'below_average',
      };
    }).slice(0, 20); // Top 20 recent videos

    // Best performing video
    const bestVideo = videos.length > 0
      ? videos.reduce((best, video) =>
          (video.stats?.playCount || 0) > (best.stats?.playCount || 0) ? video : best
        )
      : null;

    // Calculate posting frequency (videos per month)
    const accountAge = user.createTime
      ? (Date.now() / 1000 - user.createTime) / (30 * 24 * 60 * 60) // months
      : null;
    const postingFrequency = accountAge && accountAge > 0
      ? parseFloat((totalVideos / accountAge).toFixed(2))
      : null;

    return {
      success: true,
      data: {
        profile: {
          user_id: user.id,
          username: user.uniqueId,
          nickname: user.nickname,
          verified: user.verified,
          private_account: user.privateAccount,
          profile_url: `https://www.tiktok.com/@${username}`,
        },
        followers: {
          count: followers,
          following_count: stats.followingCount || 0,
          follower_to_following_ratio: stats.followingCount > 0
            ? parseFloat((followers / stats.followingCount).toFixed(2))
            : null,
        },
        content: {
          total_videos: totalVideos,
          total_hearts: totalHearts,
          average_hearts_per_video: totalVideos > 0 ? Math.round(totalHearts / totalVideos) : 0,
          posting_frequency_per_month: postingFrequency,
        },
        engagement: {
          engagement_rate: engagementRate,
          average_views_per_video: avgViewsPerVideo,
          average_likes_per_video: avgLikesPerVideo,
          average_comments_per_video: avgCommentsPerVideo,
          average_shares_per_video: avgSharesPerVideo,
        },
        performance: {
          best_performing_video: bestVideo ? {
            video_id: bestVideo.id,
            description: bestVideo.desc?.substring(0, 100),
            views: bestVideo.stats?.playCount || 0,
            likes: bestVideo.stats?.diggCount || 0,
            created_at: bestVideo.createTime,
          } : null,
          recent_videos_performance: videoPerformance,
        },
        growth_indicators: {
          avg_views_to_followers_ratio: followers > 0
            ? parseFloat((avgViewsPerVideo / followers * 100).toFixed(2))
            : 0,
          viral_potential: avgViewsPerVideo > followers * 2 ? 'high' : avgViewsPerVideo > followers ? 'medium' : 'low',
          account_health: engagementRate > 5 ? 'excellent' : engagementRate > 2 ? 'good' : engagementRate > 1 ? 'average' : 'needs_improvement',
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting analytics data:', error);
    throw new Error(`Failed to extract analytics data: ${error.message}`);
  }
};

/**
 * Scrape TikTok user analytics by username
 * @param {string} username - TikTok username (without @)
 * @returns {Promise<object>} Analytics data
 */
const scrapeAnalytics = async (username) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct TikTok profile URL
    const url = `https://www.tiktok.com/@${cleanUsername}`;

    console.log(`Scraping TikTok analytics: ${url}`);

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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    // Extract analytics data
    const analyticsData = extractAnalyticsData(response.body, cleanUsername);

    const responseTime = Date.now() - startTime;

    return {
      ...analyticsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok analytics scraping error:', error.message);

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

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape analytics
    const result = await scrapeAnalytics(username);

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
  scrapeAnalytics,
  handler,
};
