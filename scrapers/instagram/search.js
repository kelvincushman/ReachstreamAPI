/**
 * Instagram Search Scraper
 * Searches Instagram posts/accounts/hashtags using Oxylabs proxy
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
 * Extract search results from Instagram HTML
 */
const extractSearchData = (html, query, type) => {
  try {
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const results = [];

    if (type === 'users' || type === 'all') {
      // Extract user results
      const users = data?.entry_data?.SearchPage?.[0]?.graphql?.hashtag?.edge_hashtag_to_top_posts?.edges || [];
      const userResults = data?.entry_data?.SearchPage?.[0]?.graphql?.users || [];

      for (const user of userResults) {
        results.push({
          type: 'user',
          user_id: user.pk,
          username: user.username,
          full_name: user.full_name,
          profile_picture: user.profile_pic_url,
          is_verified: user.is_verified,
          is_private: user.is_private,
          follower_count: user.follower_count,
          profile_url: `https://www.instagram.com/${user.username}/`,
        });
      }
    }

    if (type === 'hashtags' || type === 'all') {
      // Extract hashtag results
      const hashtags = data?.entry_data?.SearchPage?.[0]?.graphql?.hashtags || [];

      for (const hashtag of hashtags) {
        results.push({
          type: 'hashtag',
          name: hashtag.name,
          post_count: hashtag.media_count,
          hashtag_url: `https://www.instagram.com/explore/tags/${hashtag.name}/`,
        });
      }
    }

    if (type === 'posts' || type === 'all') {
      // Extract post results
      const posts = data?.entry_data?.SearchPage?.[0]?.graphql?.posts || [];

      for (const post of posts) {
        results.push({
          type: 'post',
          post_id: post.id,
          shortcode: post.shortcode,
          post_url: `https://www.instagram.com/p/${post.shortcode}/`,
          caption: post.edge_media_to_caption?.edges?.[0]?.node?.text || '',
          display_url: post.display_url,
          is_video: post.is_video,
          like_count: post.edge_liked_by?.count || 0,
          comment_count: post.edge_media_to_comment?.count || 0,
          timestamp: post.taken_at_timestamp,
          owner_username: post.owner?.username,
        });
      }
    }

    return {
      success: true,
      data: {
        query,
        search_type: type,
        result_count: results.length,
        results,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract search data: ${error.message}`);
  }
};

/**
 * Search Instagram
 */
const searchInstagram = async (query, limit = 20, type = 'all') => {
  const startTime = Date.now();

  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    // Validate type
    const validTypes = ['all', 'users', 'hashtags', 'posts'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid search type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Instagram search endpoint
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.instagram.com/web/search/topsearch/?query=${encodedQuery}`;

    console.log(`Searching Instagram: ${url} (type: ${type})`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Instagram returned status ${response.statusCode}`);
    }

    // Try to parse as JSON first (API response)
    let searchData;
    try {
      const jsonData = JSON.parse(response.body);

      // Transform API response
      const results = [];

      if (jsonData.users && (type === 'users' || type === 'all')) {
        for (const user of jsonData.users) {
          results.push({
            type: 'user',
            user_id: user.user.pk,
            username: user.user.username,
            full_name: user.user.full_name,
            profile_picture: user.user.profile_pic_url,
            is_verified: user.user.is_verified,
            is_private: user.user.is_private,
            follower_count: user.user.follower_count,
            profile_url: `https://www.instagram.com/${user.user.username}/`,
          });
        }
      }

      if (jsonData.hashtags && (type === 'hashtags' || type === 'all')) {
        for (const hashtag of jsonData.hashtags) {
          results.push({
            type: 'hashtag',
            name: hashtag.hashtag.name,
            post_count: hashtag.hashtag.media_count,
            hashtag_url: `https://www.instagram.com/explore/tags/${hashtag.hashtag.name}/`,
          });
        }
      }

      if (jsonData.places && (type === 'places' || type === 'all')) {
        for (const place of jsonData.places) {
          results.push({
            type: 'place',
            place_id: place.place.location.pk,
            name: place.place.title,
            address: place.place.subtitle,
            location_url: `https://www.instagram.com/explore/locations/${place.place.location.pk}/`,
          });
        }
      }

      searchData = {
        success: true,
        data: {
          query,
          search_type: type,
          result_count: results.length,
          results,
          scraped_at: new Date().toISOString(),
        },
      };
    } catch (jsonError) {
      // Fall back to HTML parsing
      searchData = extractSearchData(response.body, query, type);
    }

    const responseTime = Date.now() - startTime;

    // Limit results
    if (searchData.data.results.length > limit) {
      searchData.data.results = searchData.data.results.slice(0, limit);
      searchData.data.result_count = limit;
    }

    return {
      ...searchData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        search_type: type,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Instagram search error:', error.message);

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
    const query = event.queryStringParameters?.query || event.query;
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '20', 10);
    const type = event.queryStringParameters?.type || event.type || 'all';

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
          example: 'query=travel&limit=20&type=users',
          types: ['all', 'users', 'hashtags', 'posts', 'places'],
        }),
      };
    }

    const result = await searchInstagram(query, limit, type);

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

module.exports = { searchInstagram, handler };
