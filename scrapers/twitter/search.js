/**
 * Twitter/X Search Scraper
 * Searches tweets by keyword/hashtag using Oxylabs proxy
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
 * Extract search results from Twitter HTML
 */
const extractSearchData = (html, query) => {
  try {
    const dataMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__=(\{.+?\})<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find search data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const tweets = data?.timeline?.entries || [];

    const results = [];

    for (const entry of tweets) {
      try {
        if (entry.entryId?.startsWith('tweet-')) {
          const tweet = entry.content?.item?.content?.tweet;

          if (!tweet) continue;

          const user = data.entities?.users?.[tweet.user_id_str];

          results.push({
            tweet_id: tweet.id_str,
            text: tweet.full_text || tweet.text,
            created_at: tweet.created_at,
            user: {
              username: user?.screen_name,
              display_name: user?.name,
              verified: user?.verified,
              profile_image: user?.profile_image_url_https,
              follower_count: user?.followers_count,
            },
            engagement: {
              retweets: tweet.retweet_count || 0,
              likes: tweet.favorite_count || 0,
              replies: tweet.reply_count || 0,
              quotes: tweet.quote_count || 0,
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
            tweet_url: `https://twitter.com/${user?.screen_name}/status/${tweet.id_str}`,
            relevance_score: entry.sortIndex,
          });
        }
      } catch (parseError) {
        // Skip malformed tweet data
        continue;
      }
    }

    return {
      success: true,
      data: {
        query,
        result_count: results.length,
        tweets: results,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract search data: ${error.message}`);
  }
};

/**
 * Search Twitter/X for tweets
 */
const searchTweets = async (query, limit = 20, filter = 'top') => {
  const startTime = Date.now();

  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid search query provided');
    }

    // Encode query for URL
    const encodedQuery = encodeURIComponent(query);

    // Build search URL with filter (top, latest, people, photos, videos)
    let url = `https://twitter.com/search?q=${encodedQuery}`;

    if (filter && filter !== 'top') {
      url += `&f=${filter}`;
    }

    console.log(`Searching Twitter: ${url}`);

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

    const searchData = extractSearchData(response.body, query);
    const responseTime = Date.now() - startTime;

    // Limit results
    if (searchData.data.tweets.length > limit) {
      searchData.data.tweets = searchData.data.tweets.slice(0, limit);
      searchData.data.result_count = limit;
    }

    return {
      ...searchData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        filter_used: filter,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Twitter search error:', error.message);

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
    const filter = event.queryStringParameters?.filter || event.filter || 'top';

    if (!query) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: query',
          example: 'query=artificial intelligence&limit=20&filter=latest',
          filters: ['top', 'latest', 'people', 'photos', 'videos'],
        }),
      };
    }

    const result = await searchTweets(query, limit, filter);

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

module.exports = { searchTweets, handler };
