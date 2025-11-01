/**
 * TikTok Search Keywords Scraper
 * Search TikTok content by general keywords (videos, hashtags, sounds combined)
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
 * Extract keyword search results from TikTok HTML
 * @param {string} html - HTML content
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to extract
 * @returns {object} Extracted search results
 */
const extractKeywordSearchResults = (html, keyword, limit) => {
  try {
    // TikTok embeds data in script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to search results (general search returns mixed content)
    const searchResults = data?.__DEFAULT_SCOPE__?.['webapp.search-results']?.itemList || [];

    // Extract content information
    const results = searchResults.slice(0, limit).map(item => {
      const video = item.item || item;

      return {
        type: 'video',
        video_id: video.id,
        description: video.desc || '',
        url: `https://www.tiktok.com/@${video.author?.uniqueId}/video/${video.id}`,
        cover_url: video.video?.cover || video.video?.dynamicCover || null,
        play_url: video.video?.playAddr || null,
        duration: video.video?.duration || 0,
        author: {
          user_id: video.author?.id || video.author?.uid,
          username: video.author?.uniqueId,
          nickname: video.author?.nickname,
          avatar: video.author?.avatarThumb || video.author?.avatarMedium,
          is_verified: video.author?.verified || false,
        },
        stats: {
          views: video.stats?.playCount || 0,
          likes: video.stats?.diggCount || 0,
          comments: video.stats?.commentCount || 0,
          shares: video.stats?.shareCount || 0,
        },
        music: {
          id: video.music?.id,
          title: video.music?.title,
          author: video.music?.authorName,
        },
        hashtags: video.challenges?.map(c => c.title) || [],
        created_at: video.createTime ? new Date(video.createTime * 1000).toISOString() : null,
      };
    });

    // Calculate statistics
    const totalViews = results.reduce((sum, item) => sum + (item.stats?.views || 0), 0);
    const totalLikes = results.reduce((sum, item) => sum + (item.stats?.likes || 0), 0);
    const avgViews = results.length > 0 ? Math.round(totalViews / results.length) : 0;
    const avgLikes = results.length > 0 ? Math.round(totalLikes / results.length) : 0;

    // Extract unique hashtags
    const allHashtags = results.flatMap(r => r.hashtags || []);
    const uniqueHashtags = [...new Set(allHashtags)];

    return {
      success: true,
      data: {
        keyword,
        total_results: results.length,
        results,
        statistics: {
          total_views: totalViews,
          total_likes: totalLikes,
          avg_views: avgViews,
          avg_likes: avgLikes,
          unique_hashtags: uniqueHashtags.length,
          top_hashtags: uniqueHashtags.slice(0, 10),
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting keyword search results:', error);
    throw new Error(`Failed to extract search results: ${error.message}`);
  }
};

/**
 * Search TikTok by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Number of results to fetch (default: 20, max: 50)
 * @returns {Promise<object>} Search results
 */
const searchByKeyword = async (keyword, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate keyword
    if (!keyword || typeof keyword !== 'string') {
      throw new Error('Invalid keyword provided');
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    // Construct TikTok search URL for general/top results
    const searchUrl = `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`;

    console.log(`Searching TikTok by keyword: ${searchUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: searchUrl,
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

    // Extract search results
    const searchResults = extractKeywordSearchResults(response.body, keyword, limit);

    const responseTime = Date.now() - startTime;

    return {
      ...searchResults,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok keyword search error:', error.message);

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
    const keyword = event.queryStringParameters?.keyword || event.keyword;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!keyword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: keyword',
        }),
      };
    }

    // Search by keyword
    const result = await searchByKeyword(keyword, parseInt(limit, 10));

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
  searchByKeyword,
  handler,
};
