/**
 * TikTok Hashtag Scraper
 * Fetches videos by hashtag from TikTok using Oxylabs proxy
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
 * Extract hashtag data from TikTok HTML
 */
const extractHashtagData = (html, hashtag) => {
  try {
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find hashtag data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const challengeData = data?.__DEFAULT_SCOPE__?.['webapp.challenge-detail'];

    if (!challengeData) {
      throw new Error('Hashtag data structure not found');
    }

    const challenge = challengeData.challengeInfo?.challenge;
    const videos = challengeData.itemList || [];

    return {
      success: true,
      data: {
        hashtag: hashtag,
        hashtag_id: challenge?.id,
        title: challenge?.title,
        description: challenge?.desc,
        view_count: challenge?.stats?.viewCount || 0,
        video_count: challenge?.stats?.videoCount || 0,
        is_commerce: challenge?.isCommerce || false,
        video_count_returned: videos.length,
        videos: videos.map((item) => ({
          video_id: item.id,
          author: {
            username: item.author?.uniqueId,
            nickname: item.author?.nickname,
            verified: item.author?.verified,
          },
          description: item.desc,
          create_time: item.createTime,
          video_url: `https://www.tiktok.com/@${item.author?.uniqueId}/video/${item.id}`,
          cover_url: item.video?.cover,
          play_count: item.stats?.playCount || 0,
          like_count: item.stats?.diggCount || 0,
          comment_count: item.stats?.commentCount || 0,
          share_count: item.stats?.shareCount || 0,
          duration: item.video?.duration || 0,
        })),
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract hashtag data: ${error.message}`);
  }
};

/**
 * Scrape TikTok hashtag
 */
const scrapeHashtag = async (hashtag) => {
  const startTime = Date.now();

  try {
    if (!hashtag || typeof hashtag !== 'string') {
      throw new Error('Invalid hashtag provided');
    }

    const cleanHashtag = hashtag.replace('#', '');
    const url = `https://www.tiktok.com/tag/${encodeURIComponent(cleanHashtag)}`;

    console.log(`Scraping TikTok hashtag: ${url}`);

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

    const hashtagData = extractHashtagData(response.body, cleanHashtag);
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
    console.error('TikTok hashtag scraping error:', error.message);

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
    const hashtag = event.queryStringParameters?.hashtag || event.hashtag;

    if (!hashtag) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: hashtag',
        }),
      };
    }

    const result = await scrapeHashtag(hashtag);

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

module.exports = { scrapeHashtag, handler };
