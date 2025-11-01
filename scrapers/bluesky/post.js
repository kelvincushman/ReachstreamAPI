/**
 * Bluesky Single Post Scraper
 * Fetches detailed information about a single Bluesky post
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
 * Scrape Bluesky post by URI or URL
 * @param {string} postUri - Bluesky post URI (e.g., at://did:plc:xxx/app.bsky.feed.post/xxx) or URL
 * @returns {Promise<object>} Post data
 */
const scrapePost = async (postUri) => {
  const startTime = Date.now();

  try {
    // Validate postUri
    if (!postUri || typeof postUri !== 'string') {
      throw new Error('Invalid post URI or URL provided');
    }

    // If URL is provided, convert to AT URI
    let atUri = postUri;
    if (postUri.includes('bsky.app')) {
      // Extract handle and rkey from URL
      // Format: https://bsky.app/profile/handle.bsky.social/post/3k7qw...
      const urlMatch = postUri.match(/profile\/([^\/]+)\/post\/([^\/\?]+)/);
      if (urlMatch) {
        const handle = urlMatch[1];
        const rkey = urlMatch[2];

        // First, resolve handle to DID
        const profileApiUrl = `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`;
        const profileResponse = await gotScraping({
          url: profileApiUrl,
          proxyUrl: getProxyUrl(),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          timeout: { request: 30000 },
        });

        const profileData = JSON.parse(profileResponse.body);
        const did = profileData.did;

        // Construct AT URI
        atUri = `at://${did}/app.bsky.feed.post/${rkey}`;
      }
    }

    // Bluesky API endpoint for post thread
    const apiUrl = `https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(atUri)}`;

    console.log(`Scraping Bluesky post: ${apiUrl}`);

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
    const post = data.thread?.post;

    if (!post) {
      throw new Error('Post not found');
    }

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
          aspect_ratio: img.aspectRatio,
        });
      });
    }

    // Extract video if present
    if (post.embed?.video) {
      media.push({
        type: 'video',
        url: post.embed.video.playlist,
        thumbnail: post.embed.video.thumbnail,
        aspect_ratio: post.embed.video.aspectRatio,
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

    // Extract quoted post if present
    let quotedPost = null;
    if (post.embed?.record) {
      const quoted = post.embed.record;
      quotedPost = {
        uri: quoted.uri,
        cid: quoted.cid,
        author: {
          did: quoted.author?.did,
          handle: quoted.author?.handle,
          display_name: quoted.author?.displayName,
        },
        text: quoted.value?.text || '',
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

    // Extract replies (top-level only)
    const replies = [];
    if (data.thread?.replies) {
      data.thread.replies.slice(0, 10).forEach(reply => {
        const replyPost = reply.post;
        if (replyPost) {
          replies.push({
            uri: replyPost.uri,
            author: {
              handle: replyPost.author.handle,
              display_name: replyPost.author.displayName,
              avatar: replyPost.author.avatar,
            },
            text: replyPost.record.text,
            created_at: replyPost.record.createdAt,
            stats: {
              likes: replyPost.likeCount || 0,
              reposts: replyPost.repostCount || 0,
              replies: replyPost.replyCount || 0,
            },
          });
        }
      });
    }

    // Extract parent post if this is a reply
    let parentPost = null;
    if (data.thread?.parent) {
      const parent = data.thread.parent.post;
      if (parent) {
        parentPost = {
          uri: parent.uri,
          author: {
            handle: parent.author.handle,
            display_name: parent.author.displayName,
          },
          text: parent.record.text,
          created_at: parent.record.createdAt,
        };
      }
    }

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        uri: post.uri,
        cid: post.cid,
        author: {
          did: post.author.did,
          handle: post.author.handle,
          display_name: post.author.displayName,
          avatar: post.author.avatar,
          description: post.author.description,
        },
        text: record.text,
        created_at: record.createdAt,
        media,
        external_link: externalLink,
        quoted_post: quotedPost,
        facets,
        stats: {
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          quotes: post.quoteCount || 0,
        },
        parent_post: parentPost,
        top_replies: replies,
        url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
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

    console.error('Bluesky post scraping error:', error.message);

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
    // Extract post_uri from event (API Gateway or direct invocation)
    const postUri = event.queryStringParameters?.post_uri || event.queryStringParameters?.url || event.post_uri || event.url;

    if (!postUri) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: post_uri or url',
        }),
      };
    }

    // Scrape post
    const result = await scrapePost(postUri);

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
  scrapePost,
  handler,
};
