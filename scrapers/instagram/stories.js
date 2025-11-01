/**
 * Instagram Stories Scraper
 * Fetches Instagram Stories from a user's profile
 * Note: Stories are ephemeral (24-hour lifespan) and require active stories to be present
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
 * Extract Stories data from Instagram HTML/API response
 * @param {string} html - HTML content
 * @param {string} username - Instagram username
 * @returns {object} Extracted Stories data
 */
const extractStoriesData = (html, username) => {
  try {
    // Instagram embeds data in script tag
    const dataMatch = html.match(/<script type="application\/json" data-sjs>(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find Stories data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);

    // Navigate to user data and stories
    const userData = data?.require?.[0]?.[3]?.[0]?.__bbox?.require?.[0]?.[3]?.[1]?.__bbox?.result?.data?.user;

    if (!userData) {
      throw new Error('Stories data structure not found');
    }

    // Extract stories from edge_highlight_reels (saved stories) and edge_story (active stories)
    const activeStories = userData.edge_owner_to_timeline_media?.edges || [];
    const highlights = userData.edge_highlight_reels?.edges || [];

    // Process active stories (24-hour stories)
    const stories = activeStories
      .filter(edge => edge.node.__typename === 'GraphStoryMedia')
      .map(edge => {
        const node = edge.node;
        const expiresAt = node.expiring_at_timestamp;
        const now = Math.floor(Date.now() / 1000);
        const timeRemaining = expiresAt - now;

        return {
          id: node.id,
          type: node.is_video ? 'video' : 'photo',
          url: node.is_video ? node.video_url : node.display_url,
          thumbnail_url: node.display_url,
          dimensions: {
            width: node.dimensions?.width || 0,
            height: node.dimensions?.height || 0,
          },
          created_at: node.taken_at_timestamp,
          expires_at: expiresAt,
          time_remaining_seconds: Math.max(0, timeRemaining),
          time_remaining_hours: Math.max(0, Math.floor(timeRemaining / 3600)),
          is_expired: timeRemaining <= 0,
          tappable_objects: node.story_app_attribution || [],
          story_cta: node.story_cta_url ? {
            url: node.story_cta_url,
            text: node.story_cta_text || 'See More',
          } : null,
          location: node.location ? {
            id: node.location.id,
            name: node.location.name,
            slug: node.location.slug,
          } : null,
          music: node.clips_music_attribution_info ? {
            artist_name: node.clips_music_attribution_info.artist_name,
            song_name: node.clips_music_attribution_info.song_name,
            audio_id: node.clips_music_attribution_info.audio_id,
          } : null,
        };
      });

    // Process story highlights (permanent saved stories)
    const storyHighlights = highlights.map(edge => {
      const node = edge.node;
      return {
        id: node.id,
        title: node.title,
        cover_url: node.cover_media?.thumbnail_src,
        item_count: node.cover_media_cropped_thumbnail?.edges?.length || 0,
        created_at: node.created_at,
      };
    });

    // Calculate story statistics
    const totalStories = stories.length;
    const videoStories = stories.filter(s => s.type === 'video').length;
    const photoStories = stories.filter(s => s.type === 'photo').length;
    const storiesWithCTA = stories.filter(s => s.story_cta !== null).length;
    const storiesWithLocation = stories.filter(s => s.location !== null).length;
    const storiesWithMusic = stories.filter(s => s.music !== null).length;

    return {
      success: true,
      data: {
        username,
        profile_url: `https://www.instagram.com/${username}/`,
        active_stories: {
          total_count: totalStories,
          stories,
          statistics: {
            video_count: videoStories,
            photo_count: photoStories,
            with_cta: storiesWithCTA,
            with_location: storiesWithLocation,
            with_music: storiesWithMusic,
          },
        },
        story_highlights: {
          total_count: storyHighlights.length,
          highlights: storyHighlights,
        },
        engagement_insights: {
          posting_frequency: totalStories > 0 ? 'active' : 'inactive',
          content_variety: {
            video_percentage: totalStories > 0 ? Math.round((videoStories / totalStories) * 100) : 0,
            photo_percentage: totalStories > 0 ? Math.round((photoStories / totalStories) * 100) : 0,
          },
          interactive_features: {
            cta_usage: storiesWithCTA > 0,
            location_tagging: storiesWithLocation > 0,
            music_integration: storiesWithMusic > 0,
          },
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting Stories data:', error);
    throw new Error(`Failed to extract Stories data: ${error.message}`);
  }
};

/**
 * Scrape Instagram Stories from a user's profile
 * @param {string} username - Instagram username
 * @returns {Promise<object>} Stories data
 */
const scrapeStories = async (username) => {
  const startTime = Date.now();

  try {
    // Validate username
    if (!username || typeof username !== 'string') {
      throw new Error('Invalid username provided');
    }

    // Remove @ if present
    const cleanUsername = username.replace('@', '');

    // Construct Instagram profile URL
    const url = `https://www.instagram.com/${cleanUsername}/`;

    console.log(`Scraping Instagram Stories: ${url}`);

    // Make request through Oxylabs proxy
    const response = await gotScraping({
      url,
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
        request: 30000, // 30 second timeout
      },
      retry: {
        limit: 2,
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
    });

    // Check response status
    if (response.statusCode !== 200) {
      throw new Error(`Instagram returned status ${response.statusCode}`);
    }

    // Extract Stories data
    const storiesData = extractStoriesData(response.body, cleanUsername);

    const responseTime = Date.now() - startTime;

    return {
      ...storiesData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
        note: 'Stories are ephemeral content with 24-hour lifespan. Data reflects current active stories only.',
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('Instagram Stories scraping error:', error.message);

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
    // Extract username from event (API Gateway or direct invocation)
    const username = event.queryStringParameters?.username || event.username;

    if (!username) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: username',
        }),
      };
    }

    // Scrape Stories
    const result = await scrapeStories(username);

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
  scrapeStories,
  handler,
};
