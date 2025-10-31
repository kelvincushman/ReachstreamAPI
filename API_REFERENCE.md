# ReachstreamAPI - Complete API Reference

## 🔐 Authentication

All scraping endpoints require an API key passed in the `x-api-key` header.

```bash
curl -H "x-api-key: rsk_your_api_key_here" https://api.reachstream.com/api/scrape/...
```

## 💳 Credits

Each successful API request costs **1 credit**.

---

## 📱 TikTok Endpoints

### 1. Get TikTok Profile

**Endpoint:** `GET /api/scrape/tiktok/profile`

**Parameters:**
- `username` (required) - TikTok username (without @)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/tiktok/profile?username=charlidamelio" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "5831967",
    "username": "charlidamelio",
    "nickname": "charli d'amelio",
    "avatar_url": "https://...",
    "signature": "✨ 19 ✨",
    "verified": true,
    "private_account": false,
    "follower_count": 155000000,
    "following_count": 1500,
    "video_count": 2300,
    "heart_count": 12000000000,
    "profile_url": "https://www.tiktok.com/@charlidamelio",
    "scraped_at": "2025-01-15T10:30:00.000Z"
  },
  "metadata": {
    "response_time_ms": 2341,
    "proxy_used": true,
    "timestamp": "2025-01-15T10:30:00.000Z"
  },
  "response_time_ms": 2341
}
```

### 2. Get TikTok User Feed

**Endpoint:** `GET /api/scrape/tiktok/feed`

**Parameters:**
- `username` (required) - TikTok username
- `limit` (optional) - Number of videos to return (default: 30)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/tiktok/feed?username=charlidamelio&limit=10" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "username": "charlidamelio",
    "video_count": 10,
    "videos": [
      {
        "video_id": "7123456789",
        "description": "Dancing video",
        "create_time": 1705310400,
        "video_url": "https://www.tiktok.com/@charlidamelio/video/7123456789",
        "cover_url": "https://...",
        "play_count": 5000000,
        "like_count": 500000,
        "comment_count": 12000,
        "share_count": 8000,
        "duration": 15,
        "music": {
          "title": "Original Sound",
          "author": "charli d'amelio"
        },
        "hashtags": ["fyp", "dance"]
      }
    ],
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

### 3. Get TikTok Hashtag Videos

**Endpoint:** `GET /api/scrape/tiktok/hashtag`

**Parameters:**
- `hashtag` (required) - Hashtag name (with or without #)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/tiktok/hashtag?hashtag=fyp" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "hashtag": "fyp",
    "hashtag_id": "229207",
    "title": "fyp",
    "description": "For You Page",
    "view_count": 1500000000000,
    "video_count": 50000000,
    "is_commerce": false,
    "video_count_returned": 30,
    "videos": [...]
  }
}
```

---

## 📷 Instagram Endpoints

### 1. Get Instagram Profile

**Endpoint:** `GET /api/scrape/instagram/profile`

**Parameters:**
- `username` (required) - Instagram username (without @)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/instagram/profile?username=instagram" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "25025320",
    "username": "instagram",
    "full_name": "Instagram",
    "biography": "Discover what's next 📷✨",
    "profile_pic_url": "https://...",
    "follower_count": 650000000,
    "following_count": 100,
    "post_count": 7500,
    "is_verified": true,
    "is_private": false,
    "is_business_account": true,
    "business_category": "Social Media",
    "external_url": "https://www.instagram.com",
    "profile_url": "https://www.instagram.com/instagram",
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🎬 YouTube Endpoints

### 1. Get YouTube Channel

**Endpoint:** `GET /api/scrape/youtube/channel`

**Parameters:**
- `channel_id` (required) - Channel ID or handle (@username)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/youtube/channel?channel_id=@MrBeast" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "channel_id": "UCX6OQ3DkcsbYNE6H8uQQuVA",
    "channel_name": "MrBeast",
    "handle": "@MrBeast",
    "description": "I make entertaining videos and donate money :)",
    "avatar_url": "https://...",
    "banner_url": "https://...",
    "subscriber_count": 230000000,
    "subscriber_text": "230M subscribers",
    "is_verified": true,
    "video_count": "800 videos",
    "country": "US",
    "keywords": ["challenge", "money", "entertainment"],
    "channel_url": "https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA",
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🐦 Twitter/X Endpoints

### 1. Get Twitter Profile

**Endpoint:** `GET /api/scrape/twitter/profile`

**Parameters:**
- `username` (required) - Twitter username (without @)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/twitter/profile?username=elonmusk" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "44196397",
    "username": "elonmusk",
    "display_name": "Elon Musk",
    "description": "Tesla, SpaceX, Neuralink",
    "profile_image_url": "https://...",
    "profile_banner_url": "https://...",
    "follower_count": 170000000,
    "following_count": 500,
    "tweet_count": 35000,
    "is_verified": true,
    "is_protected": false,
    "location": "Texas, USA",
    "url": "https://twitter.com/elonmusk",
    "created_at": "Tue Jun 02 20:12:29 +0000 2009",
    "profile_url": "https://twitter.com/elonmusk",
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 💼 LinkedIn Endpoints

### 1. Get LinkedIn Profile

**Endpoint:** `GET /api/scrape/linkedin/profile`

**Parameters:**
- `username` (required) - LinkedIn username (from profile URL)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/linkedin/profile?username=williamhgates" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "username": "williamhgates",
    "name": "Bill Gates",
    "headline": "Co-chair, Bill & Melinda Gates Foundation",
    "description": "Co-founder of Microsoft. Philanthropist.",
    "profile_image_url": "https://...",
    "location": "Seattle, Washington",
    "follower_count": 35000000,
    "profile_url": "https://www.linkedin.com/in/williamhgates",
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🤖 Reddit Endpoints

