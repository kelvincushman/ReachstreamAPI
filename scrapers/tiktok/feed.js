/**
 * TikTok Feed Scraper
 * Fetches user's video feed from TikTok using Oxylabs proxy
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
 * Extract feed videos from TikTok HTML
 */
const extractFeedData = (html, username) => {
  try {
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find feed data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const videoList = data?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.itemList || [];

    const videos = videoList.map((item) => ({
      video_id: item.id,
      description: item.desc,
      create_time: item.createTime,
      video_url: `https://www.tiktok.com/@${username}/video/${item.id}`,
      cover_url: item.video?.cover || item.video?.dynamicCover,
      play_count: item.stats?.playCount || 0,
      like_count: item.stats?.diggCount || 0,
      comment_count: item.stats?.commentCount || 0,
      share_count: item.stats?.shareCount || 0,
      duration: item.video?.duration || 0,
      music: {
        title: item.music?.title,
        author: item.music?.authorName,
      },
      hashtags: item.challenges?.map((c) => c.title) || [],
    }));

    return {
      success: true,
      data: {
        username,
        video_count: videos.length,
        videos,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract feed data: ${error.message}`);
  }
};

/**
 * Scrape TikTok user feed
 */
const scrapeFeed = async (username, limit = 30) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://www.tiktok.com/@${cleanUsername}`;

    console.log(`Scraping TikTok feed: ${url}`);

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

    const feedData = extractFeedData(response.body, cleanUsername);
    const responseTime = Date.now() - startTime;

    return {
      ...feedData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('TikTok feed scraping error:', error.message);

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
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '30', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    const result = await scrapeFeed(username, limit);

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

module.exports = { scrapeFeed, handler };
