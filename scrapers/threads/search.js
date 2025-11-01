/**
 * Threads Search Scraper
 * Search for posts on Threads by keyword
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
 * Extract search results from Threads HTML
 * @param {string} html - HTML content
 * @param {string} query - Search query
 * @param {number} limit - Number of results to extract
 * @returns {object} Extracted search results
 */
const extractSearchResults = (html, query, limit) => {
  try {
    // Threads embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to search results
    const searchData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data;

    if (!searchData) {
      throw new Error('Search data structure not found');
    }

    // Extract posts from search results
    const postsEdges = searchData.xdt_api__v1__feed__search_results?.edges || [];

    const posts = postsEdges.slice(0, limit).map(edge => {
      const node = edge.node;

      // Determine post type
      let postType = 'text';
      if (node.__typename === 'GraphVideo') {
        postType = 'video';
      } else if (node.__typename === 'GraphImage') {
        postType = 'image';
      } else if (node.__typename === 'GraphSidecar') {
        postType = 'carousel';
      }

      // Extract media
      let mediaUrls = [];
      if (node.is_video && node.video_url) {
        mediaUrls.push({ type: 'video', url: node.video_url, thumbnail: node.display_url });
      } else if (node.display_url) {
        mediaUrls.push({ type: 'image', url: node.display_url });
      }

      // Extract caption and hashtags
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      const hashtags = caption.match(/#[\w]+/g) || [];
      const mentions = caption.match(/@[\w]+/g) || [];

      return {
        id: node.id,
        shortcode: node.shortcode,
        url: `https://www.threads.net/t/${node.shortcode}`,
        type: postType,
        caption,
        hashtags,
        mentions,
        created_at: new Date(node.taken_at_timestamp * 1000).toISOString(),
        timestamp: node.taken_at_timestamp,
        media: mediaUrls,
        stats: {
          likes: node.edge_liked_by?.count || 0,
          comments: node.edge_media_to_comment?.count || 0,
          plays: node.video_view_count || null,
        },
        author: {
          username: node.owner?.username,
          full_name: node.owner?.full_name,
          profile_pic: node.owner?.profile_pic_url,
          is_verified: node.owner?.is_verified,
        },
        dimensions: node.dimensions,
        is_video: node.is_video || false,
      };
    });

    // Calculate search statistics
    const totalResults = postsEdges.length;
    const videoCount = posts.filter(p => p.type === 'video').length;
    const imageCount = posts.filter(p => p.type === 'image').length;
    const carouselCount = posts.filter(p => p.type === 'carousel').length;

    return {
      success: true,
      data: {
        query,
        total_results: totalResults,
        posts,
        statistics: {
          content_breakdown: {
            video: videoCount,
            image: imageCount,
            carousel: carouselCount,
          },
          avg_likes: posts.length > 0
            ? Math.round(posts.reduce((sum, p) => sum + p.stats.likes, 0) / posts.length)
            : 0,
          avg_comments: posts.length > 0
            ? Math.round(posts.reduce((sum, p) => sum + p.stats.comments, 0) / posts.length)
            : 0,
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting search results:', error);
    throw new Error(`Failed to extract search results: ${error.message}`);
  }
};

/**
 * Search Threads posts by keyword
 * @param {string} query - Search query
 * @param {number} limit - Number of results to fetch (default: 20)
 * @returns {Promise<object>} Search results
 */
const searchPosts = async (query, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Construct Threads search URL
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.threads.net/search?q=${encodedQuery}`;

    console.log(`Searching Threads: ${url}`);

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
      throw new Error(`Threads returned status ${response.statusCode}`);
    }

    // Extract search results
    const searchResults = extractSearchResults(response.body, query, limit);

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

    console.error('Threads search error:', error.message);

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
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
        }),
      };
    }

    // Search posts
    const result = await searchPosts(query, parseInt(limit, 10));

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
  searchPosts,
  handler,
};
