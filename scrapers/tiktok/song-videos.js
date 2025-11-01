/**
 * TikTok Song Videos Scraper
 * Fetches videos that use a specific song/music on TikTok
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
 * Extract videos using a song from TikTok HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} songId - Song ID
 * @param {number} limit - Number of videos to extract
 * @returns {object} Extracted song videos
 */
const extractSongVideos = (html, songId, limit) => {
  try {
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find video data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to music detail data
    const musicData = data?.__DEFAULT_SCOPE__?.['webapp.music-detail']?.musicInfo
                   || data?.data?.musicInfo
                   || data?.musicInfo;

    if (!musicData) {
      throw new Error('Music data structure not found');
    }

    const music = musicData.music || musicData;
    const videoList = musicData.itemList || musicData.videos || [];

    // Extract video information
    const videos = videoList.slice(0, limit).map(video => {
      const author = video.author || {};
      const stats = video.stats || {};
      const musicInfo = video.music || {};

      return {
        video_id: video.id,
        description: video.desc || video.description || '',
        create_time: video.createTime,
        create_time_iso: video.createTime ? new Date(video.createTime * 1000).toISOString() : null,
        video_url: `https://www.tiktok.com/@${author.uniqueId}/video/${video.id}`,
        author: {
          user_id: author.id || '',
          username: author.uniqueId || '',
          nickname: author.nickname || '',
          avatar: author.avatarThumb || author.avatarMedium || author.avatarLarge || null,
          verified: author.verified || false,
          signature: author.signature || '',
        },
        video_stats: {
          play_count: stats.playCount || 0,
          like_count: stats.diggCount || 0,
          comment_count: stats.commentCount || 0,
          share_count: stats.shareCount || 0,
          download_count: stats.downloadCount || 0,
        },
        engagement_metrics: {
          engagement_rate: stats.playCount > 0
            ? (((stats.diggCount || 0) + (stats.commentCount || 0) + (stats.shareCount || 0)) / stats.playCount * 100).toFixed(2)
            : 0,
          like_rate: stats.playCount > 0 ? ((stats.diggCount || 0) / stats.playCount * 100).toFixed(2) : 0,
          comment_rate: stats.playCount > 0 ? ((stats.commentCount || 0) / stats.playCount * 100).toFixed(2) : 0,
        },
        video_info: {
          duration: video.video?.duration || 0,
          width: video.video?.width || 0,
          height: video.video?.height || 0,
          ratio: video.video?.ratio || '',
          cover: video.video?.cover || video.video?.dynamicCover || null,
          play_addr: video.video?.playAddr || null,
          download_addr: video.video?.downloadAddr || null,
        },
        music_used: {
          music_id: musicInfo.id || songId,
          music_title: musicInfo.title || music.title || '',
          music_author: musicInfo.authorName || music.authorName || '',
        },
        hashtags: (video.textExtra || [])
          .filter(tag => tag.hashtagName)
          .map(tag => ({
            id: tag.hashtagId,
            name: tag.hashtagName,
          })),
      };
    });

    // Calculate aggregate statistics
    const totalPlays = videos.reduce((sum, v) => sum + v.video_stats.play_count, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.video_stats.like_count, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.video_stats.comment_count, 0);
    const totalShares = videos.reduce((sum, v) => sum + v.video_stats.share_count, 0);

    const avgPlays = videos.length > 0 ? Math.round(totalPlays / videos.length) : 0;
    const avgLikes = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0;
    const avgComments = videos.length > 0 ? Math.round(totalComments / videos.length) : 0;

    // Find top performing video
    const topVideo = videos.length > 0
      ? videos.reduce((best, video) =>
          video.video_stats.play_count > best.video_stats.play_count ? video : best
        )
      : null;

    return {
      success: true,
      data: {
        song_id: songId,
        song_info: {
          title: music.title || '',
          author: music.authorName || music.author || '',
          cover: music.coverThumb || music.coverMedium || null,
        },
        total_videos_returned: videos.length,
        videos,
        aggregate_stats: {
          total_plays: totalPlays,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: totalShares,
          avg_plays_per_video: avgPlays,
          avg_likes_per_video: avgLikes,
          avg_comments_per_video: avgComments,
          overall_engagement_rate: totalPlays > 0
            ? ((totalLikes + totalComments + totalShares) / totalPlays * 100).toFixed(2)
            : 0,
        },
        top_performing_video: topVideo ? {
          video_id: topVideo.video_id,
          author_username: topVideo.author.username,
          play_count: topVideo.video_stats.play_count,
          like_count: topVideo.video_stats.like_count,
          video_url: topVideo.video_url,
        } : null,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting song videos:', error);
    throw new Error(`Failed to extract song videos: ${error.message}`);
  }
};

/**
 * Get videos using a specific TikTok song
 * @param {string} songId - TikTok song ID
 * @param {number} limit - Number of videos to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Song videos data
 */
const getSongVideos = async (songId, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate song ID
    if (!songId || typeof songId !== 'string') {
      throw new Error('Invalid song ID provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct TikTok music URL
    const url = `https://www.tiktok.com/music/-${songId}`;

    console.log(`Fetching videos for TikTok song: ${songId}`);

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

    // Extract song videos
    const videosData = extractSongVideos(response.body, songId, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...videosData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok song videos error:', error.message);

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
    const songId = event.queryStringParameters?.song_id || event.song_id;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!songId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: song_id',
        }),
      };
    }

    // Get song videos
    const result = await getSongVideos(songId, parseInt(limit, 10));

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
  getSongVideos,
  handler,
};
