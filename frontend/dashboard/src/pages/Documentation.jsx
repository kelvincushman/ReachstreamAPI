/**
 * Documentation Page
 * Comprehensive API documentation with all 27 endpoints
 */

import { useState, useEffect } from 'react';
import {
  Book,
  Code,
  Zap,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

export default function Documentation() {
  const [bookmarked, setBookmarked] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    tiktok: true,
    'tiktok-shop': false,
    instagram: false,
    youtube: false,
    twitter: false,
    facebook: false,
    linkedin: false,
    reddit: false
  });
  const [copiedEndpoint, setCopiedEndpoint] = useState(null);

  // Load bookmark status from localStorage
  useEffect(() => {
    const isBookmarked = localStorage.getItem('docs-bookmarked') === 'true';
    setBookmarked(isBookmarked);
  }, []);

  const toggleBookmark = () => {
    const newState = !bookmarked;
    setBookmarked(newState);
    localStorage.setItem('docs-bookmarked', newState.toString());
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = {
    tiktok: [
      {
        id: 'tiktok-profile',
        name: 'TikTok Profile',
        endpoint: '/api/scrape/tiktok/profile',
        params: '?username=:username',
        description: 'Get complete TikTok profile data including follower count, bio, and statistics',
        credits: 1,
        example: 'charlidamelio'
      },
      {
        id: 'tiktok-video',
        name: 'TikTok Video',
        endpoint: '/api/scrape/tiktok/video',
        params: '?video_id=:video_id',
        description: 'Get detailed video information including views, likes, comments, and shares',
        credits: 1,
        example: '7123456789012345678'
      },
      {
        id: 'tiktok-comments',
        name: 'TikTok Comments',
        endpoint: '/api/scrape/tiktok/comments',
        params: '?video_id=:video_id',
        description: 'Retrieve comments from a TikTok video with user information',
        credits: 2,
        example: '7123456789012345678'
      },
      {
        id: 'tiktok-feed',
        name: 'TikTok User Feed',
        endpoint: '/api/scrape/tiktok/feed',
        params: '?username=:username',
        description: 'Get recent videos from a TikTok user\'s feed',
        credits: 2,
        example: 'charlidamelio'
      },
      {
        id: 'tiktok-hashtag',
        name: 'TikTok Hashtag',
        endpoint: '/api/scrape/tiktok/hashtag',
        params: '?tag=:tag',
        description: 'Get videos for a specific hashtag with metadata',
        credits: 3,
        example: 'viral'
      },
      {
        id: 'tiktok-trending',
        name: 'TikTok Trending',
        endpoint: '/api/scrape/tiktok/trending',
        params: '',
        description: 'Get currently trending TikTok videos',
        credits: 3,
        example: null
      },
      {
        id: 'tiktok-search',
        name: 'TikTok Search',
        endpoint: '/api/scrape/tiktok/search',
        params: '?query=:query&type=videos',
        description: 'Search TikTok for users, videos, hashtags, and sounds',
        credits: 2,
        example: 'dance'
      },
      {
        id: 'tiktok-sound',
        name: 'TikTok Sound',
        endpoint: '/api/scrape/tiktok/sound',
        params: '?sound_id=:sound_id',
        description: 'Get detailed sound/music information including usage stats and top videos',
        credits: 1,
        example: '1234567890'
      },
      {
        id: 'tiktok-analytics',
        name: 'TikTok Analytics',
        endpoint: '/api/scrape/tiktok/analytics',
        params: '?username=:username',
        description: 'Get advanced analytics with engagement rate, growth metrics, and performance indicators',
        credits: 2,
        example: 'charlidamelio'
      }
    ],
    'tiktok-shop': [
      {
        id: 'tiktok-shop-search',
        name: 'TikTok Shop Search',
        endpoint: '/api/scrape/tiktok-shop/search',
        params: '?query=:query&limit=20',
        description: 'Search for products on TikTok Shop with pricing, ratings, and seller information',
        credits: 1,
        example: 'sneakers'
      },
      {
        id: 'tiktok-shop-product',
        name: 'TikTok Shop Product',
        endpoint: '/api/scrape/tiktok-shop/product',
        params: '?product_id=:product_id',
        description: 'Get detailed product information including variants, shipping, and seller details',
        credits: 1,
        example: '1234567890'
      },
      {
        id: 'tiktok-shop-reviews',
        name: 'TikTok Shop Reviews',
        endpoint: '/api/scrape/tiktok-shop/reviews',
        params: '?product_id=:product_id&limit=50',
        description: 'Retrieve product reviews with ratings, images, and verified purchase status',
        credits: 2,
        example: '1234567890'
      }
    ],
    instagram: [
      {
        id: 'instagram-profile',
        name: 'Instagram Profile',
        endpoint: '/api/scrape/instagram/profile',
        params: '?username=:username',
        description: 'Get Instagram profile data including followers, bio, and post count',
        credits: 1,
        example: 'instagram'
      },
      {
        id: 'instagram-posts',
        name: 'Instagram Posts',
        endpoint: '/api/scrape/instagram/posts',
        params: '?username=:username',
        description: 'Get recent posts from an Instagram account',
        credits: 2,
        example: 'instagram'
      },
      {
        id: 'instagram-post',
        name: 'Instagram Single Post',
        endpoint: '/api/scrape/instagram/post',
        params: '?url=:url',
        description: 'Get detailed information about a single Instagram post',
        credits: 1,
        example: 'https://www.instagram.com/p/ABC123/'
      },
      {
        id: 'instagram-comments',
        name: 'Instagram Comments',
        endpoint: '/api/scrape/instagram/comments',
        params: '?post_id=:post_id',
        description: 'Retrieve comments from an Instagram post',
        credits: 2,
        example: 'ABC123DEF456'
      },
      {
        id: 'instagram-search',
        name: 'Instagram Search',
        endpoint: '/api/scrape/instagram/search',
        params: '?query=:query',
        description: 'Search for Instagram profiles by keyword',
        credits: 2,
        example: 'travel'
      }
    ],
    youtube: [
      {
        id: 'youtube-channel',
        name: 'YouTube Channel',
        endpoint: '/api/scrape/youtube/channel',
        params: '?channel_id=:channel_id',
        description: 'Get YouTube channel information including subscriber count and description',
        credits: 1,
        example: 'UCuAXFkgsw1L7xaCfnd5JJOw'
      },
      {
        id: 'youtube-videos',
        name: 'YouTube Channel Videos',
        endpoint: '/api/scrape/youtube/videos',
        params: '?channel_id=:channel_id',
        description: 'Get recent videos from a YouTube channel',
        credits: 2,
        example: 'UCuAXFkgsw1L7xaCfnd5JJOw'
      },
      {
        id: 'youtube-video',
        name: 'YouTube Video',
        endpoint: '/api/scrape/youtube/video',
        params: '?video_id=:video_id',
        description: 'Get detailed video information including views, likes, and description',
        credits: 1,
        example: 'dQw4w9WgXcQ'
      },
      {
        id: 'youtube-comments',
        name: 'YouTube Comments',
        endpoint: '/api/scrape/youtube/comments',
        params: '?video_id=:video_id',
        description: 'Retrieve comments from a YouTube video',
        credits: 2,
        example: 'dQw4w9WgXcQ'
      },
      {
        id: 'youtube-search',
        name: 'YouTube Search',
        endpoint: '/api/scrape/youtube/search',
        params: '?query=:query',
        description: 'Search for YouTube videos by keyword',
        credits: 3,
        example: 'react tutorial'
      }
    ],
    twitter: [
      {
        id: 'twitter-profile',
        name: 'Twitter Profile',
        endpoint: '/api/scrape/twitter/profile',
        params: '?username=:username',
        description: 'Get Twitter profile data including followers and bio',
        credits: 1,
        example: 'elonmusk'
      },
      {
        id: 'twitter-feed',
        name: 'Twitter User Feed',
        endpoint: '/api/scrape/twitter/feed',
        params: '?username=:username',
        description: 'Get recent tweets from a Twitter account',
        credits: 2,
        example: 'elonmusk'
      },
      {
        id: 'twitter-search',
        name: 'Twitter Search',
        endpoint: '/api/scrape/twitter/search',
        params: '?query=:query',
        description: 'Search for tweets by keyword or hashtag',
        credits: 3,
        example: '#AI'
      }
    ],
    facebook: [
      {
        id: 'facebook-profile',
        name: 'Facebook Profile',
        endpoint: '/api/scrape/facebook/profile',
        params: '?url=:url',
        description: 'Get Facebook profile or page information',
        credits: 1,
        example: 'https://www.facebook.com/example'
      },
      {
        id: 'facebook-posts',
        name: 'Facebook Posts',
        endpoint: '/api/scrape/facebook/posts',
        params: '?url=:url',
        description: 'Get recent posts from a Facebook page',
        credits: 2,
        example: 'https://www.facebook.com/example'
      }
    ],
    linkedin: [
      {
        id: 'linkedin-profile',
        name: 'LinkedIn Profile',
        endpoint: '/api/scrape/linkedin/profile',
        params: '?url=:url',
        description: 'Get LinkedIn profile information',
        credits: 2,
        example: 'https://www.linkedin.com/in/example'
      },
      {
        id: 'linkedin-company',
        name: 'LinkedIn Company',
        endpoint: '/api/scrape/linkedin/company',
        params: '?url=:url',
        description: 'Get LinkedIn company page information',
        credits: 2,
        example: 'https://www.linkedin.com/company/example'
      }
    ],
    reddit: [
      {
        id: 'reddit-posts',
        name: 'Reddit Posts',
        endpoint: '/api/scrape/reddit/posts',
        params: '?subreddit=:name',
        description: 'Get recent posts from a subreddit',
        credits: 2,
        example: 'programming'
      },
      {
        id: 'reddit-comments',
        name: 'Reddit Comments',
        endpoint: '/api/scrape/reddit/comments',
        params: '?post_id=:id',
        description: 'Get comments from a Reddit post',
        credits: 2,
        example: 'abc123'
      }
    ]
  };

  const platformNames = {
    tiktok: 'TikTok',
    'tiktok-shop': 'TikTok Shop',
    instagram: 'Instagram',
    youtube: 'YouTube',
    twitter: 'Twitter / X',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    reddit: 'Reddit'
  };

  const platformColors = {
    tiktok: 'border-pink-500',
    'tiktok-shop': 'border-pink-600',
    instagram: 'border-purple-500',
    youtube: 'border-red-500',
    twitter: 'border-blue-500',
    facebook: 'border-blue-600',
    linkedin: 'border-blue-700',
    reddit: 'border-orange-500'
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Bookmark */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
        <button
          onClick={toggleBookmark}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            bookmarked
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {bookmarked ? (
            <>
              <BookmarkCheck className="h-5 w-5" />
              <span>Bookmarked</span>
            </>
          ) : (
            <>
              <Bookmark className="h-5 w-5" />
              <span>Bookmark this page</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Quick Start</h2>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Create an API key in the <a href="/api-keys" className="text-indigo-600 hover:underline">API Keys</a> section</li>
          <li>Include the API key in your request headers as <code className="px-2 py-1 bg-gray-100 rounded">x-api-key</code></li>
          <li>Make requests to any of the 33 endpoints below</li>
          <li>Each request costs 1-3 credits depending on the endpoint</li>
        </ol>
      </div>

      {/* Example Request */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Code className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Example Request</h2>
        </div>
        <p className="text-gray-700 mb-4">TikTok Profile Scraper (1 credit):</p>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X GET "https://api.reachstream.com/api/scrape/tiktok/profile?username=charlidamelio" \\
  -H "x-api-key: rsk_your_api_key_here"

# Response:
{
  "success": true,
  "data": {
    "username": "charlidamelio",
    "nickname": "charli d'amelio",
    "follower_count": 155000000,
    "following_count": 1500,
    "video_count": 2300,
    "verified": true,
    "avatar_url": "https://...",
    "signature": "...",
    "profile_url": "https://www.tiktok.com/@charlidamelio"
  },
  "metadata": {
    "response_time_ms": 2341,
    "proxy_used": true,
    "timestamp": "2025-10-31T17:00:00Z"
  }
}`}
        </pre>
      </div>

      {/* Available Endpoints - Organized by Platform */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Book className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Available Endpoints (33 Total)</h2>
        </div>

        <div className="space-y-4">
          {Object.entries(endpoints).map(([platform, platformEndpoints]) => (
            <div key={platform} className="border rounded-lg overflow-hidden">
              {/* Platform Header */}
              <button
                onClick={() => toggleSection(platform)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSections[platform] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {platformNames[platform]}
                  </h3>
                  <span className="text-sm text-gray-500">
                    ({platformEndpoints.length} endpoint{platformEndpoints.length > 1 ? 's' : ''})
                  </span>
                </div>
              </button>

              {/* Platform Endpoints */}
              {expandedSections[platform] && (
                <div className="p-4 space-y-4 bg-white">
                  {platformEndpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className={`border-l-4 ${platformColors[platform]} pl-4 py-2`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{endpoint.name}</h4>
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              {endpoint.credits} credit{endpoint.credits > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm bg-gray-100 px-3 py-1 rounded flex-1">
                              GET {endpoint.endpoint}{endpoint.params}
                            </code>
                            <button
                              onClick={() => copyToClipboard(`${endpoint.endpoint}${endpoint.params}`, endpoint.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              title="Copy endpoint"
                            >
                              {copiedEndpoint === endpoint.id ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {endpoint.description}
                          </p>

                          {endpoint.example && (
                            <p className="text-xs text-gray-500">
                              Example: <code className="bg-gray-50 px-2 py-1 rounded">{endpoint.example}</code>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Resources */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <ExternalLink className="h-5 w-5" />
          Need Help?
        </h3>
        <p className="text-sm text-blue-800 mb-3">
          For detailed API reference, code examples, and integration guides:
        </p>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• View the complete <a href="/api/docs" target="_blank" className="underline hover:text-blue-600">API Reference</a></li>
          <li>• Check your <a href="/usage" className="underline hover:text-blue-600">Usage Statistics</a></li>
          <li>• Manage your <a href="/api-keys" className="underline hover:text-blue-600">API Keys</a></li>
          <li>• Contact support: <a href="mailto:support@reachstreamapi.com" className="underline hover:text-blue-600">support@reachstreamapi.com</a></li>
        </ul>
      </div>
    </div>
  );
}
