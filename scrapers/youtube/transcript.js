/**
 * YouTube Transcript Scraper
 * Fetches video captions/transcripts with timestamps
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
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {string} Video ID
 */
const extractVideoId = (url) => {
  // Support multiple formats:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // VIDEO_ID (direct)

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    // Assume it's a direct video ID
    return url;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
    /youtube\.com\/v\/([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new Error('Invalid YouTube URL or video ID');
};

/**
 * Parse XML transcript data
 * @param {string} xml - XML transcript data
 * @returns {Array} Parsed transcript segments
 */
const parseTranscriptXML = (xml) => {
  const segments = [];

  // Match all <text> elements with their attributes
  const textMatches = xml.matchAll(/<text start="([^"]+)" dur="([^"]+)"[^>]*>([^<]*)<\/text>/g);

  for (const match of textMatches) {
    const start = parseFloat(match[1]);
    const duration = parseFloat(match[2]);
    let text = match[3];

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");

    segments.push({
      text,
      start,
      duration,
      end: start + duration,
    });
  }

  return segments;
};

/**
 * Extract caption tracks from YouTube player response
 * @param {string} html - YouTube video page HTML
 * @returns {Array} Available caption tracks
 */
const extractCaptionTracks = (html) => {
  try {
    // Find ytInitialPlayerResponse in the HTML
    const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);

    if (!playerResponseMatch) {
      throw new Error('Could not find player response in HTML');
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);

    // Extract caption tracks
    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captions || captions.length === 0) {
      throw new Error('No captions available for this video');
    }

    return captions;
  } catch (error) {
    throw new Error(`Failed to extract caption tracks: ${error.message}`);
  }
};

/**
 * Scrape YouTube video transcript
 * @param {string} url - YouTube video URL or video ID
 * @param {string} language - Language code (default: 'en')
 * @returns {Promise<object>} Transcript data
 */
const scrapeTranscript = async (url, language = 'en') => {
  const startTime = Date.now();

  try {
    // Validate input
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL or video ID provided');
    }

    // Extract video ID
    const videoId = extractVideoId(url);

    // Construct YouTube video URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log(`Scraping YouTube transcript: ${videoUrl}`);

    // Fetch video page to get caption tracks
    const response = await gotScraping({
      url: videoUrl,
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
      throw new Error(`YouTube returned status ${response.statusCode}`);
    }

    // Extract caption tracks
    const captionTracks = extractCaptionTracks(response.body);

    // Find caption track for requested language
    let captionTrack = captionTracks.find(track =>
      track.languageCode === language ||
      track.languageCode.startsWith(language)
    );

    // If not found, try English as fallback
    if (!captionTrack && language !== 'en') {
      captionTrack = captionTracks.find(track =>
        track.languageCode === 'en' ||
        track.languageCode.startsWith('en')
      );
    }

    // If still not found, use the first available track
    if (!captionTrack) {
      captionTrack = captionTracks[0];
    }

    // Extract metadata
    const isAutoGenerated = captionTrack.kind === 'asr';
    const actualLanguage = captionTrack.languageCode;
    const languageName = captionTrack.name?.simpleText || captionTrack.languageCode;

    // Fetch transcript XML
    const transcriptUrl = captionTrack.baseUrl;
    const transcriptResponse = await gotScraping({
      url: transcriptUrl,
      proxyUrl: getProxyUrl(),
      timeout: {
        request: 15000,
      },
      retry: {
        limit: 2,
      },
    });

    // Parse transcript XML
    const segments = parseTranscriptXML(transcriptResponse.body);

    // Generate full text
    const fullText = segments.map(s => s.text).join(' ');

    // Calculate statistics
    const totalDuration = segments.length > 0 ? segments[segments.length - 1].end : 0;
    const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
    const avgWordsPerMinute = totalDuration > 0 ? Math.round((wordCount / totalDuration) * 60) : 0;

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      data: {
        video_id: videoId,
        video_url: videoUrl,
        language: actualLanguage,
        language_name: languageName,
        is_auto_generated: isAutoGenerated,
        segments,
        full_text: fullText,
        statistics: {
          total_segments: segments.length,
          total_duration_seconds: Math.round(totalDuration),
          word_count: wordCount,
          avg_words_per_minute: avgWordsPerMinute,
        },
        available_languages: captionTracks.map(track => ({
          code: track.languageCode,
          name: track.name?.simpleText || track.languageCode,
          is_auto_generated: track.kind === 'asr',
        })),
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

    console.error('YouTube transcript scraping error:', error.message);

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
    const url = event.queryStringParameters?.url || event.url;
    const language = event.queryStringParameters?.language || event.language || 'en';

    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: url',
        }),
      };
    }

    // Scrape transcript
    const result = await scrapeTranscript(url, language);

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
  scrapeTranscript,
  handler,
};
