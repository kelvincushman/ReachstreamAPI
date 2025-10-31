/**
 * Instagram Profile Scraper
 * Fetches public profile data from Instagram using Oxylabs proxy
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
 * Extract profile data from Instagram HTML
 */
const extractProfileData = (html, username) => {
  try {
    // Instagram embeds data in window._sharedData
    const dataMatch = html.match(/window\._sharedData\s*=\s*({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find profile data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const userInfo = data?.entry_data?.ProfilePage?.[0]?.graphql?.user;

    if (!userInfo) {
      throw new Error('Profile data structure not found');
    }

    return {
      success: true,
      data: {
        user_id: userInfo.id,
        username: userInfo.username,
        full_name: userInfo.full_name,
        biography: userInfo.biography,
        profile_pic_url: userInfo.profile_pic_url_hd || userInfo.profile_pic_url,
        follower_count: userInfo.edge_followed_by?.count || 0,
        following_count: userInfo.edge_follow?.count || 0,
        post_count: userInfo.edge_owner_to_timeline_media?.count || 0,
        is_verified: userInfo.is_verified,
        is_private: userInfo.is_private,
        is_business_account: userInfo.is_business_account,
        business_category: userInfo.business_category_name,
        external_url: userInfo.external_url,
        profile_url: `https://www.instagram.com/${username}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract profile data: ${error.message}`);
  }
};

/**
 * Scrape Instagram profile
 */
const scrapeProfile = async (username) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://www.instagram.com/${cleanUsername}/`;

    console.log(`Scraping Instagram profile: ${url}`);

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
      throw new Error(`Instagram returned status ${response.statusCode}`);
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
    console.error('Instagram scraping error:', error.message);

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
