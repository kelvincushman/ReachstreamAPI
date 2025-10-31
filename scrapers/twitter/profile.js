/**
 * Twitter/X Profile Scraper
 * Fetches public profile data from Twitter using Oxylabs proxy
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
 * Extract profile data from Twitter HTML
 */
const extractProfileData = (html, username) => {
  try {
    // Twitter/X uses GraphQL and embeds data in script tags
    const dataMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__=(\{.+?\})<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find profile data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate through Twitter's complex data structure
    const users = data?.users?.entities?.users;
    if (!users) {
      throw new Error('Profile data structure not found');
    }

    // Find the user object
    const userObj = Object.values(users).find(u =>
      u.screen_name?.toLowerCase() === username.toLowerCase()
    );

    if (!userObj) {
      throw new Error('User not found in data');
    }

    return {
      success: true,
      data: {
        user_id: userObj.id_str,
        username: userObj.screen_name,
        display_name: userObj.name,
        description: userObj.description,
        profile_image_url: userObj.profile_image_url_https?.replace('_normal', '_400x400'),
        profile_banner_url: userObj.profile_banner_url,
        follower_count: userObj.followers_count || 0,
        following_count: userObj.friends_count || 0,
        tweet_count: userObj.statuses_count || 0,
        is_verified: userObj.verified || userObj.is_blue_verified || false,
        is_protected: userObj.protected || false,
        location: userObj.location,
        url: userObj.url,
        created_at: userObj.created_at,
        profile_url: `https://twitter.com/${username}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract profile data: ${error.message}`);
  }
};

/**
 * Scrape Twitter profile
 */
const scrapeProfile = async (username) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://twitter.com/${cleanUsername}`;

    console.log(`Scraping Twitter profile: ${url}`);

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
      throw new Error(`Twitter returned status ${response.statusCode}`);
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
    console.error('Twitter scraping error:', error.message);

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
