# ScrapeCreators API - Complete Reference Documentation

**Version:** v1  
**Base URL:** `https://api.scrapecreators.com`  
**Authentication:** API Key (via `x-api-key` header)  
**Documentation Source:** [https://docs.scrapecreators.com](https://docs.scrapecreators.com)

---

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Rate Limits & Pricing](#rate-limits--pricing)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Platforms & Endpoints](#platforms--endpoints)
   - [TikTok](#tiktok)
   - [Instagram](#instagram)
   - [YouTube](#youtube)
   - [LinkedIn](#linkedin)
   - [Facebook](#facebook)
   - [Twitter](#twitter)
   - [Reddit](#reddit)
   - [Threads](#threads)
   - [Bluesky](#bluesky)
   - [Pinterest](#pinterest)
   - [Google](#google)
   - [Twitch](#twitch)
   - [Kick](#kick)
   - [Snapchat](#snapchat)
   - [Linktree](#linktree)
   - [Ad Libraries](#ad-libraries)
   - [Utility Endpoints](#utility-endpoints)

---

## Introduction

ScrapeCreators provides real-time social media scraping APIs that allow developers and businesses to access data from platforms like TikTok, Instagram, YouTube, LinkedIn, Facebook, Twitter, and many more. The API is designed for immediate productivity with simple integration and reliable performance.

### Key Features

- **Real-time data extraction** from 20+ social media platforms
- **No rate limits** on most endpoints
- **Pay-as-you-go pricing** with credits (1 request = 1 credit)
- **Comprehensive data** including profiles, posts, comments, followers, and more
- **Transcript extraction** for video content (TikTok, Instagram, YouTube, Facebook, Twitter)
- **Ad library access** for Facebook, Google, and LinkedIn
- **Demographic data** for TikTok users
- **Pagination handling** for large datasets

---

## Authentication

All API requests require authentication using an API key passed in the `x-api-key` header.

### Getting Your API Key

1. Sign up at [https://scrapecreators.com](https://scrapecreators.com)
2. Navigate to your dashboard
3. Copy your API key

### Example Authentication

```bash
curl "https://api.scrapecreators.com/v1/tiktok/profile?handle=example" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## Rate Limits & Pricing

### Pricing Model

- **Pay-as-you-go credits**: 1 API request = 1 credit
- **No subscription required**
- **No rate limits** on standard endpoints
- **Instant activation** upon sign-up

### Credit Balance

Check your remaining credits using the balance endpoint:

```bash
GET /v1/credits/balance
```

---

## Response Format

All API responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data varies by endpoint
  },
  "status": "ok"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message description",
  "status": "error"
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success - Request completed successfully |
| `400` | Bad Request - Invalid parameters or missing required fields |
| `401` | Unauthorized - Invalid or missing API key |
| `403` | Forbidden - Insufficient credits or access denied |
| `404` | Not Found - Resource not found |
| `429` | Too Many Requests - Rate limit exceeded (rare) |
| `500` | Internal Server Error - Server-side error |

---

## Platforms & Endpoints

### TikTok

TikTok endpoints provide comprehensive data extraction including profiles, videos, comments, followers, search, trending content, and TikTok Shop products.

#### GET Profile

Scrapes a public TikTok profile.

**Endpoint:** `GET /v1/tiktok/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle (e.g., `stoolpresidente`) |

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/tiktok/profile?handle=stoolpresidente" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "user": {
    "id": "6659752019493208069",
    "uniqueId": "stoolpresidente",
    "nickname": "Dave Portnoy",
    "avatarLarger": "https://p16-sign-va.tiktokcdn.com/...",
    "signature": "El Presidente/Barstool Sports Founder.",
    "verified": true,
    "secUid": "MS4wLjABAAAAINC_ElRR-l1RCcnEjOZhNO-9wOzAMf-YHXqRY8vvG9bEhMRa6iu23TaE3JPZYXBD",
    "bioLink": {
      "link": "https://www.barstoolsports.com/bios/Surviving-Barstool"
    }
  },
  "stats": {
    "followerCount": 4100000,
    "followingCount": 74,
    "heartCount": 190400000,
    "videoCount": 2017
  }
}
```

#### GET User's Audience Demographics

Get demographic data for a TikTok user's audience (age, gender, location).

**Endpoint:** `GET /v1/tiktok/demographics`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |

#### GET Profile Videos

Get videos from a TikTok profile.

**Endpoint:** `GET /v1/tiktok/videos`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |
| `cursor` | string | No | Pagination cursor for next page |

#### GET Profile Videos (We handle pagination)

Get all videos from a TikTok profile with automatic pagination.

**Endpoint:** `GET /v1/tiktok/videos-paginated`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |

#### GET Video Info

Get detailed information about a specific TikTok video.

**Endpoint:** `GET /v1/tiktok/video`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | TikTok video URL |

#### GET Transcript

Get the transcript/captions of a TikTok video.

**Endpoint:** `GET /v1/tiktok/transcript`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | TikTok video URL |

#### GET TikTok Live

Get information about a TikTok live stream.

**Endpoint:** `GET /v1/tiktok/live`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |

#### GET Comments

Get comments from a TikTok video.

**Endpoint:** `GET /v1/tiktok/comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | TikTok video URL |
| `cursor` | string | No | Pagination cursor |

#### GET Following

Get the list of accounts a TikTok user is following.

**Endpoint:** `GET /v1/tiktok/following`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |
| `cursor` | string | No | Pagination cursor |

#### GET Followers

Get the list of followers for a TikTok user.

**Endpoint:** `GET /v1/tiktok/followers`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | TikTok handle |
| `cursor` | string | No | Pagination cursor |

#### GET Search Users

Search for TikTok users.

**Endpoint:** `GET /v1/tiktok/search-users`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Search by Hashtag

Search for TikTok videos by hashtag.

**Endpoint:** `GET /v1/tiktok/search-hashtag`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hashtag` | string | Yes | Hashtag to search (without #) |
| `cursor` | string | No | Pagination cursor |

#### GET Search by Keyword

Search for TikTok videos by keyword.

**Endpoint:** `GET /v1/tiktok/search-keyword`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | Yes | Search keyword |
| `cursor` | string | No | Pagination cursor |

#### GET Top Search

Get top search suggestions on TikTok.

**Endpoint:** `GET /v1/tiktok/top-search`

#### GET Get popular songs

Get popular songs on TikTok.

**Endpoint:** `GET /v1/tiktok/songs`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |

#### GET Get Song Details

Get details about a specific TikTok song.

**Endpoint:** `GET /v1/tiktok/song`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `song_id` | string | Yes | TikTok song ID |

#### GET TikToks using Song

Get TikTok videos that use a specific song.

**Endpoint:** `GET /v1/tiktok/song-videos`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `song_id` | string | Yes | TikTok song ID |
| `cursor` | string | No | Pagination cursor |

#### GET Trending Feed

Get trending TikTok videos.

**Endpoint:** `GET /v1/tiktok/trending`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |

---

### TikTok Shop

#### GET Shop Search

Search for products on TikTok Shop.

**Endpoint:** `GET /v1/tiktok-shop/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Shop Products

Get products from a TikTok Shop.

**Endpoint:** `GET /v1/tiktok-shop/products`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `shop_id` | string | Yes | TikTok Shop ID |
| `cursor` | string | No | Pagination cursor |

#### GET Product Details

Get detailed information about a TikTok Shop product.

**Endpoint:** `GET /v1/tiktok-shop/product`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | string | Yes | Product ID |

---

### Instagram

Instagram endpoints provide access to profiles, posts, reels, comments, stories, and more.

#### GET Profile

Gets public Instagram profile data, recent posts, and related accounts.

**Endpoint:** `GET /v1/instagram/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle (e.g., `adrianhorning`) |
| `trim` | boolean | No | Set to `true` for a trimmed response (default: `false`) |

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/instagram/profile?handle=adrianhorning&trim=false" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "biography": "Scraping the web",
      "bio_links": [
        {
          "title": "Social Media APIs",
          "url": "https://scrapecreators.com"
        }
      ],
      "edge_followed_by": {
        "count": 25116
      },
      "edge_follow": {
        "count": 101
      },
      "full_name": "Adrian Horning",
      "id": "2700692569",
      "is_business_account": true,
      "is_professional_account": true,
      "is_verified": true,
      "profile_pic_url": "https://scontent-iad3-1.cdninstagram.com/v/t51.2885-19/430086429_362220943449758_2621012714660517106_n.jpg",
      "username": "adrianhorning"
    }
  },
  "status": "ok"
}
```

#### GET Basic Profile

Get basic Instagram profile information (faster, less data).

**Endpoint:** `GET /v1/instagram/basic-profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle |

#### GET Posts

Get posts from an Instagram profile.

**Endpoint:** `GET /v1/instagram/posts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle |
| `cursor` | string | No | Pagination cursor |

#### GET Post/Reel Info

Get detailed information about a specific Instagram post or reel.

**Endpoint:** `GET /v1/instagram/post`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Instagram post/reel URL |

#### GET Transcript

Get the transcript/captions of an Instagram reel.

**Endpoint:** `GET /v1/instagram/transcript`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Instagram reel URL |

#### GET Search Reels

Search for Instagram reels by keyword.

**Endpoint:** `GET /v1/instagram/search-reels`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Comments (We handle pagination)

Get all comments from an Instagram post with automatic pagination.

**Endpoint:** `GET /v1/instagram/comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Instagram post URL |

#### GET Reels

Get reels from an Instagram profile.

**Endpoint:** `GET /v1/instagram/reels`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle |
| `cursor` | string | No | Pagination cursor |

#### GET Reels (We handle pagination)

Get all reels from an Instagram profile with automatic pagination.

**Endpoint:** `GET /v1/instagram/reels-paginated`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle |

#### GET Story Highlights

Get story highlights from an Instagram profile.

**Endpoint:** `GET /v1/instagram/highlights`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Instagram handle |

#### GET Highlights Details

Get detailed information about a specific Instagram story highlight.

**Endpoint:** `GET /v1/instagram/highlight`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `highlight_id` | string | Yes | Highlight ID |

#### GET Reels using Song

Get Instagram reels that use a specific song.

**Endpoint:** `GET /v1/instagram/song-reels`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `audio_id` | string | Yes | Audio/song ID |
| `cursor` | string | No | Pagination cursor |

#### GET Embed HTML

Get embeddable HTML for an Instagram post.

**Endpoint:** `GET /v1/instagram/embed`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Instagram post URL |

---

### YouTube

YouTube endpoints provide access to channel details, videos, shorts, transcripts, comments, and search.

#### GET Channel Details

Get comprehensive channel information including stats and metadata. You can pass a `channelId`, `handle`, or `url`.

**Endpoint:** `GET /v1/youtube/channel`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Conditional | YouTube channel ID (e.g., `UC-9-kyTW8ZkZNDHQJ6FgpwQ`) |
| `handle` | string | Conditional | YouTube channel handle (e.g., `ThePatMcAfeeShow`) |
| `url` | string | Conditional | YouTube channel URL |

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/youtube/channel?handle=ThePatMcAfeeShow" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "channelId": "UCxcTeAKWJca6XyJ37_ZoKIQ",
  "channel": "http://www.youtube.com/@ThePatMcAfeeShow",
  "name": "The Pat McAfee Show",
  "avatar": {
    "image": {
      "sources": [
        {
          "url": "https://yt3.googleusercontent.com/ytc/AIdro_nBgMGIxgHehCAlUUepEhd9Yooi1I55k6IF2WExl-v8Q-c=s160-c-k-c0x00ffffff-no-rj",
          "width": 160,
          "height": 160
        }
      ]
    }
  },
  "subscriberCount": 2750000,
  "subscriberCountText": "2.75M subscribers",
  "videoCountText": "9,221 videos",
  "viewCountText": "2,170,355,382 views",
  "joinedDateText": "Joined Aug 23, 2017",
  "tags": "pat mcafee, football, pat mcafee show, the pat mcafee show, pat mcafee podcast",
  "twitter": "https://twitter.com/PatMcAfeeShow",
  "instagram": "https://instagram.com/patmcafeeshow",
  "country": "United States"
}
```

#### GET Channel Videos

Get videos from a YouTube channel.

**Endpoint:** `GET /v1/youtube/videos`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Conditional | YouTube channel ID |
| `handle` | string | Conditional | YouTube channel handle |
| `cursor` | string | No | Pagination cursor |

#### GET Channel Shorts

Get shorts from a YouTube channel.

**Endpoint:** `GET /v1/youtube/shorts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Conditional | YouTube channel ID |
| `handle` | string | Conditional | YouTube channel handle |
| `cursor` | string | No | Pagination cursor |

#### GET Channel Shorts (we handle the pagination)

Get all shorts from a YouTube channel with automatic pagination.

**Endpoint:** `GET /v1/youtube/shorts-paginated`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channelId` | string | Conditional | YouTube channel ID |
| `handle` | string | Conditional | YouTube channel handle |

#### GET Video/Short Details

Get detailed information about a YouTube video or short.

**Endpoint:** `GET /v1/youtube/video`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | YouTube video URL |

#### GET Transcript

Get the transcript/captions of a YouTube video.

**Endpoint:** `GET /v1/youtube/transcript`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | YouTube video URL |

#### GET Search

Search for YouTube videos.

**Endpoint:** `GET /v1/youtube/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Search by Hashtag

Search for YouTube videos by hashtag.

**Endpoint:** `GET /v1/youtube/search-hashtag`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `hashtag` | string | Yes | Hashtag to search (without #) |
| `cursor` | string | No | Pagination cursor |

#### GET Comments

Get comments from a YouTube video.

**Endpoint:** `GET /v1/youtube/comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | YouTube video URL |
| `cursor` | string | No | Pagination cursor |

#### GET Trending Shorts

Get trending YouTube shorts.

**Endpoint:** `GET /v1/youtube/trending-shorts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |

---

### LinkedIn

LinkedIn endpoints provide access to person profiles, company pages, and posts.

#### GET Person's Profile

Get a person's public profile, including recent posts. This only returns what's publicly available (what you see in an incognito browser).

**Endpoint:** `GET /v1/linkedin/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | LinkedIn profile URL |

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/linkedin/profile?url=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fparrsam%2F" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "success": true,
  "name": "Sam Parr",
  "image": "https://media.licdn.com/dms/image/v2/C4E03AQH3Vz1qV_rNVQ/profile-displayphoto-shrink_200_200/...",
  "location": "Westport, Connecticut, United States",
  "followers": 64803,
  "about": "I founded The Hustle, a business news media company with $12 when I was around 25 years…",
  "recentPosts": [
    {
      "title": "Super excited to watch the success of a company built by a Gauntlet AI grad...",
      "link": "https://www.linkedin.com/posts/austenallred_super-excited-to-watch-the-success-of-a-company-activity-7333305862695919617-zTPI"
    }
  ]
}
```

#### GET Company Page

Get information about a LinkedIn company page.

**Endpoint:** `GET /v1/linkedin/company`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | LinkedIn company page URL |

#### GET Post

Get details about a specific LinkedIn post.

**Endpoint:** `GET /v1/linkedin/post`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | LinkedIn post URL |

---

### Facebook

Facebook endpoints provide access to profiles, posts, groups, comments, and transcripts.

#### GET Profile

Get public Facebook profile information.

**Endpoint:** `GET /v1/facebook/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook profile URL |
| `get_business_hours` | boolean | No | Set to `true` to get business hours (default: `false`) |

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/facebook/profile?url=https%3A%2F%2Fwww.facebook.com%2Fcopperkettleyqr&get_business_hours=true" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "success": true,
  "id": "100064027242849",
  "name": "The Copper Kettle Restaurant",
  "url": "https://www.facebook.com/copperkettleyqr/",
  "category": "Pizza place",
  "address": "1953 Scarth Street, Regina, SK, Canada, Saskatchewan",
  "email": "copperkettle.events@gmail.com",
  "phone": "+1 306-525-3545",
  "website": "http://www.thecopperkettle.online/",
  "likeCount": 2660,
  "followerCount": 2900
}
```

#### GET Profile Posts

Get posts from a Facebook profile or page.

**Endpoint:** `GET /v1/facebook/posts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook profile/page URL |
| `cursor` | string | No | Pagination cursor |

#### GET Facebook Group Posts

Get posts from a Facebook group.

**Endpoint:** `GET /v1/facebook/group-posts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook group URL |
| `cursor` | string | No | Pagination cursor |

#### GET Post

Get detailed information about a specific Facebook post.

**Endpoint:** `GET /v1/facebook/post`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook post URL |

#### GET Transcript

Get the transcript/captions of a Facebook video.

**Endpoint:** `GET /v1/facebook/transcript`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook video URL |

#### GET Comments

Get comments from a Facebook post.

**Endpoint:** `GET /v1/facebook/comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Facebook post URL |
| `cursor` | string | No | Pagination cursor |

---

### Twitter

Twitter endpoints provide access to profiles, tweets, communities, and transcripts.

#### GET Profile

Get a Twitter/X profile.

**Endpoint:** `GET /v1/twitter/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Twitter handle (without @) |

#### GET User Tweets

Get tweets from a Twitter user.

**Endpoint:** `GET /v1/twitter/tweets`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Twitter handle (without @) |
| `cursor` | string | No | Pagination cursor |

#### GET Tweet Details

Get detailed information about a specific tweet.

**Endpoint:** `GET /v1/twitter/tweet`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Tweet URL |

#### GET Transcript

Get the transcript/captions of a Twitter video.

**Endpoint:** `GET /v1/twitter/transcript`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Tweet URL with video |

#### GET Community

Get information about a Twitter community.

**Endpoint:** `GET /v1/twitter/community`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `community_id` | string | Yes | Twitter community ID |

#### GET Community Tweets

Get tweets from a Twitter community.

**Endpoint:** `GET /v1/twitter/community-tweets`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `community_id` | string | Yes | Twitter community ID |
| `cursor` | string | No | Pagination cursor |

---

### Reddit

Reddit endpoints provide access to subreddit posts, comments, search, and ads.

#### GET Subreddit Posts

Get posts from a subreddit.

**Endpoint:** `GET /v1/reddit/subreddit`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subreddit` | string | Yes | Subreddit name (without r/) |
| `sort` | string | No | Sort by: `hot`, `new`, `top`, `rising` (default: `hot`) |
| `cursor` | string | No | Pagination cursor |

#### GET Post Comments

Get comments from a Reddit post.

**Endpoint:** `GET /v1/reddit/comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Reddit post URL |

#### GET Simple Comments

Get simplified comments from a Reddit post.

**Endpoint:** `GET /v1/reddit/simple-comments`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Reddit post URL |

#### GET Search

Search for Reddit posts.

**Endpoint:** `GET /v1/reddit/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Search Ads

Search for Reddit ads.

**Endpoint:** `GET /v1/reddit/search-ads`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

#### GET Get Ad

Get details about a specific Reddit ad.

**Endpoint:** `GET /v1/reddit/ad`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ad_id` | string | Yes | Reddit ad ID |

---

### Threads

Threads endpoints provide access to profiles, posts, and search.

#### GET Profile

Get a Threads profile.

**Endpoint:** `GET /v1/threads/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Threads handle |

#### GET Posts

Get posts from a Threads profile.

**Endpoint:** `GET /v1/threads/posts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Threads handle |
| `cursor` | string | No | Pagination cursor |

#### GET Post

Get details about a specific Threads post.

**Endpoint:** `GET /v1/threads/post`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Threads post URL |

#### GET Search by Keyword

Search for Threads posts by keyword.

**Endpoint:** `GET /v1/threads/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Search Users

Search for Threads users.

**Endpoint:** `GET /v1/threads/search-users`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

---

### Bluesky

Bluesky endpoints provide access to profiles, posts, and post details.

#### GET Profile

Get a Bluesky profile.

**Endpoint:** `GET /v1/bluesky/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Bluesky handle |

#### GET Posts

Get posts from a Bluesky profile.

**Endpoint:** `GET /v1/bluesky/posts`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Bluesky handle |
| `cursor` | string | No | Pagination cursor |

#### GET Post

Get details about a specific Bluesky post.

**Endpoint:** `GET /v1/bluesky/post`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Bluesky post URL |

---

### Pinterest

Pinterest endpoints provide access to search, pins, user boards, and board details.

#### GET Search

Search for Pinterest pins.

**Endpoint:** `GET /v1/pinterest/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

#### GET Pin

Get details about a specific Pinterest pin.

**Endpoint:** `GET /v1/pinterest/pin`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Pinterest pin URL |

#### GET User Boards

Get boards from a Pinterest user.

**Endpoint:** `GET /v1/pinterest/boards`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Pinterest handle |

#### GET Board

Get pins from a specific Pinterest board.

**Endpoint:** `GET /v1/pinterest/board`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Pinterest board URL |
| `cursor` | string | No | Pagination cursor |

---

### Google

#### GET Search

Perform a Google search.

**Endpoint:** `GET /v1/google/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

---

### Twitch

Twitch endpoints provide access to profiles and clips.

#### GET Profile

Get a Twitch profile.

**Endpoint:** `GET /v1/twitch/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Twitch handle |

#### GET Clip

Get details about a Twitch clip.

**Endpoint:** `GET /v1/twitch/clip`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Twitch clip URL |

---

### Kick

#### GET Clip

Get details about a Kick clip.

**Endpoint:** `GET /v1/kick/clip`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Kick clip URL |

---

### Snapchat

#### GET User Profile

Get a Snapchat user profile.

**Endpoint:** `GET /v1/snapchat/profile`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Snapchat handle |

---

### Linktree

#### GET Linktree page

Get data from a Linktree page.

**Endpoint:** `GET /v1/linktree/page`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Linktree handle |

---

### Komi

#### GET Komi page

Get data from a Komi page.

**Endpoint:** `GET /v1/komi/page`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Komi handle |

---

### Pillar

#### GET Pillar page

Get data from a Pillar page.

**Endpoint:** `GET /v1/pillar/page`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Pillar handle |

---

### Linkbio

#### GET Linkbio page

Get data from a Linkbio page.

**Endpoint:** `GET /v1/linkbio/page`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `handle` | string | Yes | Linkbio handle |

---

### Amazon Shop

#### GET Amazon Shop page

Get data from an Amazon Shop page.

**Endpoint:** `GET /v1/amazon-shop/page`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | Amazon Shop URL |

---

### Ad Libraries

#### Facebook Ad Library

##### GET Ad Details

Get details about a specific Facebook ad.

**Endpoint:** `GET /v1/facebook-ad-library/ad`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ad_id` | string | Yes | Facebook ad ID |

##### GET Search

Search for Facebook ads.

**Endpoint:** `GET /v1/facebook-ad-library/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `country` | string | No | Country code (e.g., `US`) |
| `cursor` | string | No | Pagination cursor |

##### GET Company Ads

Get ads from a specific Facebook company/page.

**Endpoint:** `GET /v1/facebook-ad-library/company-ads`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_id` | string | Yes | Facebook page ID |
| `cursor` | string | No | Pagination cursor |

##### GET Search for Companies

Search for companies in the Facebook Ad Library.

**Endpoint:** `GET /v1/facebook-ad-library/search-companies`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

---

#### Google Ad Library

##### GET Company Ads

Get ads from a specific Google advertiser.

**Endpoint:** `GET /v1/google-ad-library/company-ads`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `advertiser_id` | string | Yes | Google advertiser ID |
| `cursor` | string | No | Pagination cursor |

##### GET Ad Details

Get details about a specific Google ad.

**Endpoint:** `GET /v1/google-ad-library/ad`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ad_id` | string | Yes | Google ad ID |

##### GET Advertiser Search

Search for Google advertisers.

**Endpoint:** `GET /v1/google-ad-library/search-advertisers`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |

---

#### LinkedIn Ad Library

##### GET Search Ads

Search for LinkedIn ads.

**Endpoint:** `GET /v1/linkedin-ad-library/search`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `cursor` | string | No | Pagination cursor |

##### GET Ad Details

Get details about a specific LinkedIn ad.

**Endpoint:** `GET /v1/linkedin-ad-library/ad`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ad_id` | string | Yes | LinkedIn ad ID |

---

### Utility Endpoints

#### GET Age and Gender

Get age and gender prediction from a name or image.

**Endpoint:** `GET /v1/age-gender`

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | Conditional | Name to analyze |
| `image_url` | string | Conditional | Image URL to analyze |

---

#### GET Get credit balance

Get your remaining API credits.

**Endpoint:** `GET /v1/credits/balance`

**Example Request:**

```bash
curl "https://api.scrapecreators.com/v1/credits/balance" \
  -H "x-api-key: YOUR_API_KEY"
```

**Example Response:**

```json
{
  "success": true,
  "credits_remaining": 9946894
}
```

---

## Code Examples

### Node.js Example

```javascript
const axios = require('axios');

const API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.scrapecreators.com';

async function getTikTokProfile(handle) {
  try {
    const response = await axios.get(`${BASE_URL}/v1/tiktok/profile`, {
      params: { handle },
      headers: { 'x-api-key': API_KEY }
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
getTikTokProfile('stoolpresidente')
  .then(data => console.log(data))
  .catch(err => console.error(err));
```

### Python Example

```python
import requests

API_KEY = 'YOUR_API_KEY'
BASE_URL = 'https://api.scrapecreators.com'

def get_tiktok_profile(handle):
    url = f'{BASE_URL}/v1/tiktok/profile'
    headers = {'x-api-key': API_KEY}
    params = {'handle': handle}
    
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

# Usage
profile = get_tiktok_profile('stoolpresidente')
print(profile)
```

### PHP Example

```php
<?php
$apiKey = 'YOUR_API_KEY';
$baseUrl = 'https://api.scrapecreators.com';

function getTikTokProfile($handle) {
    global $apiKey, $baseUrl;
    
    $url = $baseUrl . '/v1/tiktok/profile?handle=' . urlencode($handle);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ' . $apiKey
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Usage
$profile = getTikTokProfile('stoolpresidente');
print_r($profile);
?>
```

---

## Best Practices

### 1. Error Handling

Always implement proper error handling in your application:

```javascript
try {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

### 2. Rate Limiting

While ScrapeCreators doesn't impose strict rate limits, implement exponential backoff for retries:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 3. Credit Management

Monitor your credit balance regularly:

```javascript
async function checkCredits() {
  const response = await fetch(`${BASE_URL}/v1/credits/balance`, {
    headers: { 'x-api-key': API_KEY }
  });
  const data = await response.json();
  console.log(`Credits remaining: ${data.credits_remaining}`);
  return data.credits_remaining;
}
```

### 4. Pagination

Handle pagination properly for large datasets:

```javascript
async function getAllVideos(handle) {
  let allVideos = [];
  let cursor = null;
  
  do {
    const params = { handle, ...(cursor && { cursor }) };
    const response = await fetch(`${BASE_URL}/v1/tiktok/videos?${new URLSearchParams(params)}`, {
      headers: { 'x-api-key': API_KEY }
    });
    const data = await response.json();
    
    allVideos = allVideos.concat(data.videos);
    cursor = data.cursor;
  } while (cursor);
  
  return allVideos;
}
```

### 5. Caching

Implement caching to reduce API calls and costs:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedProfile(handle) {
  const cacheKey = `profile:${handle}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getTikTokProfile(handle);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

---

## Support & Resources

- **Documentation:** [https://docs.scrapecreators.com](https://docs.scrapecreators.com)
- **Dashboard:** [https://scrapecreators.com/dashboard](https://scrapecreators.com/dashboard)
- **Website:** [https://scrapecreators.com](https://scrapecreators.com)
- **Support:** Contact via the dashboard

---

## Changelog

### v1 (Current)

- Initial release with 20+ platform integrations
- Support for TikTok, Instagram, YouTube, LinkedIn, Facebook, Twitter, and more
- Transcript extraction for video content
- Ad library access for Facebook, Google, and LinkedIn
- Demographic data for TikTok users
- Pagination handling for large datasets

---

**Document Generated:** November 1, 2025  
**Author:** Manus AI  
**For:** ReachstreamAPI Project

