/**
 * TikTok Transcript Scraper
 * Extracts video captions, subtitles, and auto-generated transcripts from TikTok videos
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
 * Extract transcript data from TikTok video
 * @param {string} html - HTML content
 * @param {string} videoId - Video ID
 * @returns {object} Extracted transcript data
 */
const extractTranscriptData = (html, videoId) => {
  try {
    // TikTok embeds data in script tag
    const dataMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/);

    if (!dataMatch) {
      throw new Error('Could not find video data in HTML');
    }

    const data = JSON.parse(dataMatch[1]);
    const videoData = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;

    if (!videoData) {
      throw new Error('Video data structure not found');
    }

    // Extract caption/description (primary text)
    const caption = videoData.desc || '';

    // Extract video info
    const videoInfo = videoData.video || {};
    const duration = videoInfo.duration || 0;

    // Extract subtitles/captions if available
    const subtitles = videoData.subtitleInfos || videoData.captions || [];

    // Process subtitle tracks
    const tracks = subtitles.map(subtitle => ({
      language: subtitle.LanguageCodeName || subtitle.language || 'unknown',
      language_code: subtitle.LanguageID || subtitle.code || 'un',
      url: subtitle.Url || subtitle.url,
      format: subtitle.Format || subtitle.format || 'vtt',
      source: subtitle.Source || subtitle.source || 'auto-generated',
    }));

    // Extract hashtags from caption
    const hashtags = (videoData.challenges || []).map(c => c.title);

    // Extract mentions from caption
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionPattern.exec(caption)) !== null) {
      mentions.push(match[1]);
    }

    // Word count and character count
    const words = caption.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const characterCount = caption.length;

    // Detect language (simple heuristic)
    const detectLanguage = (text) => {
      // Very basic language detection
      if (/[\u4e00-\u9fa5]/.test(text)) return 'Chinese';
      if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
      if (/[\u0400-\u04FF]/.test(text)) return 'Russian';
      if (/[\u0590-\u05FF]/.test(text)) return 'Hebrew';
      if (/[\u3040-\u309F]/.test(text)) return 'Japanese';
      if (/[\uAC00-\uD7AF]/.test(text)) return 'Korean';
      return 'English'; // Default
    };

    const detectedLanguage = detectLanguage(caption);

    return {
      success: true,
      data: {
        video_id: videoId,
        duration: duration,
        caption: {
          text: caption,
          word_count: wordCount,
          character_count: characterCount,
          detected_language: detectedLanguage,
        },
        subtitle_tracks: tracks,
        extracted_entities: {
          hashtags,
          mentions,
          urls: caption.match(/https?:\/\/[^\s]+/g) || [],
        },
        text_analysis: {
          has_emojis: /[\u{1F300}-\u{1F9FF}]/u.test(caption),
          has_hashtags: hashtags.length > 0,
          has_mentions: mentions.length > 0,
          has_urls: (caption.match(/https?:\/\/[^\s]+/g) || []).length > 0,
        },
        accessibility: {
          has_captions: tracks.length > 0,
          available_languages: tracks.map(t => t.language),
          auto_generated: tracks.some(t => t.source === 'auto-generated'),
        },
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error extracting transcript data:', error);
    throw new Error(`Failed to extract transcript data: ${error.message}`);
  }
};

/**
 * Download and parse subtitle file (VTT/SRT)
 * @param {string} subtitleUrl - URL to subtitle file
 * @returns {Promise<Array>} Parsed subtitle segments
 */
const parseSubtitleFile = async (subtitleUrl) => {
  try {
    const response = await gotScraping({
      url: subtitleUrl,
      proxyUrl: getProxyUrl(),
      timeout: { request: 10000 },
    });

    const content = response.body;
    const segments = [];

    // Parse VTT format
    if (subtitleUrl.includes('.vtt')) {
      const lines = content.split('\n');
      let currentSegment = {};

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Timestamp line
        if (line.includes('-->')) {
          const [start, end] = line.split('-->').map(t => t.trim());
          currentSegment = { start, end, text: '' };
        }
        // Text line
        else if (line && currentSegment.start) {
          currentSegment.text += (currentSegment.text ? ' ' : '') + line;
        }
        // Empty line - end of segment
        else if (!line && currentSegment.text) {
          segments.push(currentSegment);
          currentSegment = {};
        }
      }
    }

    return segments;
  } catch (error) {
    console.warn('Could not parse subtitle file:', error.message);
    return [];
  }
};

/**
 * Scrape TikTok video transcript
 * @param {string} videoId - TikTok video ID
 * @param {boolean} includeSubtitles - Whether to download and parse subtitle files
 * @returns {Promise<object>} Transcript data
 */
const scrapeTranscript = async (videoId, includeSubtitles = false) => {
  const startTime = Date.now();

  try {
    // Validate video ID
    if (!videoId || typeof videoId !== 'string') {
      throw new Error('Invalid video ID provided');
    }

    // Construct TikTok video URL
    const url = `https://www.tiktok.com/@i/video/${videoId}`;

    console.log(`Scraping TikTok transcript: ${videoId}`);

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
      throw new Error(`TikTok returned status ${response.statusCode}`);
    }

    // Extract transcript data
    const transcriptData = extractTranscriptData(response.body, videoId);

    // Optionally download and parse subtitle files
    if (includeSubtitles && transcriptData.data.subtitle_tracks.length > 0) {
      const subtitleSegments = [];
      for (const track of transcriptData.data.subtitle_tracks.slice(0, 1)) { // Only first track
        if (track.url) {
          const segments = await parseSubtitleFile(track.url);
          if (segments.length > 0) {
            subtitleSegments.push({
              language: track.language,
              segments,
            });
          }
        }
      }
      transcriptData.data.subtitle_content = subtitleSegments;
    }

    const responseTime = Date.now() - startTime;

    return {
      ...transcriptData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        subtitles_downloaded: includeSubtitles,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error('TikTok transcript scraping error:', error.message);

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
    // Extract video_id from event (API Gateway or direct invocation)
    const videoId = event.queryStringParameters?.video_id || event.video_id;
    const includeSubtitles = event.queryStringParameters?.include_subtitles === 'true';

    if (!videoId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: video_id',
        }),
      };
    }

    // Scrape transcript
    const result = await scrapeTranscript(videoId, includeSubtitles);

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
