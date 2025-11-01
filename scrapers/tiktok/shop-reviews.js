/**
 * TikTok Shop Reviews Scraper
 * Fetches product reviews from TikTok Shop using Oxylabs proxy
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
 * Extract reviews data from TikTok Shop HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} productId - Product ID
 * @returns {object} Extracted reviews data
 */
const extractReviewsData = (html, productId) => {
  try {
    // TikTok Shop embeds data in script tag or returns JSON API response
    let data;

    // Check if response is already JSON
    try {
      data = JSON.parse(html);
    } catch {
      // If not JSON, extract from HTML script tag
      const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

      if (!dataMatch) {
        throw new Error('Could not find reviews data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to reviews data (structure may vary)
    const reviewsData = data?.__DEFAULT_SCOPE__?.['shop.reviews']?.reviews
                     || data?.data?.reviews
                     || data?.reviews
                     || [];

    const reviews = reviewsData.map(review => ({
      review_id: review.review_id || review.id,
      user_id: review.user?.id || review.user_id,
      username: review.user?.username || review.username || 'Anonymous',
      user_avatar: review.user?.avatar_url || review.avatar,
      rating: review.rating || review.stars,
      title: review.title || review.subject,
      comment: review.comment || review.text || review.content,
      likes: review.likes || review.helpful_count || 0,
      created_at: review.created_at || review.review_time || review.timestamp,
      verified_purchase: review.verified_purchase || review.is_verified || false,
      images: review.images || review.photos || [],
      videos: review.videos || [],
      variant: review.variant || review.sku_name,
      seller_response: review.seller_response ? {
        comment: review.seller_response.comment || review.seller_response.text,
        created_at: review.seller_response.created_at || review.seller_response.timestamp,
      } : null,
      helpful: review.helpful || review.is_helpful || false,
    }));

    // Get rating distribution
    const ratingDistribution = data?.rating_distribution || data?.stats?.rating_distribution || {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    // Get summary statistics
    const stats = {
      total_reviews: data?.total_reviews || data?.total || reviews.length,
      average_rating: data?.average_rating || data?.avg_rating || calculateAverageRating(reviews),
      rating_distribution: ratingDistribution,
      verified_purchases: reviews.filter(r => r.verified_purchase).length,
      with_images: reviews.filter(r => r.images && r.images.length > 0).length,
      with_videos: reviews.filter(r => r.videos && r.videos.length > 0).length,
    };

    // Get pagination data
    const hasMore = data?.has_more || data?.pagination?.has_more || false;
    const cursor = data?.cursor || data?.pagination?.cursor || null;

    return {
      success: true,
      data: {
        product_id: productId,
        statistics: stats,
        reviews,
        has_more: hasMore,
        cursor,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting reviews data:', error);
    throw new Error(`Failed to extract reviews data: ${error.message}`);
  }
};

/**
 * Calculate average rating from reviews
 * @param {Array} reviews - Array of review objects
 * @returns {number} Average rating
 */
const calculateAverageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
};

/**
 * Scrape TikTok Shop product reviews
 * @param {string} productId - TikTok Shop product ID
 * @param {number} limit - Number of reviews to fetch (default 50)
 * @param {string} cursor - Pagination cursor (optional)
 * @param {string} filter - Filter reviews (all, positive, negative, with_media)
 * @returns {Promise<object>} Reviews data
 */
const scrapeReviews = async (productId, limit = 50, cursor = null, filter = 'all') => {
  const startTime = Date.now();

  try {
    // Validate product ID
    if (!productId || typeof productId !== 'string') {
      throw new Error('Invalid product ID provided');
    }

    // Construct TikTok Shop reviews URL
    const baseUrl = `https://shop.tiktok.com/api/v1/product/${productId}/reviews`;
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    // Apply filter
    if (filter !== 'all') {
      params.append('filter', filter);
    }

    const url = `${baseUrl}?${params.toString()}`;

    console.log(`Scraping TikTok Shop reviews for product: ${productId}`);

    // Try API endpoint first
    let response;
    let usedApi = true;

    try {
      response = await gotScraping({
        url,
        proxyUrl: getProxyUrl(),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': `https://shop.tiktok.com/product/${productId}`,
          'Origin': 'https://shop.tiktok.com',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        timeout: {
          request: 30000, // 30 second timeout
        },
        retry: {
          limit: 1,
          statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
      });
    } catch (apiError) {
      console.log('API endpoint failed, falling back to web scraping');
      usedApi = false;

      // Fallback to web page scraping
      const webUrl = `https://shop.tiktok.com/product/${productId}#reviews`;
      response = await gotScraping({
        url: webUrl,
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
          request: 30000,
        },
        retry: {
          limit: 2,
          statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
      });
    }

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`TikTok Shop returned status ${response.statusCode}`);
    }

    // Extract reviews data
    const reviewsData = extractReviewsData(response.body, productId);

    const responseTime = Date.now() - startTime;

    return {
      ...reviewsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        api_used: usedApi,
        filter_applied: filter,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok Shop reviews scraping error:', error.message);

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
    const productId = event.queryStringParameters?.product_id || event.product_id;
    const limit = event.queryStringParameters?.limit || event.limit || 50;
    const cursor = event.queryStringParameters?.cursor || event.cursor || null;
    const filter = event.queryStringParameters?.filter || event.filter || 'all';

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: product_id',
        }),
      };
    }

    // Scrape reviews
    const result = await scrapeReviews(productId, parseInt(limit, 10), cursor, filter);

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
  scrapeReviews,
  handler,
};
