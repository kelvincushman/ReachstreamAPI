/**
 * TikTok Trending Songs Scraper
 * Get trending/popular songs and audio on TikTok
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
 * Extract trending songs from TikTok HTML
 * @param {string} html - HTML content
 * @param {number} limit - Number of songs to extract
 * @returns {object} Extracted trending songs
 */
const extractTrendingSongs = (html, limit) => {
  try {
    // TikTok embeds data in script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find trending songs data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to trending music data
    const musicList = data?.__DEFAULT_SCOPE__?.['webapp.music-trending']?.musicList || [];

    // Extract song information
    const songs = musicList.slice(0, limit).map(item => {
      const music = item.music || item;

      return {
        music_id: music.id,
        title: music.title || '',
        author: music.authorName || '',
        album: music.album || '',
        cover_url: music.coverThumb || music.coverMedium || music.coverLarge || null,
        play_url: music.playUrl || null,
        duration: music.duration || 0,
        stats: {
          video_count: music.userCount || 0,
          is_original: music.original || false,
        },
        url: `https://www.tiktok.com/music/${music.title?.replace(/\s+/g, '-')}-${music.id}`,
      };
    });

    // Calculate statistics
    const totalVideos = songs.reduce((sum, song) => sum + song.stats.video_count, 0);
    const avgVideos = songs.length > 0 ? Math.round(totalVideos / songs.length) : 0;
    const originalSongs = songs.filter(s => s.stats.is_original).length;

    return {
      success: true,
      data: {
        total_songs: songs.length,
        songs,
        statistics: {
          total_videos_using_songs: totalVideos,
          avg_videos_per_song: avgVideos,
          original_songs_count: originalSongs,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting trending songs:', error);
    throw new Error(`Failed to extract trending songs: ${error.message}`);
  }
};

/**
 * Get TikTok trending songs
 * @param {number} limit - Number of songs to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Trending songs
 */
const getTrendingSongs = async (limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // TikTok trending music URL
    const trendingUrl = 'https://www.tiktok.com/music/trending';

    console.log(`Getting TikTok trending songs: ${trendingUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: trendingUrl,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.tiktok.com/',
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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    // Extract trending songs
    const songsData = extractTrendingSongs(response.body, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...songsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok trending songs error:', error.message);

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
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    // Get trending songs
    const result = await getTrendingSongs(parseInt(limit, 10));

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
  getTrendingSongs,
  handler,
};
