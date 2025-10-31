/**
 * TikTok Video Details Scraper
 * Fetches detailed information about a specific TikTok video
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
 * Extract video details from TikTok HTML
 */
const extractVideoData = (html, videoId) => {
  try {
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find video data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const videoDetail = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;

    if (!videoDetail) {
      throw new Error('Video data structure not found');
    }

    return {
      success: true,
      data: {
        video_id: videoDetail.id,
        description: videoDetail.desc,
        create_time: videoDetail.createTime,
        author: {
          user_id: videoDetail.author?.id,
          username: videoDetail.author?.uniqueId,
          nickname: videoDetail.author?.nickname,
          avatar_url: videoDetail.author?.avatarThumb,
          verified: videoDetail.author?.verified,
        },
        video: {
          url: videoDetail.video?.playAddr || videoDetail.video?.downloadAddr,
          cover_url: videoDetail.video?.cover || videoDetail.video?.dynamicCover,
          duration: videoDetail.video?.duration,
          width: videoDetail.video?.width,
          height: videoDetail.video?.height,
          ratio: videoDetail.video?.ratio,
          download_url: videoDetail.video?.downloadAddr,
        },
        stats: {
          play_count: videoDetail.stats?.playCount || 0,
          like_count: videoDetail.stats?.diggCount || 0,
          comment_count: videoDetail.stats?.commentCount || 0,
          share_count: videoDetail.stats?.shareCount || 0,
          collect_count: videoDetail.stats?.collectCount || 0,
        },
        music: {
          id: videoDetail.music?.id,
          title: videoDetail.music?.title,
          author: videoDetail.music?.authorName,
          album: videoDetail.music?.album,
          play_url: videoDetail.music?.playUrl,
          cover_url: videoDetail.music?.coverThumb,
          duration: videoDetail.music?.duration,
        },
        hashtags: videoDetail.challenges?.map(c => ({
          id: c.id,
          title: c.title,
          description: c.desc,
          is_commerce: c.isCommerce,
        })) || [],
        is_ad: videoDetail.isAd || false,
        video_url: `https://www.tiktok.com/@${videoDetail.author?.uniqueId}/video/${videoId}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract video data: ${error.message}`);
  }
};

/**
 * Scrape TikTok video details
 */
const scrapeVideo = async (videoId) => {
  const startTime = Date.now();

  try {
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID provided');
    }

    // TikTok video URLs can be in format: /video/{id} or /@username/video/{id}
    // We'll try to construct the URL from just the video ID
    const url = `https://www.tiktok.com/video/${videoId}`;

    console.log(`Scraping TikTok video: ${url}`);

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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    const videoData = extractVideoData(response.body, videoId);
    const responseTime = Date.now() - startTime;

    return {
      ...videoData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('TikTok video scraping error:', error.message);

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
    const videoId = event.queryStringParameters?.video_id || event.video_id;

    if (!videoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: video_id',
          example: 'video_id=7123456789012345678',
        }),
      };
    }

    const result = await scrapeVideo(videoId);

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

module.exports = { scrapeVideo, handler };
