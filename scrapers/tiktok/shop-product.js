/**
 * TikTok Shop Product Scraper
 * Fetches detailed product data from TikTok Shop using Oxylabs proxy
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
 * Extract product data from TikTok Shop HTML/API response
 * @param {string} html - HTML content or JSON response
 * @param {string} productId - Product ID
 * @returns {object} Extracted product data
 */
const extractProductData = (html, productId) => {
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
        throw new Error('Could not find product data in HTML');
      }

      data = JSON.parse(dataMatch[1]);
    }

    // Navigate to product data (structure may vary)
    const productData = data?.__DEFAULT_SCOPE__?.['shop.product']?.product
                     || data?.data?.product
                     || data?.product;

    if (!productData) {
      throw new Error('Product data structure not found');
    }

    // Extract variants/SKUs
    const variants = (productData.variants || productData.skus || []).map(variant => ({
      variant_id: variant.id || variant.sku_id,
      name: variant.name || variant.title,
      price: variant.price?.amount || variant.price,
      original_price: variant.original_price?.amount || variant.original_price,
      stock: variant.stock || variant.available_stock,
      image_url: variant.image_url || variant.image,
      attributes: variant.attributes || {},
    }));

    // Extract shipping information
    const shipping = {
      free_shipping: productData.free_shipping || false,
      shipping_fee: productData.shipping_fee?.amount || 0,
      shipping_time: productData.shipping_time || productData.delivery_days,
      ships_from: productData.ships_from || productData.warehouse_location,
    };

    // Extract seller information
    const seller = {
      shop_id: productData.shop?.id || productData.seller?.id,
      shop_name: productData.shop?.name || productData.seller?.name,
      shop_url: productData.shop?.url || `https://shop.tiktok.com/shop/${productData.shop?.id}`,
      shop_rating: productData.shop?.rating || productData.seller?.rating,
      shop_followers: productData.shop?.followers || productData.seller?.followers,
      verified: productData.shop?.verified || productData.seller?.verified || false,
    };

    return {
      success: true,
      data: {
        product_id: productData.product_id || productData.id || productId,
        title: productData.title || productData.name,
        description: productData.description,
        price: productData.price?.amount || productData.price,
        currency: productData.price?.currency || 'USD',
        original_price: productData.original_price?.amount || productData.original_price,
        discount_percentage: productData.discount_percentage || calculateDiscount(
          productData.original_price?.amount || productData.original_price,
          productData.price?.amount || productData.price
        ),
        images: productData.images || [productData.image_url],
        video_url: productData.video_url || productData.video,
        category: productData.category || productData.category_name,
        brand: productData.brand,
        tags: productData.tags || [],
        rating: productData.rating || productData.avg_rating,
        review_count: productData.review_count || productData.reviews,
        sold_count: productData.sold_count || productData.sales || productData.total_sold,
        stock_status: productData.stock_status || (productData.available ? 'in_stock' : 'out_of_stock'),
        total_stock: productData.total_stock || productData.available_stock,
        variants,
        shipping,
        seller,
        specifications: productData.specifications || productData.specs || {},
        warranty: productData.warranty,
        return_policy: productData.return_policy || productData.returns,
        url: productData.url || `https://shop.tiktok.com/product/${productId}`,
        created_at: productData.created_at || productData.publish_time,
        updated_at: productData.updated_at || productData.last_update,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting product data:', error);
    throw new Error(`Failed to extract product data: ${error.message}`);
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
 * Scrape TikTok Shop product by product ID
 * @param {string} productId - TikTok Shop product ID
 * @returns {Promise<object>} Product data
 */
const scrapeProduct = async (productId) => {
  const startTime = Date.now();

  try {
    // Validate product ID
    if (!productId || typeof productId !== 'string') {
      throw new Error('Invalid product ID provided');
    }

    // Construct TikTok Shop product URL
    // Try both API endpoint and web page URL
    const apiUrl = `https://shop.tiktok.com/api/v1/product/${productId}`;
    const webUrl = `https://shop.tiktok.com/product/${productId}`;

    console.log(`Scraping TikTok Shop product: ${productId}`);

    // Try API endpoint first
    let response;
    let usedApi = true;

    try {
      response = await gotScraping({
        url: apiUrl,
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
          limit: 1,
          statusCodes: [408, 413, 429, 500, 502, 503, 504],
        },
      });
    } catch (apiError) {
      console.log('API endpoint failed, falling back to web scraping');
      usedApi = false;

      // Fallback to web page scraping
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

    // Extract product data
    const productData = extractProductData(response.body, productId);

    const responseTime = Date.now() - startTime;

    return {
      ...productData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        api_used: usedApi,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok Shop product scraping error:', error.message);

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
    // Extract product_id from event (API Gateway or direct invocation)
    const productId = event.queryStringParameters?.product_id || event.product_id;

    if (!productId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: product_id',
        }),
      };
    }

    // Scrape product
    const result = await scrapeProduct(productId);

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
  scrapeProduct,
  handler,
};
