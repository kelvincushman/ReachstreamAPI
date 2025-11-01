/**
 * TikTok Shop Search Scraper
 * Searches for products on TikTok Shop using Oxylabs proxy
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
 * Extract product search data from TikTok Shop HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} query - Search query
 * @returns {object} Extracted search results
 */
const extractSearchData = (html, query) => {
  try {
    // TikTok Shop embeds data in script tag or returns JSON API response
    // Try to find JSON data in various formats
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find shop search data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to shop search data (structure may vary)
    const searchResults = data?.__DEFAULT_SCOPE__?.['shop.search']?.products
                       || data?.data?.products
                       || data?.products
                       || [];

    const products = searchResults.map(product => ({
      product_id: product.product_id || product.id,
      title: product.title || product.name,
      price: product.price?.amount || product.price,
      currency: product.price?.currency || 'USD',
      original_price: product.original_price?.amount || product.original_price,
      discount_percentage: product.discount_percentage || calculateDiscount(product.original_price, product.price),
      image_url: product.image_url || product.images?.[0] || product.cover_image,
      images: product.images || [product.image_url],
      shop_name: product.shop?.name || product.seller_name,
      shop_id: product.shop?.id || product.seller_id,
      rating: product.rating || product.avg_rating,
      review_count: product.review_count || product.reviews,
      sold_count: product.sold_count || product.sales,
      url: product.url || `https://shop.tiktok.com/product/${product.product_id || product.id}`,
      tags: product.tags || [],
      is_sponsored: product.is_ad || product.sponsored || false,
      stock_status: product.stock_status || (product.available ? 'in_stock' : 'out_of_stock'),
    }));

    // Get pagination data
    const hasMore = data?.has_more || data?.pagination?.has_more || false;
    const cursor = data?.cursor || data?.pagination?.cursor || null;
    const totalResults = data?.total || data?.total_results || products.length;

    return {
      success: true,
      data: {
        query,
        total_results: totalResults,
        products,
        has_more: hasMore,
        cursor,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting shop search data:', error);
    throw new Error(`Failed to extract search data: ${error.message}`);
  }
};

/**
 * Calculate discount percentage
 * @param {number} original - Original price
 * @param {number} current - Current price
 * @returns {number} Discount percentage
 */
const calculateDiscount = (original, current) => {
  if (!original || !current || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
};

/**
 * Search TikTok Shop for products
 * @param {string} query - Search query
 * @param {string} cursor - Pagination cursor (optional)
 * @param {number} limit - Number of results (optional, default 20)
 * @returns {Promise<object>} Search results
 */
const searchShop = async (query, cursor = null, limit = 20) => {
  const startTime = Date.now();

  try {
    // Validate query
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    // Construct TikTok Shop search URL
    const baseUrl = 'https://shop.tiktok.com/api/v1/search/product';
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`Searching TikTok Shop: ${query}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://shop.tiktok.com/',
        'Origin': 'https://shop.tiktok.com',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
      timeout: {
        request: 30000, // 30 second timeout
      },
      retry: {
        limit: 2, // Retry twice on failure
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`TikTok Shop returned status ${response.statusCode}`);
    }

    // Extract search data
    const searchData = extractSearchData(response.body, query);

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

    console.error('TikTok Shop search error:', error.message);

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
    const cursor = event.queryStringParameters?.cursor || event.cursor || null;
    const limit = event.queryStringParameters?.limit || event.limit || 20;

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
        }),
      };
    }

    // Search products
    const result = await searchShop(query, cursor, parseInt(limit, 10));

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
  searchShop,
  handler,
};
