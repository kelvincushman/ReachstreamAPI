/**
 * YouTube Channel Stats Scraper
 * Fetches comprehensive channel statistics and analytics from YouTube
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
 * Parse view count from text
 * @param {string} viewText - View count text (e.g., "1.2M views", "534K views")
 * @returns {number} Numeric view count
 */
const parseViewCount = (viewText) => {
  if (!viewText) return 0;

  const match = viewText.match(/([\d.]+)([KMB]?)/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const multiplier = match[2];

  return multiplier === 'K' ? num * 1000 :
         multiplier === 'M' ? num * 1000000 :
         multiplier === 'B' ? num * 1000000000 : num;
};

/**
 * Extract channel statistics from YouTube HTML
 * @param {string} html - HTML content
 * @param {string} channelId - YouTube channel ID
 * @returns {object} Extracted channel statistics
 */
const extractChannelStats = (html, channelId) => {
  try {
    // YouTube embeds data in ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find channel data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const header = data?.header?.c4TabbedHeaderRenderer || data?.header?.pageHeaderRenderer;
    const metadata = data?.metadata?.channelMetadataRenderer;

    if (!header || !metadata) {
      throw new Error('Channel data structure not found');
    }

    // Extract subscriber count
    const subscriberText = header.subscriberCountText?.simpleText ||
                          header.subscriberCountText?.runs?.[0]?.text ||
                          '0 subscribers';

    const subscriberMatch = subscriberText.match(/([\d.]+)([KMB]?)/);
    let subscriberCount = 0;
    if (subscriberMatch) {
      const num = parseFloat(subscriberMatch[1]);
      const multiplier = subscriberMatch[2];
      subscriberCount = multiplier === 'K' ? num * 1000 :
                       multiplier === 'M' ? num * 1000000 :
                       multiplier === 'B' ? num * 1000000000 : num;
    }

    // Extract video count
    const videoCountText = header.videosCountText?.runs?.[0]?.text || '0';
    const videoCount = parseInt(videoCountText.replace(/,/g, ''), 10) || 0;

    // Extract recent videos for analytics
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const videosTab = tabs.find(tab => tab.tabRenderer?.title === 'Videos' || tab.tabRenderer?.selected);
    const videoContent = videosTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

    const recentVideos = videoContent
      .filter(item => item.richItemRenderer?.content?.videoRenderer)
      .slice(0, 20)
      .map(item => {
        const video = item.richItemRenderer.content.videoRenderer;
        const views = parseViewCount(video.viewCountText?.simpleText || video.viewCountText?.runs?.[0]?.text || '0');

        return {
          video_id: video.videoId,
          title: video.title?.runs?.[0]?.text || '',
          views,
          published: video.publishedTimeText?.simpleText || '',
        };
      });

    // Calculate analytics
    const totalViews = recentVideos.reduce((sum, v) => sum + v.views, 0);
    const avgViewsPerVideo = recentVideos.length > 0 ? Math.round(totalViews / recentVideos.length) : 0;
    const maxViews = recentVideos.length > 0 ? Math.max(...recentVideos.map(v => v.views)) : 0;
    const minViews = recentVideos.length > 0 ? Math.min(...recentVideos.map(v => v.views)) : 0;

    // Estimate total channel views (rough estimate based on avg views * video count)
    const estimatedTotalViews = avgViewsPerVideo * videoCount;

    // Calculate engagement metrics
    const subscriberEngagementRate = subscriberCount > 0 ? (avgViewsPerVideo / subscriberCount) * 100 : 0;

    // Estimate upload frequency based on recent videos
    let uploadFrequency = 'Unknown';
    if (recentVideos.length >= 3) {
      const firstVideo = recentVideos[0];
      const lastVideo = recentVideos[recentVideos.length - 1];

      if (firstVideo.published && lastVideo.published) {
        uploadFrequency = 'Regular uploads';
      }
    }

    return {
      success: true,
      data: {
        channel_id: metadata.externalId,
        channel_name: metadata.title,
        handle: metadata.vanityChannelUrl?.replace('http://www.youtube.com/', ''),
        subscriber_count: Math.round(subscriberCount),
        subscriber_text: subscriberText,
        video_count: videoCount,
        is_verified: header.badges?.some(b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED') || false,
        country: metadata.country || null,
        statistics: {
          avg_views_per_video: avgViewsPerVideo,
          max_views: maxViews,
          min_views: minViews,
          estimated_total_views: estimatedTotalViews,
          subscriber_engagement_rate: parseFloat(subscriberEngagementRate.toFixed(2)),
          upload_frequency: uploadFrequency,
          recent_videos_analyzed: recentVideos.length,
        },
        performance_insights: {
          consistency_score: recentVideos.length > 0
            ? parseFloat(((1 - (maxViews - minViews) / maxViews) * 100).toFixed(2))
            : 0,
          growth_potential: subscriberEngagementRate > 10 ? 'High' : subscriberEngagementRate > 5 ? 'Medium' : 'Low',
          content_performance: avgViewsPerVideo > 100000 ? 'Excellent' : avgViewsPerVideo > 10000 ? 'Good' : avgViewsPerVideo > 1000 ? 'Average' : 'Below Average',
        },
        top_performing_videos: recentVideos
          .sort((a, b) => b.views - a.views)
          .slice(0, 5)
          .map(v => ({
            video_id: v.video_id,
            title: v.title,
            views: v.views,
            url: `https://www.youtube.com/watch?v=${v.video_id}`,
          })),
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting channel stats:', error);
    throw new Error(`Failed to extract channel stats: ${error.message}`);
  }
};

/**
 * Scrape YouTube channel statistics
 * @param {string} channelId - YouTube channel ID or handle
 * @returns {Promise<object>} Channel statistics
 */
const scrapeChannelStats = async (channelId) => {
  const startTime = Date.now();

  try {
    // Validate channel ID
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Invalid channel ID provided');
    }

    // Support both channel IDs (UC...) and handles (@username)
    const url = channelId.startsWith('@')
      ? `https://www.youtube.com/${channelId}/videos`
      : channelId.startsWith('UC')
      ? `https://www.youtube.com/channel/${channelId}/videos`
      : `https://www.youtube.com/@${channelId}/videos`;

    console.log(`Scraping YouTube channel stats: ${url}`);

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
      throw new Error(`YouTube returned status ${response.statusCode}`);
    }

    // Extract channel statistics
    const statsData = extractChannelStats(response.body, channelId);

    const responseTime = Date.now() - startTime;

    return {
      ...statsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('YouTube channel stats scraping error:', error.message);

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
    const channelId = event.queryStringParameters?.channel_id || event.channel_id;

    if (!channelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: channel_id',
        }),
      };
    }

    // Scrape channel stats
    const result = await scrapeChannelStats(channelId);

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
  scrapeChannelStats,
  handler,
};
