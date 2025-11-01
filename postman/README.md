# ReachstreamAPI Postman Collection

Complete Postman collection for testing all ReachstreamAPI endpoints.

## Quick Start

### 1. Import Collection

**Option A: Import from file**
1. Open Postman
2. Click "Import" button
3. Select `ReachstreamAPI.postman_collection.json`
4. Click "Import"

**Option B: Import from URL** (if hosted)
```
https://raw.githubusercontent.com/yourusername/ReachstreamAPI/main/postman/ReachstreamAPI.postman_collection.json
```

### 2. Set Environment Variables

The collection uses two variables that you need to configure:

1. **BASE_URL**: API base URL
   - Production: `https://api.reachstream.com`
   - Development: `http://localhost:3000`

2. **API_KEY**: Your API key (format: `rsk_xxxxx...`)
   - Get your API key from the [Dashboard](https://dashboard.reachstreamapi.com/api-keys)

#### Setting Variables in Postman:

1. Click on the "ReachstreamAPI" collection
2. Go to the "Variables" tab
3. Update the "Current Value" for:
   - `BASE_URL` → Your API base URL
   - `API_KEY` → Your actual API key
4. Click "Save"

**Alternative**: Create a Postman Environment:
1. Click "Environments" in left sidebar
2. Click "+" to create new environment
3. Name it "ReachstreamAPI Production" or "ReachstreamAPI Dev"
4. Add variables:
   - `BASE_URL` = `https://api.reachstream.com`
   - `API_KEY` = `rsk_your_actual_key_here`
5. Select the environment from the dropdown (top right)

## Collection Structure

The collection is organized by platform:

### TikTok (11 endpoints)
- **TikTok Profile** - Get profile data (1 credit)
- **TikTok User Feed** - Get user's videos (2 credits)
- **TikTok Hashtag** - Get hashtag videos (3 credits)
- **TikTok Video** - Get video details (1 credit)
- **TikTok Trending** - Get trending videos (3 credits)
- **TikTok Comments** - Get video comments (2 credits)
- **TikTok Search** - Search users/videos/hashtags/sounds (2 credits)
- **TikTok Sound** - Get sound/music details (1 credit)
- **TikTok Analytics** - Get advanced analytics with engagement metrics (2 credits)
- **TikTok Demographics** - Get audience demographics (2 credits)
- **TikTok Transcript** - Get video captions and transcripts (1 credit)

### TikTok Shop (3 endpoints)
- **TikTok Shop Search** - Search products (1 credit)
- **TikTok Shop Product** - Get product details (1 credit)
- **TikTok Shop Reviews** - Get product reviews (2 credits)

### Instagram (8 endpoints)
- **Instagram Profile** - Get profile data (1 credit)
- **Instagram Posts** - Get user's posts (2 credits)
- **Instagram Single Post** - Get single post details (1 credit)
- **Instagram Comments** - Get post comments (2 credits)
- **Instagram Search** - Search users/hashtags (2 credits)
- **Instagram Reels** - Get user's Reels with performance metrics (2 credits)
- **Instagram Stories** - Get active Stories and highlights (1 credit)
- **Instagram Hashtag** - Analyze hashtag performance (2 credits)

### YouTube (5 endpoints)
- **YouTube Channel** - Get channel data (1 credit)
- **YouTube Channel Videos** - Get channel videos (2 credits)
- **YouTube Video** - Get video details (1 credit)
- **YouTube Comments** - Get video comments (2 credits)
- **YouTube Search** - Search videos (2 credits)

### Twitter / X (3 endpoints)
- **Twitter Profile** - Get profile data (1 credit)
- **Twitter User Feed** - Get user's tweets (2 credits)
- **Twitter Search** - Search tweets (2 credits)

### LinkedIn (2 endpoints)
- **LinkedIn Profile** - Get profile data (1 credit)
- **LinkedIn Company** - Get company data (2 credits)

### Facebook (2 endpoints)
- **Facebook Profile** - Get profile data (1 credit)
- **Facebook Posts** - Get user's posts (2 credits)

### Reddit (2 endpoints)
- **Reddit Posts** - Get subreddit posts (2 credits)
- **Reddit Comments** - Get post comments (2 credits)

### General (2 endpoints)
- **List Platforms** - Get all available platforms (no auth)
- **Get User Stats** - Get your usage statistics

**Total: 38 endpoints**

## Authentication

All endpoints (except `/api/scrape/platforms`) require authentication via API key.

The collection is pre-configured to use the `{{API_KEY}}` variable in the `x-api-key` header.

Make sure to set your API key in the collection variables or environment.

## Usage Examples

### Example 1: Get TikTok Profile

1. Open "TikTok" folder
2. Click "TikTok Profile"
3. (Optional) Modify the `username` query parameter
4. Click "Send"
5. View the response

### Example 2: Search TikTok Shop

1. Open "TikTok Shop" folder
2. Click "TikTok Shop Search"
3. Modify the `query` parameter (e.g., "sneakers", "phone case")
4. Click "Send"
5. View product results

### Example 3: Get YouTube Video Comments

1. Open "YouTube" folder
2. Click "YouTube Comments"
3. Update `video_id` with a valid YouTube video ID
4. Optionally adjust `limit` parameter
5. Click "Send"
6. View comments data

## Query Parameters

Each endpoint has different query parameters. Common ones include:

- `username` - Social media username (without @)
- `video_id` / `post_id` - Content identifier
- `query` - Search query string
- `limit` - Number of results (optional)
- `cursor` - Pagination cursor (optional)
- `filter` / `sort` - Result filtering/sorting (optional)

Hover over each parameter in Postman to see its description.

## Response Format

All endpoints return JSON in this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "metadata": {
    "response_time_ms": 2341,
    "proxy_used": true,
    "timestamp": "2025-10-31T17:00:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "metadata": {
    "response_time_ms": 150,
    "proxy_used": true,
    "timestamp": "2025-10-31T17:00:00Z"
  }
}
```

## Credit Costs

Each request consumes credits based on complexity:

| Endpoint Type | Credits |
|--------------|---------|
| Profile/Channel data | 1 credit |
| Single item (video/post) | 1 credit |
| Feed/Posts | 2 credits |
| Comments/Reviews | 2 credits |
| Search | 2-3 credits |
| Trending | 3 credits |

Check your remaining credits via the dashboard or `/api/scrape/stats` endpoint.

## Rate Limiting

Rate limits vary by subscription tier:

- **Free**: 100 requests / 15 minutes
- **Freelance**: 500 requests / 15 minutes
- **Business**: 2000 requests / 15 minutes

If you hit the rate limit, you'll receive a `429 Too Many Requests` response.

## Troubleshooting

### 401 Unauthorized
- Check that your API key is correctly set in variables
- Verify the API key is active in the dashboard
- Ensure the key hasn't expired

### 400 Bad Request
- Check that all required parameters are provided
- Verify parameter values are in the correct format
- Read the error message for specific details

### 429 Too Many Requests
- You've exceeded your rate limit
- Wait 15 minutes or upgrade your plan
- Implement exponential backoff in your application

### 500 Server Error
- The scraping request failed
- Try again in a few seconds
- Check the `error` field for details
- Contact support if the issue persists

## Support

- **Documentation**: https://docs.reachstreamapi.com
- **Dashboard**: https://dashboard.reachstreamapi.com
- **Email**: support@reachstreamapi.com
- **Issues**: https://github.com/yourusername/ReachstreamAPI/issues

## Changelog

### v1.1.0 (2025-11-01)
- Added 5 new endpoints (38 total)
- TikTok: Demographics and Transcript endpoints
- Instagram: Reels, Stories, and Hashtag Performance endpoints
- Enhanced analytics and audience insights

### v1.0.0 (2025-11-01)
- Initial release
- 33 endpoints across 8 platforms
- TikTok, TikTok Shop, Instagram, YouTube, Twitter, LinkedIn, Facebook, Reddit
- Complete parameter documentation
- Authentication pre-configured
- Environment variable support
