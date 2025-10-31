/**
 * Twitter/X User Feed Scraper
 * Fetches user's tweets from Twitter/X using Oxylabs proxy
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
 * Extract tweets from Twitter HTML
 */
const extractFeedData = (html, username) => {
  try {
    const dataMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__=(\{.+?\})<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find feed data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const tweets = data?.tweets?.entities?.tweets || {};

    const tweetArray = Object.values(tweets).map(tweet => ({
      tweet_id: tweet.id_str,
      text: tweet.full_text || tweet.text,
      created_at: tweet.created_at,
      user: {
        username: tweet.user?.screen_name,
        display_name: tweet.user?.name,
        verified: tweet.user?.verified,
        profile_image: tweet.user?.profile_image_url_https,
      },
      engagement: {
        retweets: tweet.retweet_count || 0,
        likes: tweet.favorite_count || 0,
        replies: tweet.reply_count || 0,
      },
      media: tweet.entities?.media?.map(m => ({
        type: m.type,
        url: m.media_url_https,
      })) || [],
      hashtags: tweet.entities?.hashtags?.map(h => h.text) || [],
      mentions: tweet.entities?.user_mentions?.map(m => m.screen_name) || [],
      urls: tweet.entities?.urls?.map(u => u.expanded_url) || [],
      is_retweet: !!tweet.retweeted_status,
      is_quote: !!tweet.quoted_status,
      tweet_url: `https://twitter.com/${username}/status/${tweet.id_str}`,
    }));

    return {
      success: true,
      data: {
        username,
        tweet_count: tweetArray.length,
        tweets: tweetArray,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract feed data: ${error.message}`);
  }
};

/**
 * Scrape Twitter user feed
 */
const scrapeFeed = async (username, limit = 20) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://twitter.com/${cleanUsername}`;

    console.log(`Scraping Twitter feed: ${url}`);

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

    const feedData = extractFeedData(response.body, cleanUsername);
    const responseTime = Date.now() - startTime;

    // Limit results
    if (feedData.data.tweets.length > limit) {
      feedData.data.tweets = feedData.data.tweets.slice(0, limit);
      feedData.data.tweet_count = limit;
    }

    return {
      ...feedData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Twitter feed scraping error:', error.message);

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
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '20', 10);

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
          example: 'username=elonmusk&limit=20',
        }),
      };
    }

    const result = await scrapeFeed(username, limit);

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

module.exports = { scrapeFeed, handler };
