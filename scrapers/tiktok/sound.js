/**
 * TikTok Sound/Music Scraper
 * Fetches data about sounds, music, and audio used on TikTok
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
 * Extract sound/music data from TikTok HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} soundId - Sound ID
 * @returns {object} Extracted sound data
 */
const extractSoundData = (html, soundId) => {
  try {
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find sound data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to sound data (structure may vary)
    const soundData = data?.__DEFAULT_SCOPE__?.['webapp.music-detail']?.musicInfo
                   || data?.data?.musicInfo
                   || data?.musicInfo;

    if (!soundData) {
      throw new Error('Sound data structure not found');
    }

    const music = soundData.music || soundData;
    const stats = soundData.stats || {};

    // Extract videos using this sound
    const videos = (soundData.itemList || soundData.videos || []).slice(0, 10).map(video => ({
      video_id: video.id,
      description: video.desc || video.description,
      author: {
        user_id: video.author?.id,
        username: video.author?.uniqueId,
        nickname: video.author?.nickname,
      },
      stats: {
        play_count: video.stats?.playCount || 0,
        like_count: video.stats?.diggCount || 0,
        comment_count: video.stats?.commentCount || 0,
        share_count: video.stats?.shareCount || 0,
      },
      create_time: video.createTime,
    }));

    return {
      success: true,
      data: {
        sound_id: music.id || soundId,
        title: music.title,
        author: music.authorName || music.author,
        duration: music.duration,
        original: music.original || false,
        album: music.album || null,
        cover_url: {
          large: music.coverLarge,
          medium: music.coverMedium,
          thumb: music.coverThumb,
        },
        play_url: music.playUrl,
        stats: {
          video_count: stats.videoCount || stats.video_count || 0,
          play_count: stats.playCount || stats.play_count || 0,
          share_count: stats.shareCount || stats.share_count || 0,
        },
        top_videos: videos,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting sound data:', error);
    throw new Error(`Failed to extract sound data: ${error.message}`);
  }
};

/**
 * Scrape TikTok sound/music by sound ID
 * @param {string} soundId - TikTok sound ID
 * @returns {Promise<object>} Sound data
 */
const scrapeSound = async (soundId) => {
  const startTime = Date.now();

  try {
    // Validate sound ID
    if (!soundId || typeof soundId !== 'string') {
      throw new Error('Invalid sound ID provided');
    }

    // Construct TikTok sound URL
    const url = `https://www.tiktok.com/music/${soundId}`;

    console.log(`Scraping TikTok sound: ${soundId}`);

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

    // Extract sound data
    const soundData = extractSoundData(response.body, soundId);

    const responseTime = Date.now() - startTime;

    return {
      ...soundData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok sound scraping error:', error.message);

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
    // Extract sound_id from event (API Gateway or direct invocation)
    const soundId = event.queryStringParameters?.sound_id || event.sound_id;

    if (!soundId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: sound_id',
        }),
      };
    }

    // Scrape sound
    const result = await scrapeSound(soundId);

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
  scrapeSound,
  handler,
};
