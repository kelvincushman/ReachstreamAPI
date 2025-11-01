/**
 * TikTok Search Scraper
 * Search for users, videos, hashtags, and sounds on TikTok
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
 * Extract search results from TikTok HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} query - Search query
 * @param {string} type - Search type
 * @returns {object} Extracted search results
 */
const extractSearchData = (html, query, type) => {
  try {
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find search data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to search results based on type
    let results = [];
    const searchData = data?.__DEFAULT_SCOPE__?.['webapp.search'] || data?.data || data;

    if (type === 'users' || type === 'all') {
      const userResults = searchData?.users || searchData?.user_list || [];
      results.push(...userResults.map(user => ({
        type: 'user',
        user_id: user.id || user.uid,
        username: user.uniqueId || user.unique_id,
        nickname: user.nickname,
        avatar_url: user.avatarLarger || user.avatarMedium || user.avatar,
        signature: user.signature,
        verified: user.verified,
        follower_count: user.followerCount || user.fans_count,
        video_count: user.videoCount || user.video_count,
        profile_url: `https://www.tiktok.com/@${user.uniqueId || user.unique_id}`,
      })));
    }

    if (type === 'videos' || type === 'all') {
      const videoResults = searchData?.videos || searchData?.item_list || [];
      results.push(...videoResults.map(video => ({
        type: 'video',
        video_id: video.id,
        description: video.desc || video.description,
        create_time: video.createTime || video.create_time,
        author: {
          user_id: video.author?.id || video.author_id,
          username: video.author?.uniqueId || video.author_name,
          nickname: video.author?.nickname,
        },
        stats: {
          play_count: video.stats?.playCount || video.play_count || 0,
          like_count: video.stats?.diggCount || video.digg_count || 0,
          comment_count: video.stats?.commentCount || video.comment_count || 0,
          share_count: video.stats?.shareCount || video.share_count || 0,
        },
        video_url: video.video?.downloadAddr || video.video_url,
        cover_url: video.video?.cover || video.cover_url,
        hashtags: video.challenges?.map(c => c.title) || [],
        music: {
          id: video.music?.id,
          title: video.music?.title,
          author: video.music?.authorName,
        },
      })));
    }

    if (type === 'hashtags' || type === 'all') {
      const hashtagResults = searchData?.hashtags || searchData?.challenge_list || [];
      results.push(...hashtagResults.map(hashtag => ({
        type: 'hashtag',
        hashtag_id: hashtag.id,
        title: hashtag.title,
        description: hashtag.desc || hashtag.description,
        view_count: hashtag.viewCount || hashtag.view_count || 0,
        video_count: hashtag.videoCount || hashtag.user_count || 0,
        cover_url: hashtag.coverLarger || hashtag.cover,
        is_commerce: hashtag.isCommerce || false,
      })));
    }

    if (type === 'sounds' || type === 'all') {
      const soundResults = searchData?.sounds || searchData?.music_list || [];
      results.push(...soundResults.map(sound => ({
        type: 'sound',
        sound_id: sound.id,
        title: sound.title,
        author: sound.authorName || sound.author,
        duration: sound.duration,
        play_count: sound.stats?.videoCount || sound.user_count || 0,
        cover_url: sound.coverLarge || sound.cover,
        original: sound.original || false,
      })));
    }

    // Get pagination data
    const hasMore = data?.has_more || data?.hasMore || false;
    const cursor = data?.cursor || null;

    return {
      success: true,
      data: {
        query,
        type,
        total_results: results.length,
        results,
        has_more: hasMore,
        cursor,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting search data:', error);
    throw new Error(`Failed to extract search data: ${error.message}`);
  }
};

/**
 * Search TikTok
 * @param {string} query - Search query
 * @param {string} type - Search type: users, videos, hashtags, sounds, all
 * @param {number} limit - Number of results (default 20)
 * @param {string} cursor - Pagination cursor (optional)
 * @returns {Promise<object>} Search results
 */
const searchTikTok = async (query, type = 'all', limit = 20, cursor = null) => {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    // Validate type
    const validTypes = ['all', 'users', 'videos', 'hashtags', 'sounds'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid search type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Construct TikTok search URL
    const baseUrl = 'https://www.tiktok.com/api/search';
    const params = new URLSearchParams({
      keyword: query,
      offset: cursor || '0',
      count: limit.toString(),
    });

    // Add type-specific parameters
    if (type !== 'all') {
      params.append('type', type === 'users' ? '1' : type === 'videos' ? '0' : type === 'hashtags' ? '3' : '4');
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`Searching TikTok: "${query}" (type: ${type})`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.tiktok.com/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
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

    // Extract search data
    const searchData = extractSearchData(response.body, query, type);

    const responseTime = Date.now() - startTime;

    return {
      ...searchData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok search error:', error.message);

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
    const query = event.queryStringParameters?.query || event.query;
    const type = event.queryStringParameters?.type || event.type || 'all';
    const limit = event.queryStringParameters?.limit || event.limit || 20;
    const cursor = event.queryStringParameters?.cursor || event.cursor || null;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
        }),
      };
    }

    // Search TikTok
    const result = await searchTikTok(query, type, parseInt(limit, 10), cursor);

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
  searchTikTok,
  handler,
};
