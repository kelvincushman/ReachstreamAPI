/**
 * Facebook Posts Scraper
 * Fetches public posts from Facebook user/page using Oxylabs proxy
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
 * Extract posts data from Facebook HTML
 */
const extractPostsData = (html, username) => {
  try {
    // Extract posts from page feed
    const postMatches = html.matchAll(/<div[^>]*data-ft="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g);
    const posts = [];

    for (const match of postMatches) {
      try {
        const postData = JSON.parse(match[1]);
        const postHtml = match[2];

        // Extract post text
        const textMatch = postHtml.match(/<div[^>]*class="[^"]*userContent[^"]*"[^>]*>(.*?)<\/div>/s);
        const text = textMatch ? textMatch[1].replace(/<[^>]+>/g, '').trim() : '';

        // Extract timestamp
        const timeMatch = postHtml.match(/data-utime="(\d+)"/);
        const timestamp = timeMatch ? parseInt(timeMatch[1], 10) : null;

        // Extract engagement metrics
        const likesMatch = postHtml.match(/(\d+)\s+(?:likes?|reactions?)/i);
        const commentsMatch = postHtml.match(/(\d+)\s+comments?/i);
        const sharesMatch = postHtml.match(/(\d+)\s+shares?/i);

        // Extract post ID
        const postId = postData.top_level_post_id || postData.content_id;

        // Extract media URLs
        const mediaUrls = [];
        const imgMatches = postHtml.matchAll(/<img[^>]+src="([^"]+)"/g);
        for (const imgMatch of imgMatches) {
          if (!imgMatch[1].includes('emoji') && !imgMatch[1].includes('icon')) {
            mediaUrls.push(imgMatch[1]);
          }
        }

        if (postId && text) {
          posts.push({
            post_id: postId,
            text,
            created_at: timestamp ? new Date(timestamp * 1000).toISOString() : null,
            post_url: `https://www.facebook.com/${username}/posts/${postId}`,
            engagement: {
              likes: likesMatch ? parseInt(likesMatch[1].replace(/,/g, ''), 10) : 0,
              comments: commentsMatch ? parseInt(commentsMatch[1].replace(/,/g, ''), 10) : 0,
              shares: sharesMatch ? parseInt(sharesMatch[1].replace(/,/g, ''), 10) : 0,
            },
            media_urls: mediaUrls,
            post_type: mediaUrls.length > 0 ? (mediaUrls.length > 1 ? 'album' : 'photo') : 'text',
          });
        }
      } catch (parseError) {
        // Skip malformed post data
        continue;
      }
    }

    // Fallback: Extract from structured data
    if (posts.length === 0) {
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">({.+?})<\/script>/g);

      for (const jsonMatch of jsonLdMatches) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          if (data['@type'] === 'SocialMediaPosting' || data['@type'] === 'BlogPosting') {
            posts.push({
              post_id: data.identifier || data['@id'],
              text: data.articleBody || data.headline || '',
              created_at: data.datePublished || new Date().toISOString(),
              post_url: data.url || data['@id'],
              engagement: {
                likes: 0,
                comments: data.commentCount || 0,
                shares: 0,
              },
              media_urls: data.image ? (Array.isArray(data.image) ? data.image : [data.image]) : [],
              post_type: data.image ? 'photo' : 'text',
            });
          }
        } catch (jsonError) {
          continue;
        }
      }
    }

    return {
      success: true,
      data: {
        username,
        post_count: posts.length,
        posts,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract posts data: ${error.message}`);
  }
};

/**
 * Scrape Facebook user/page posts
 */
const scrapePosts = async (username, limit = 20) => {
  const startTime = Date.now();

  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    const cleanUsername = username.replace('@', '');
    const url = `https://www.facebook.com/${cleanUsername}`;

    console.log(`Scraping Facebook posts: ${url}`);

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

    const postsData = extractPostsData(response.body, cleanUsername);
    const responseTime = Date.now() - startTime;

    // Limit results
    if (postsData.data.posts.length > limit) {
      postsData.data.posts = postsData.data.posts.slice(0, limit);
      postsData.data.post_count = limit;
    }

    return {
      ...postsData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Facebook posts scraping error:', error.message);

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
          example: 'username=zuck&limit=20',
        }),
      };
    }

    const result = await scrapePosts(username, limit);

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
