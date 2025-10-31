/**
 * Documentation Page
 * API documentation and guides
 */

import { Book, Code, Zap } from 'lucide-react';

export default function Documentation() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">API Documentation</h1>

      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Quick Start</h2>
        </div>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Create an API key in the API Keys section</li>
          <li>Include the API key in your request headers as <code className="px-2 py-1 bg-gray-100 rounded">x-api-key</code></li>
          <li>Make requests to the ReachstreamAPI endpoints</li>
        </ol>
      </div>

      {/* Example Request */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Code className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Example Request</h2>
        </div>
        <p className="text-gray-700 mb-4">TikTok Profile Scraper:</p>
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
    "verified": true
  }
}`}
        </pre>
      </div>

      {/* Available Endpoints */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Book className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Available Endpoints</h2>
        </div>
        <div className="space-y-4">
          <div className="border-l-4 border-indigo-600 pl-4">
            <h3 className="font-semibold text-gray-900 mb-1">TikTok Profile</h3>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              GET /api/scrape/tiktok/profile?username=:username
            </code>
            <p className="text-sm text-gray-600 mt-2">
              Scrapes public TikTok profile data including follower count, videos, and bio.
            </p>
          </div>
          <div className="border-l-4 border-gray-400 pl-4 opacity-50">
            <h3 className="font-semibold text-gray-900 mb-1">Instagram Profile</h3>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              GET /api/scrape/instagram/profile?username=:username
            </code>
            <p className="text-sm text-gray-600 mt-2">Coming soon...</p>
          </div>
          <div className="border-l-4 border-gray-400 pl-4 opacity-50">
            <h3 className="font-semibold text-gray-900 mb-1">YouTube Channel</h3>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              GET /api/scrape/youtube/channel?channel_id=:channel_id
            </code>
            <p className="text-sm text-gray-600 mt-2">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
