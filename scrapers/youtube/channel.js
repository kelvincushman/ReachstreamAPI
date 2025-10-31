/**
 * YouTube Channel Scraper
 * Fetches public channel data from YouTube using Oxylabs proxy
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
 * Extract channel data from YouTube HTML
 */
const extractChannelData = (html, channelId) => {
  try {
    // YouTube embeds data in ytInitialData
    const dataMatch = html.match(/var ytInitialData = ({.+?});/);

    if (!dataMatch) {
      throw new Error('Could not find channel data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const header = data?.header?.c4TabbedHeaderRenderer || data?.header?.pageHeaderRenderer;
    const metadata = data?.metadata?.channelMetadataRenderer;

    if (!header || !metadata) {
      throw new Error('Channel data structure not found');
    }

    // Extract subscriber count
    const subscriberText = header.subscriberCountText?.simpleText ||
                          header.subscriberCountText?.runs?.[0]?.text ||
                          '0 subscribers';

    const subscriberMatch = subscriberText.match(/([\d.]+)([KMB]?)/);
    let subscriberCount = 0;
    if (subscriberMatch) {
      const num = parseFloat(subscriberMatch[1]);
      const multiplier = subscriberMatch[2];
      subscriberCount = multiplier === 'K' ? num * 1000 :
                       multiplier === 'M' ? num * 1000000 :
                       multiplier === 'B' ? num * 1000000000 : num;
    }

    return {
      success: true,
      data: {
        channel_id: metadata.externalId,
        channel_name: metadata.title,
        handle: metadata.vanityChannelUrl?.replace('http://www.youtube.com/', ''),
        description: metadata.description,
        avatar_url: header.avatar?.thumbnails?.[header.avatar.thumbnails.length - 1]?.url,
        banner_url: header.banner?.thumbnails?.[header.banner.thumbnails.length - 1]?.url,
        subscriber_count: Math.round(subscriberCount),
        subscriber_text: subscriberText,
        is_verified: header.badges?.some(b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_VERIFIED') || false,
        video_count: header.videosCountText?.runs?.[0]?.text || 'Unknown',
        country: metadata.country || null,
        keywords: metadata.keywords?.split(' ') || [],
        channel_url: metadata.channelUrl,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract channel data: ${error.message}`);
  }
};

/**
 * Scrape YouTube channel
 */
const scrapeChannel = async (channelId) => {
  const startTime = Date.now();

  try {
    if (!channelId || typeof channelId !== 'string') {
      throw new Error('Invalid channel ID provided');
    }

    // Support both channel IDs and handles
    const url = channelId.startsWith('@')
      ? `https://www.youtube.com/${channelId}`
      : `https://www.youtube.com/channel/${channelId}`;

    console.log(`Scraping YouTube channel: ${url}`);

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
      throw new Error(`YouTube returned status ${response.statusCode}`);
    }

    const channelData = extractChannelData(response.body, channelId);
    const responseTime = Date.now() - startTime;

    return {
      ...channelData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('YouTube scraping error:', error.message);

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
    const channelId = event.queryStringParameters?.channel_id || event.channel_id;

    if (!channelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: channel_id',
          example: 'channel_id=UCX6OQ3DkcsbYNE6H8uQQuVA or channel_id=@MrBeast',
        }),
      };
    }

    const result = await scrapeChannel(channelId);

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

module.exports = { scrapeChannel, handler };
