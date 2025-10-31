/**
 * Reddit Posts Scraper
 * Fetches posts from a subreddit using Oxylabs proxy
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
 * Scrape Reddit subreddit posts (using JSON API)
 */
const scrapePosts = async (subreddit, limit = 25, sort = 'hot') => {
  const startTime = Date.now();

  try {
    if (!subreddit || typeof subreddit !== 'string') {
      throw new Error('Invalid subreddit provided');
    }

    const cleanSubreddit = subreddit.replace('r/', '').replace(/^\//, '').replace(/\/$/, '');
    const url = `https://www.reddit.com/r/${cleanSubreddit}/${sort}.json?limit=${limit}`;

    console.log(`Scraping Reddit posts: ${url}`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`Reddit returned status ${response.statusCode}`);
    }

    const data = JSON.parse(response.body);

    if (!data.data || !data.data.children) {
      throw new Error('Invalid Reddit response format');
    }

    const posts = data.data.children
      .filter(child => child.kind === 't3') // t3 = link/post
      .map(child => {
        const post = child.data;
        return {
          post_id: post.id,
          title: post.title,
          author: post.author,
          subreddit: post.subreddit,
          subreddit_subscribers: post.subreddit_subscribers,
          created_utc: post.created_utc,
          score: post.score,
          upvote_ratio: post.upvote_ratio,
          num_comments: post.num_comments,
          permalink: `https://www.reddit.com${post.permalink}`,
          url: post.url,
          is_self: post.is_self,
          selftext: post.selftext,
          thumbnail: post.thumbnail !== 'self' ? post.thumbnail : null,
          is_video: post.is_video,
          awards: post.all_awardings?.length || 0,
          distinguished: post.distinguished,
          stickied: post.stickied,
          over_18: post.over_18,
          spoiler: post.spoiler,
          locked: post.locked,
        };
      });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        subreddit: cleanSubreddit,
        sort: sort,
        post_count: posts.length,
        posts: posts,
        scraped_at: new Date().toISOString(),
      },
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Reddit scraping error:', error.message);

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
    const subreddit = event.queryStringParameters?.subreddit || event.subreddit;
    const limit = parseInt(event.queryStringParameters?.limit || event.limit || '25', 10);
    const sort = event.queryStringParameters?.sort || event.sort || 'hot';

    if (!subreddit) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: subreddit',
          example: 'subreddit=programming&sort=hot&limit=25',
        }),
      };
    }

    if (!['hot', 'new', 'top', 'rising'].includes(sort)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid sort parameter. Must be: hot, new, top, or rising',
        }),
      };
    }

    const result = await scrapePosts(subreddit, limit, sort);

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

module.exports = { scrapePosts, handler };
