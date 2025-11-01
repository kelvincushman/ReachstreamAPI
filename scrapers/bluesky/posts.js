/**
 * Bluesky Posts Scraper
 * Fetches posts from a Bluesky user's profile
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
 * Scrape Bluesky posts from user profile
 * @param {string} handle - Bluesky handle (e.g., user.bsky.social)
 * @param {number} limit - Number of posts to fetch (default: 20, max: 100)
 * @param {string} cursor - Pagination cursor (optional)
 * @returns {Promise<object>} Posts data
 */
const scrapePosts = async (handle, limit = 20, cursor = null) => {
  const startTime = Date.now();

  try {
    // Validate handle
    if (!handle || typeof handle !== 'string') {
      throw new Error('Invalid handle provided');
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    // Clean handle (remove @ if present)
    const cleanHandle = handle.replace('@', '');

    // Bluesky API endpoint for author feed
    let apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(cleanHandle)}&limit=${limit}`;
    if (cursor) {
      apiUrl += `&cursor=${encodeURIComponent(cursor)}`;
    }

    console.log(`Scraping Bluesky posts: ${apiUrl}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url: apiUrl,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: {
        request: 30000, // 30 second timeout
      },
      retry: {
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`Bluesky API returned status ${response.statusCode}`);
    }

    // Parse JSON response
    const data = JSON.parse(response.body);

    // Extract posts information
    const posts = (data.feed || []).map(item => {
      const post = item.post;
      const record = post.record;

      // Extract media/images
      const media = [];
      if (post.embed?.images) {
        post.embed.images.forEach(img => {
          media.push({
            type: 'image',
            url: img.fullsize,
            thumbnail: img.thumb,
            alt: img.alt || '',
          });
        });
      }

      // Extract external link
      let externalLink = null;
      if (post.embed?.external) {
        externalLink = {
          url: post.embed.external.uri,
          title: post.embed.external.title,
          description: post.embed.external.description,
          thumbnail: post.embed.external.thumb,
        };
      }

      // Extract facets (hashtags, mentions, links)
      const facets = {
        hashtags: [],
        mentions: [],
        links: [],
      };

      if (record.facets) {
        record.facets.forEach(facet => {
          facet.features.forEach(feature => {
            if (feature.$type === 'app.bsky.richtext.facet#tag') {
              facets.hashtags.push(feature.tag);
            } else if (feature.$type === 'app.bsky.richtext.facet#mention') {
              facets.mentions.push(feature.did);
            } else if (feature.$type === 'app.bsky.richtext.facet#link') {
              facets.links.push(feature.uri);
            }
          });
        });
      }

      return {
        uri: post.uri,
        cid: post.cid,
        author: {
          did: post.author.did,
          handle: post.author.handle,
          display_name: post.author.displayName,
          avatar: post.author.avatar,
        },
        text: record.text,
        created_at: record.createdAt,
        media,
        external_link: externalLink,
        facets,
        stats: {
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          quotes: post.quoteCount || 0,
        },
        url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
      };
    });

    // Calculate summary statistics
    const totalLikes = posts.reduce((sum, post) => sum + post.stats.likes, 0);
    const totalReposts = posts.reduce((sum, post) => sum + post.stats.reposts, 0);
    const totalReplies = posts.reduce((sum, post) => sum + post.stats.replies, 0);
    const avgLikes = posts.length > 0 ? Math.round(totalLikes / posts.length) : 0;
    const avgReposts = posts.length > 0 ? Math.round(totalReposts / posts.length) : 0;
    const avgReplies = posts.length > 0 ? Math.round(totalReplies / posts.length) : 0;

    // Content type breakdown
    const postsWithMedia = posts.filter(p => p.media.length > 0).length;
    const postsWithLinks = posts.filter(p => p.external_link !== null).length;
    const textOnlyPosts = posts.filter(p => p.media.length === 0 && p.external_link === null).length;

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        handle: cleanHandle,
        profile_url: `https://bsky.app/profile/${cleanHandle}`,
        total_posts: posts.length,
        posts,
        summary_stats: {
          total_likes: totalLikes,
          total_reposts: totalReposts,
          total_replies: totalReplies,
          avg_likes_per_post: avgLikes,
          avg_reposts_per_post: avgReposts,
          avg_replies_per_post: avgReplies,
        },
        content_breakdown: {
          with_media: postsWithMedia,
          with_links: postsWithLinks,
          text_only: textOnlyPosts,
        },
        cursor: data.cursor || null,
        has_more: !!data.cursor,
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

    console.error('Bluesky posts scraping error:', error.message);

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
    const handle = event.queryStringParameters?.handle || event.handle;
    const limit = event.queryStringParameters?.limit || event.limit || 20;
    const cursor = event.queryStringParameters?.cursor || event.cursor || null;

    if (!handle) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: handle',
        }),
      };
    }

    // Scrape posts
    const result = await scrapePosts(handle, parseInt(limit, 10), cursor);

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
  scrapePosts,
  handler,
};