### 1. Get Reddit Subreddit Posts

**Endpoint:** `GET /api/scrape/reddit/posts`

**Parameters:**
- `subreddit` (required) - Subreddit name (without r/)
- `limit` (optional) - Number of posts (default: 25, max: 100)
- `sort` (optional) - Sort order: `hot`, `new`, `top`, `rising` (default: hot)

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/reddit/posts?subreddit=programming&sort=hot&limit=10" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "subreddit": "programming",
    "sort": "hot",
    "post_count": 10,
    "posts": [
      {
        "post_id": "abc123",
        "title": "New JavaScript framework released",
        "author": "developer123",
        "subreddit": "programming",
        "subreddit_subscribers": 5000000,
        "created_utc": 1705310400,
        "score": 1500,
        "upvote_ratio": 0.95,
        "num_comments": 250,
        "permalink": "https://www.reddit.com/r/programming/comments/abc123/...",
        "url": "https://example.com/article",
        "is_self": false,
        "selftext": "",
        "thumbnail": "https://...",
        "is_video": false,
        "awards": 5,
        "distinguished": null,
        "stickied": false,
        "over_18": false,
        "spoiler": false,
        "locked": false
      }
    ],
    "scraped_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 📊 Utility Endpoints

### 1. Get User Statistics

**Endpoint:** `GET /api/scrape/stats`

**Authentication:** Requires API key

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/stats" \
  -H "x-api-key: rsk_your_api_key_here"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_requests": 1500,
      "successful_requests": 1470,
      "failed_requests": 30,
      "avg_response_time_ms": 2500,
      "platforms_used": 5,
      "last_request_at": "2025-01-15T10:30:00.000Z"
    },
    "by_platform": [
      {
        "platform": "tiktok",
        "requests": 800,
        "successful": 790,
        "avg_response_time": 2300
      },
      {
        "platform": "instagram",
        "requests": 400,
        "successful": 395,
        "avg_response_time": 2600
      }
    ]
  }
}
```

### 2. List All Platforms

**Endpoint:** `GET /api/scrape/platforms`

**Authentication:** Not required

**Example Request:**
```bash
curl -X GET "https://api.reachstream.com/api/scrape/platforms"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "platforms": [
      {
        "name": "TikTok",
        "endpoints": [
          {
            "path": "/api/scrape/tiktok/profile",
            "description": "Get TikTok profile data",
            "params": ["username"],
            "example": "?username=charlidamelio"
          }
        ]
      }
    ]
  }
}
```

---

## ❌ Error Responses

### Insufficient Credits
```json
{
  "error": "Insufficient credits",
  "message": "Your credit balance is 0. Please purchase more credits.",
  "credits_balance": 0
}
```

### Invalid API Key
```json
{
  "error": "Invalid API key",
  "message": "API key not found or expired"
}
```

### Missing Parameter
```json
{
  "success": false,
  "error": "Missing required parameter: username",
  "example": "/api/scrape/tiktok/profile?username=charlidamelio"
}
```

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

### Scraping Failed
```json
{
  "success": false,
  "error": "Failed to scrape profile data: User not found",
  "metadata": {
    "response_time_ms": 1500,
    "proxy_used": true,
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 💡 Best Practices

1. **Handle Errors**: Always check the `success` field in responses
2. **Monitor Credits**: Check your balance regularly with `/api/credits/balance`
3. **Cache Results**: Cache data when appropriate to save credits
4. **Retry Logic**: Implement exponential backoff for failed requests
5. **Rate Limiting**: Respect rate limits based on your tier
6. **Error Handling**: Log errors and implement proper error handling

---

## 🚀 Rate Limits

| Tier | Requests per Second | Requests per Day |
|------|---------------------|------------------|
| Free | 1 req/sec | 100 requests |
| Freelance | 10 req/sec | 25,000 requests |
| Business | 50 req/sec | 500,000 requests |
| Enterprise | Unlimited | Custom |

---

## 📚 Code Examples

### Node.js
```javascript
const axios = require('axios');

const API_KEY = 'rsk_your_api_key_here';
const BASE_URL = 'https://api.reachstream.com';

async function getTikTokProfile(username) {
  try {
    const response = await axios.get(`${BASE_URL}/api/scrape/tiktok/profile`, {
      params: { username },
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
  }
}

getTikTokProfile('charlidamelio').then(console.log);
```

### Python
```python
import requests

API_KEY = 'rsk_your_api_key_here'
BASE_URL = 'https://api.reachstream.com'

def get_tiktok_profile(username):
    response = requests.get(
        f'{BASE_URL}/api/scrape/tiktok/profile',
        params={'username': username},
        headers={'x-api-key': API_KEY}
    )
    return response.json()

profile = get_tiktok_profile('charlidamelio')
print(profile)
```

### cURL
```bash
#!/bin/bash

API_KEY="rsk_your_api_key_here"
USERNAME="charlidamelio"

curl -X GET "https://api.reachstream.com/api/scrape/tiktok/profile?username=${USERNAME}" \
  -H "x-api-key: ${API_KEY}" \
  | jq '.'
```

---

## 📞 Support

For support, please contact:
- Email: support@reachstream.com
- Dashboard: https://dashboard.reachstream.com
- Documentation: https://docs.reachstream.com

---

**Version:** 1.0.0
**Last Updated:** January 2025
