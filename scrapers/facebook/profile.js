/**
 * Facebook Profile Scraper
 * Fetches public profile data from Facebook using Oxylabs proxy
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
 * Extract profile data from Facebook HTML
 */
const extractProfileData = (html, username) => {
  try {
    // Extract from meta tags
    const getMetaContent = (property) => {
      const match = html.match(new RegExp(`<meta property="${property}" content="([^"]+)"`));
      return match ? match[1] : null;
    };

    const name = getMetaContent('og:title');
    const description = getMetaContent('og:description');
    const image = getMetaContent('og:image');
    const url = getMetaContent('og:url');

    // Extract follower/friend count
    const followerMatch = html.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KMB]?)\s+(?:followers?|friends?)/i);
    const followerCount = followerMatch ? followerMatch[1] : null;

    return {
      success: true,
      data: {
        username,
        name,
        description,
        profile_picture_url: image,
        follower_count: followerCount,
        profile_url: url || `https://www.facebook.com/${username}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract profile data: ${error.message}`);
  }
};

/**
 * Scrape Facebook profile
 */
const scrapeProfile = async (username) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://www.facebook.com/${cleanUsername}`;

    console.log(`Scraping Facebook profile: ${url}`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Facebook returned status ${response.statusCode}`);
    }

    const profileData = extractProfileData(response.body, cleanUsername);
    const responseTime = Date.now() - startTime;

    return {
      ...profileData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Facebook scraping error:', error.message);

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
    const username = event.queryStringParameters?.username || event.username;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
          example: 'username=zuck',
        }),
      };
    }

    const result = await scrapeProfile(username);

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

module.exports = { scrapeProfile, handler };
