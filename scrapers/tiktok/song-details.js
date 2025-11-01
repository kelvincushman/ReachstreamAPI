/**
 * TikTok Song Details Scraper
 * Fetches detailed information about a specific song/music on TikTok
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
 * Extract song details from TikTok HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} songId - Song ID
 * @returns {object} Extracted song details
 */
const extractSongDetails = (html, songId) => {
  try {
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find song data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to music/song data
    const musicData = data?.__DEFAULT_SCOPE__?.['webapp.music-detail']?.musicInfo
                   || data?.data?.musicInfo
                   || data?.musicInfo;

    if (!musicData) {
      throw new Error('Song data structure not found');
    }

    const music = musicData.music || musicData;
    const stats = musicData.stats || {};

    // Calculate popularity metrics
    const videoCount = stats.videoCount || stats.video_count || 0;
    const isPopular = videoCount > 100000;
    const isTrending = videoCount > 10000;

    // Determine music category
    let category = 'Original Audio';
    if (music.album) {
      category = 'Commercial Music';
    } else if (music.original) {
      category = 'User Original';
    }

    return {
      success: true,
      data: {
        song_id: music.id || songId,
        title: music.title || '',
        author: music.authorName || music.author || '',
        album: music.album || null,
        duration: music.duration || 0,
        duration_formatted: music.duration ? `${Math.floor(music.duration / 60)}:${String(music.duration % 60).padStart(2, '0')}` : '0:00',
        is_original: music.original || false,
        category,
        cover_images: {
          large: music.coverLarge || null,
          medium: music.coverMedium || null,
          thumb: music.coverThumb || null,
        },
        play_url: music.playUrl || null,
        statistics: {
          video_count: videoCount,
          video_count_formatted: videoCount >= 1000000
            ? `${(videoCount / 1000000).toFixed(1)}M`
            : videoCount >= 1000
            ? `${(videoCount / 1000).toFixed(1)}K`
            : videoCount.toString(),
          is_popular: isPopular,
          is_trending: isTrending,
        },
        popularity_metrics: {
          popularity_score: Math.min(100, Math.floor(videoCount / 10000)),
          trending_rank: isTrending ? 'High' : isPopular ? 'Medium' : 'Low',
          engagement_level: videoCount > 100000 ? 'Viral' : videoCount > 10000 ? 'Popular' : videoCount > 1000 ? 'Moderate' : 'Low',
        },
        usage_info: {
          total_videos_using_song: videoCount,
          can_be_used_in_videos: true,
          attribution_required: !music.original,
        },
        song_url: `https://www.tiktok.com/music/${encodeURIComponent(music.title?.replace(/\s+/g, '-') || 'song')}-${songId}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting song details:', error);
    throw new Error(`Failed to extract song details: ${error.message}`);
  }
};

/**
 * Get TikTok song details by song ID
 * @param {string} songId - TikTok song ID
 * @returns {Promise<object>} Song details
 */
const getSongDetails = async (songId) => {
  const startTime = Date.now();

  try {
    // Validate song ID
    if (!songId || typeof songId !== 'string') {
      throw new Error('Invalid song ID provided');
    }

    // Construct TikTok music URL
    const url = `https://www.tiktok.com/music/-${songId}`;

    console.log(`Fetching TikTok song details: ${songId}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
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

    // Extract song details
    const songData = extractSongDetails(response.body, songId);

    const responseTime = Date.now() - startTime;

    return {
      ...songData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok song details error:', error.message);

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
    // Extract song_id from event (API Gateway or direct invocation)
    const songId = event.queryStringParameters?.song_id || event.song_id;

    if (!songId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: song_id',
        }),
      };
    }

    // Get song details
    const result = await getSongDetails(songId);

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
  getSongDetails,
  handler,
};
