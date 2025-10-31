/**
 * AI Coding Assistant Prompts Page
 * Pre-written prompts for integrating ReachstreamAPI using AI coding assistants
 */

import { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Code,
  Zap,
  Settings,
  TestTube,
  Rocket,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';

export default function AIPrompts() {
  const [copiedPrompt, setCopiedPrompt] = useState(null);
  const [bookmarked, setBookmarked] = useState(() => {
    return localStorage.getItem('ai-prompts-bookmarked') === 'true';
  });
  const [expandedCategories, setExpandedCategories] = useState({
    quickstart: true,
    fullIntegration: false,
    platforms: false,
    errorHandling: false,
    testing: false,
    production: false
  });

  const copyPrompt = (promptId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(promptId);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const toggleBookmark = () => {
    const newState = !bookmarked;
    setBookmarked(newState);
    localStorage.setItem('ai-prompts-bookmarked', newState.toString());
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const prompts = {
    quickstart: {
      title: 'Quick Start Prompts',
      icon: <Zap className="h-6 w-6" />,
      description: 'Get started in minutes with these quick integration prompts',
      prompts: [
        {
          id: 'node-quickstart',
          name: 'Node.js/JavaScript Quick Start',
          language: 'Node.js',
          prompt: `I want to integrate ReachstreamAPI into my Node.js application. Here's what I need:

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- My API key: [PASTE YOUR KEY HERE]

**What I want to build:**
A simple function to scrape TikTok profile data and return follower count, verification status, and bio.

**Requirements:**
1. Use axios or fetch for HTTP requests
2. Handle errors gracefully (API errors, network errors, rate limits)
3. Return structured data with success/error status
4. Include TypeScript types if possible
5. Add JSDoc comments explaining the function

**Example usage I want:**
\`\`\`javascript
const profile = await getTikTokProfile('charlidamelio');
console.log(profile.follower_count);
\`\`\`

Please create a production-ready implementation with proper error handling.`
        },
        {
          id: 'python-quickstart',
          name: 'Python Quick Start',
          language: 'Python',
          prompt: `I want to integrate ReachstreamAPI into my Python application. Here's what I need:

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- My API key: [PASTE YOUR KEY HERE]

**What I want to build:**
A simple class to scrape social media data from TikTok, Instagram, and YouTube.

**Requirements:**
1. Use requests library for HTTP calls
2. Create a ReachstreamClient class with methods for each platform
3. Handle errors gracefully (API errors, network errors, rate limits)
4. Return structured data using dataclasses or Pydantic models
5. Add type hints and docstrings
6. Include retry logic for failed requests

**Example usage I want:**
\`\`\`python
client = ReachstreamClient(api_key="rsk_...")
profile = client.get_tiktok_profile("charlidamelio")
print(profile.follower_count)
\`\`\`

Please create a production-ready implementation following Python best practices.`
        },
        {
          id: 'react-quickstart',
          name: 'React Hook Quick Start',
          language: 'React',
          prompt: `I want to integrate ReachstreamAPI into my React application. Here's what I need:

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- My API key should come from environment variables

**What I want to build:**
A custom React hook to fetch social media data with loading states, error handling, and caching.

**Requirements:**
1. Create a \`useReachstream\` custom hook
2. Support loading, error, and success states
3. Cache results to avoid redundant API calls
4. Handle errors gracefully with user-friendly messages
5. TypeScript types for all data
6. Include example component using the hook

**Example usage I want:**
\`\`\`jsx
const ProfileCard = () => {
  const { data, loading, error } = useReachstream('tiktok/profile', { username: 'charlidamelio' });

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  return <div>{data.follower_count} followers</div>;
};
\`\`\`

Please create a production-ready custom hook with TypeScript.`
        },
        {
          id: 'php-quickstart',
          name: 'PHP Quick Start',
          language: 'PHP',
          prompt: `I want to integrate ReachstreamAPI into my PHP application. Here's what I need:

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- My API key: [PASTE YOUR KEY HERE]

**What I want to build:**
A PHP class to scrape TikTok and Instagram data with proper error handling.

**Requirements:**
1. Use Guzzle HTTP client or cURL
2. Create a ReachstreamClient class with methods for each endpoint
3. Handle errors with custom exceptions
4. Return associative arrays or objects
5. Include PHPDoc comments
6. Follow PSR-12 coding standards

**Example usage I want:**
\`\`\`php
$client = new ReachstreamClient('rsk_...');
$profile = $client->getTikTokProfile('charlidamelio');
echo $profile['follower_count'];
\`\`\`

Please create a production-ready implementation following PHP best practices.`
        }
      ]
    },
    fullIntegration: {
      title: 'Full Integration Prompts',
      icon: <Code className="h-6 w-6" />,
      description: 'Complete integration with advanced features',
      prompts: [
        {
          id: 'node-full',
          name: 'Node.js Complete Integration',
          language: 'Node.js',
          prompt: `I want to create a complete Node.js SDK for ReachstreamAPI with all features.

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- 27 endpoints across 7 platforms (TikTok, Instagram, YouTube, Twitter, Facebook, LinkedIn, Reddit)

**What I want to build:**
A complete SDK with these features:

**Core Features:**
1. **Client Class** with configuration options (API key, base URL, timeout)
2. **All 27 Endpoints** organized by platform:
   - TikTok: profile, video, comments, feed, hashtag, trending
   - Instagram: profile, posts, post, comments, search
   - YouTube: channel, videos, video, comments, search
   - Twitter: profile, feed, search
   - Facebook: profile, posts
   - LinkedIn: profile, company
   - Reddit: posts, comments
3. **Error Handling** with custom error classes (APIError, RateLimitError, NetworkError)
4. **Retry Logic** with exponential backoff
5. **Rate Limiting** client-side protection
6. **Response Caching** with configurable TTL
7. **TypeScript** full type definitions
8. **Logging** with configurable log levels
9. **Testing** with Jest, 80%+ coverage
10. **Documentation** with JSDoc and README

**Example Usage:**
\`\`\`javascript
const ReachstreamSDK = require('reachstream-sdk');

const client = new ReachstreamSDK({
  apiKey: process.env.REACHSTREAM_API_KEY,
  timeout: 30000,
  maxRetries: 3,
  cache: { ttl: 300 }
});

// Get TikTok profile
const profile = await client.tiktok.getProfile('charlidamelio');

// Get Instagram posts with error handling
try {
  const posts = await client.instagram.getPosts('instagram');
  console.log(\`Found \${posts.length} posts\`);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  }
}
\`\`\`

**Project Structure:**
\`\`\`
src/
├── index.ts (main export)
├── client.ts (main client class)
├── platforms/
│   ├── tiktok.ts
│   ├── instagram.ts
│   └── ... (other platforms)
├── errors/
│   └── index.ts (custom errors)
├── utils/
│   ├── retry.ts
│   ├── cache.ts
│   └── rateLimit.ts
└── types/
    └── index.ts (TypeScript types)
\`\`\`

Please create a production-ready, well-tested SDK following best practices.`
        },
        {
          id: 'python-full',
          name: 'Python Complete SDK',
          language: 'Python',
          prompt: `I want to create a complete Python SDK for ReachstreamAPI with all features.

**API Details:**
- Base URL: https://api.reachstream.com
- Authentication: x-api-key header
- 27 endpoints across 7 platforms

**What I want to build:**
A complete Python package with these features:

**Core Features:**
1. **Client Class** using Pydantic for configuration
2. **All 27 Endpoints** with dedicated methods
3. **Async Support** using aiohttp for concurrent requests
4. **Error Handling** with custom exception hierarchy
5. **Retry Logic** with tenacity library
6. **Rate Limiting** using ratelimit decorator
7. **Response Models** using Pydantic for type safety
8. **Caching** with TTL using cachetools
9. **Logging** with Python logging module
10. **Testing** with pytest, 80%+ coverage
11. **Type Hints** throughout
12. **Documentation** with Sphinx

**Example Usage:**
\`\`\`python
from reachstream import ReachstreamClient
from reachstream.exceptions import RateLimitError

client = ReachstreamClient(
    api_key=os.getenv('REACHSTREAM_API_KEY'),
    timeout=30,
    max_retries=3,
    cache_ttl=300
)

# Sync usage
profile = client.tiktok.get_profile('charlidamelio')
print(f"{profile.follower_count:,} followers")

# Async usage
async with ReachstreamAsyncClient(api_key=...) as client:
    profiles = await asyncio.gather(
        client.tiktok.get_profile('user1'),
        client.instagram.get_profile('user2'),
        client.youtube.get_channel('channel_id')
    )
\`\`\`

**Project Structure:**
\`\`\`
reachstream/
├── __init__.py
├── client.py (main client)
├── async_client.py (async client)
├── platforms/
│   ├── tiktok.py
│   ├── instagram.py
│   └── ... (other platforms)
├── models/
│   └── responses.py (Pydantic models)
├── exceptions.py
└── utils/
    ├── retry.py
    ├── cache.py
    └── rate_limit.py
\`\`\`

Please create a production-ready Python package following best practices.`
        }
      ]
    },
    platforms: {
      title: 'Platform-Specific Prompts',
      icon: <Settings className="h-6 w-6" />,
      description: 'Integration prompts for specific social media platforms',
      prompts: [
        {
          id: 'tiktok-dashboard',
          name: 'TikTok Analytics Dashboard',
          language: 'React + Node.js',
          prompt: `I want to build a TikTok analytics dashboard using ReachstreamAPI.

**What I want to build:**
A React dashboard that tracks TikTok creators and shows analytics over time.

**Features:**
1. **Creator Tracking** - Add TikTok usernames to monitor
2. **Historical Data** - Store daily snapshots of follower counts, video counts
3. **Growth Charts** - Line charts showing follower growth over time
4. **Top Videos** - List of trending videos with engagement metrics
5. **Comparison** - Compare multiple creators side-by-side
6. **Alerts** - Notify when creators post new videos or hit milestones

**Tech Stack:**
- Frontend: React with Chart.js or Recharts
- Backend: Node.js/Express with MongoDB or PostgreSQL
- Cron job to fetch data daily

**ReachstreamAPI Endpoints to Use:**
- \`/api/scrape/tiktok/profile?username=...\` (daily)
- \`/api/scrape/tiktok/feed?username=...\` (for new videos)
- \`/api/scrape/tiktok/trending\` (for trending content)

**Example UI:**
- Dashboard with cards showing total creators tracked, total followers
- Line chart of follower growth for selected creator
- Table of recent videos with views, likes, comments

Please create a complete full-stack application with:
1. Backend API with cron job for daily updates
2. React frontend with charts
3. Database schema for storing historical data
4. Error handling and rate limiting
5. Environment variable configuration`
        },
        {
          id: 'instagram-export',
          name: 'Instagram Content Export Tool',
          language: 'Python',
          prompt: `I want to build an Instagram content export tool using ReachstreamAPI.

**What I want to build:**
A Python CLI tool that exports Instagram profile data and posts to various formats.

**Features:**
1. **Profile Export** - Export complete profile information
2. **Posts Export** - Export all posts with captions, hashtags, engagement
3. **Export Formats** - JSON, CSV, Excel, PDF report
4. **Images Download** - Optionally download post images
5. **Comments Export** - Export comments for selected posts
6. **Scheduling** - Run exports on schedule (weekly/monthly)
7. **Progress Bar** - Show progress during export

**ReachstreamAPI Endpoints:**
- \`/api/scrape/instagram/profile?username=...\`
- \`/api/scrape/instagram/posts?username=...\`
- \`/api/scrape/instagram/comments?post_id=...\`

**CLI Usage:**
\`\`\`bash
python instagram_export.py export --username travel_blogger --format excel --include-images
python instagram_export.py compare --users user1,user2,user3 --format pdf
python instagram_export.py schedule --username brand --frequency weekly
\`\`\`

Please create a complete CLI tool with:
1. Click or argparse for CLI
2. Pandas for data manipulation
3. Rich for beautiful terminal output
4. Pillow for image processing (optional)
5. Schedule library for automated exports
6. Configuration file support (.env or config.yaml)`
        },
        {
          id: 'youtube-monitor',
          name: 'YouTube Channel Monitor',
          language: 'Node.js',
          prompt: `I want to build a YouTube channel monitoring service using ReachstreamAPI.

**What I want to build:**
A Node.js service that monitors YouTube channels and sends notifications for new uploads.

**Features:**
1. **Channel Monitoring** - Track multiple YouTube channels
2. **New Video Detection** - Detect when channels upload new videos
3. **Multi-Channel Notifications:**
   - Email notifications (SendGrid/Mailgun)
   - Discord webhooks
   - Slack webhooks
   - Telegram bot
4. **Video Analytics** - Track views, likes, comments over time
5. **Keyword Alerts** - Alert when specific keywords appear in video titles
6. **Scheduled Checks** - Run checks every 15 minutes

**ReachstreamAPI Endpoints:**
- \`/api/scrape/youtube/channel?channel_id=...\`
- \`/api/scrape/youtube/videos?channel_id=...\`
- \`/api/scrape/youtube/video?video_id=...\`

**Architecture:**
- Cron job (node-cron) runs every 15 minutes
- Compare current videos with stored videos in database
- Send notifications for new videos detected
- Store video metadata in database

**Example Notification:**
"🎥 New video from TechChannel: 'How to Build APIs'
Views: 1.2K | Likes: 345 | Published: 2 hours ago
https://youtube.com/watch?v=..."

Please create a complete monitoring service with:
1. Express API for managing monitored channels
2. Cron job for periodic checks
3. Multiple notification channels
4. Database for storing channel/video data
5. Configuration via environment variables
6. Logging and error handling`
        }
      ]
    },
    errorHandling: {
      title: 'Error Handling & Edge Cases',
      icon: <TestTube className="h-6 w-6" />,
      description: 'Robust error handling for production applications',
      prompts: [
        {
          id: 'comprehensive-errors',
          name: 'Comprehensive Error Handling',
          language: 'Any',
          prompt: `I'm integrating ReachstreamAPI and want bulletproof error handling.

**Scenarios to Handle:**
1. **API Errors:**
   - 401 Unauthorized (invalid API key)
   - 402 Payment Required (insufficient credits)
   - 429 Too Many Requests (rate limit)
   - 500 Internal Server Error
   - 503 Service Unavailable

2. **Network Errors:**
   - Timeout (request takes >30 seconds)
   - DNS resolution failure
   - Connection refused
   - Network unreachable

3. **Data Errors:**
   - Invalid response format (not JSON)
   - Missing required fields
   - Unexpected data types
   - Empty/null responses

4. **Application Errors:**
   - Invalid input parameters
   - Configuration errors (missing API key)
   - Database connection failures

**Requirements:**
1. **Custom Error Classes** for each error type
2. **Retry Logic** with exponential backoff:
   - Retry 429 (rate limit) after waiting
   - Retry 5xx errors up to 3 times
   - Don't retry 4xx errors (except 429)
3. **Error Messages** - User-friendly, actionable
4. **Error Logging** - Log with context (timestamp, endpoint, parameters)
5. **Fallback Behavior** - Return cached data or default values
6. **Circuit Breaker** - Stop making requests after repeated failures
7. **Error Reporting** - Send critical errors to Sentry/monitoring

**Example Implementation:**
Show me how to implement this for [YOUR LANGUAGE] with:
- Custom error classes
- Retry decorator/wrapper
- Circuit breaker pattern
- Proper logging
- User-friendly error messages

Please create production-ready error handling following best practices.`
        },
        {
          id: 'rate-limit-handling',
          name: 'Rate Limit Handling',
          language: 'Any',
          prompt: `I need to handle ReachstreamAPI rate limits gracefully in my application.

**Rate Limit Details:**
- Tier-based limits (Free: 100/15min, Freelance: 500/15min, Business: 1000/15min)
- Returns 429 status code when exceeded
- Includes Retry-After header with seconds to wait

**What I Need:**
1. **Client-Side Rate Limiting:**
   - Track requests per 15-minute window
   - Warn when approaching limit (e.g., 90% used)
   - Queue requests when limit reached
   - Auto-resume when window resets

2. **Server-Side Handling:**
   - Parse Retry-After header
   - Exponential backoff strategy
   - Don't lose failed requests

3. **User Feedback:**
   - Show rate limit status in UI
   - Display countdown until reset
   - Option to upgrade tier

**Example Features:**
\`\`\`javascript
const client = new ReachstreamClient({
  apiKey: '...',
  tier: 'freelance', // auto-tracks: 500 requests / 15 min
  onRateLimitWarning: (usage) => {
    console.log(\`⚠️  \${usage.percentage}% of rate limit used\`);
  },
  onRateLimitReached: (retryAfter) => {
    console.log(\`⏸️  Rate limit reached. Retry in \${retryAfter}s\`);
  }
});

// Automatically queues if rate limited
const profile = await client.getTikTokProfile('user');
\`\`\`

Please implement:
1. Rate limit tracker with sliding window
2. Request queue with priority
3. Automatic retry with backoff
4. User-friendly error messages
5. Option to upgrade tier notification

Create this for [YOUR LANGUAGE/FRAMEWORK].`
        }
      ]
    },
    testing: {
      title: 'Testing Prompts',
      icon: <TestTube className="h-6 w-6" />,
      description: 'Test your integration thoroughly',
      prompts: [
        {
          id: 'unit-tests',
          name: 'Complete Unit Test Suite',
          language: 'Jest/Python',
          prompt: `I want to create comprehensive unit tests for my ReachstreamAPI integration.

**What to Test:**
1. **API Client Tests:**
   - Constructor with valid/invalid config
   - Authentication headers set correctly
   - Base URL construction
   - Timeout configuration

2. **Endpoint Tests:**
   - All 27 endpoints with valid parameters
   - Invalid parameters rejected
   - Response parsing correct
   - Error responses handled

3. **Error Handling Tests:**
   - 401, 402, 429, 500, 503 status codes
   - Network timeouts
   - Invalid JSON responses
   - Retry logic works correctly

4. **Retry Logic Tests:**
   - Retries on 5xx errors
   - Doesn't retry on 4xx errors
   - Exponential backoff timing
   - Max retries respected

5. **Cache Tests:**
   - Cache hit/miss
   - TTL expiration
   - Cache invalidation

**Test Framework:**
- [Jest for Node.js / Pytest for Python / PHPUnit for PHP]

**Mocking:**
- Mock HTTP requests (nock/axios-mock-adapter for Node.js, responses for Python)
- Don't make real API calls in tests

**Coverage Goal:** 80%+ code coverage

**Example Test Structure:**
\`\`\`javascript
describe('ReachstreamClient', () => {
  describe('constructor', () => {
    it('should throw error with invalid API key', () => {
      expect(() => new ReachstreamClient({ apiKey: '' })).toThrow();
    });
  });

  describe('TikTok endpoints', () => {
    it('should fetch profile successfully', async () => {
      // mock response
      const profile = await client.tiktok.getProfile('test');
      expect(profile.username).toBe('test');
    });

    it('should handle 404 for non-existent user', async () => {
      // mock 404 response
      await expect(client.tiktok.getProfile('nonexistent'))
        .rejects.toThrow('User not found');
    });
  });

  describe('error handling', () => {
    it('should retry on 500 error', async () => {
      // mock 500 then 200 response
      const result = await client.getTikTokProfile('test');
      expect(mockFetch).toHaveBeenCalledTimes(2); // retried once
    });
  });
});
\`\`\`

Please create a complete test suite with:
1. Unit tests for all methods
2. Mocked HTTP responses
3. Edge case coverage
4. Clear test descriptions
5. Setup/teardown code
6. 80%+ code coverage`
        },
        {
          id: 'integration-tests',
          name: 'Integration Test Suite',
          language: 'Any',
          prompt: `I want to create integration tests that actually call ReachstreamAPI.

**Setup:**
- Use test API key (not production)
- Test against staging environment if available
- Use known test accounts (e.g., verified TikTok accounts)

**What to Test:**
1. **End-to-End Flows:**
   - Fetch TikTok profile → parse response → store in database
   - Fetch Instagram posts → download images → process data
   - Monitor YouTube channel → detect new video → send notification

2. **Real API Responses:**
   - All 27 endpoints return expected data structure
   - Response times are acceptable (<5s)
   - Credit deduction works correctly

3. **Error Scenarios:**
   - Invalid API key returns 401
   - Invalid parameters return clear error messages
   - Rate limiting works (intentionally exceed limit)

4. **Data Validation:**
   - Follower counts are numbers
   - URLs are valid
   - Dates are ISO 8601 format
   - Required fields are present

**Test Configuration:**
\`\`\`
REACHSTREAM_TEST_API_KEY=rsk_test_...
REACHSTREAM_TEST_USERNAME_TIKTOK=charlidamelio
REACHSTREAM_TEST_USERNAME_INSTAGRAM=instagram
REACHSTREAM_TEST_CHANNEL_YOUTUBE=UC...
\`\`\`

**Example Tests:**
\`\`\`javascript
describe('ReachstreamAPI Integration Tests', () => {
  beforeAll(() => {
    client = new ReachstreamClient({
      apiKey: process.env.REACHSTREAM_TEST_API_KEY
    });
  });

  it('should fetch real TikTok profile', async () => {
    const profile = await client.tiktok.getProfile('charlidamelio');

    expect(profile.username).toBe('charlidamelio');
    expect(profile.follower_count).toBeGreaterThan(100000000);
    expect(profile.verified).toBe(true);
  }, 10000); // 10s timeout

  it('should handle rate limit gracefully', async () => {
    // Make requests until rate limited
    const requests = Array(200).fill().map(() =>
      client.tiktok.getProfile('test')
    );

    await expect(Promise.all(requests))
      .rejects.toThrow('Rate limit exceeded');
  }, 60000);
});
\`\`\`

Please create integration tests with:
1. Real API calls with test credentials
2. Validation of response data
3. Performance assertions (response time)
4. Rate limit testing
5. Clear test isolation
6. Proper timeouts`
        }
      ]
    },
    production: {
      title: 'Production Deployment',
      icon: <Rocket className="h-6 w-6" />,
      description: 'Deploy your integration to production',
      prompts: [
        {
          id: 'production-checklist',
          name: 'Production Deployment Checklist',
          language: 'DevOps',
          prompt: `I'm ready to deploy my ReachstreamAPI integration to production. Help me create a comprehensive deployment checklist.

**What I Need:**

1. **Environment Configuration:**
   - Production API key (not test key)
   - Environment variables setup
   - Secrets management (AWS Secrets Manager, Vault, etc.)
   - CORS configuration for production domains

2. **Security Hardening:**
   - API key stored securely (never in code/logs)
   - HTTPS only for API calls
   - Rate limiting on client side
   - Input validation/sanitization
   - Error messages don't leak sensitive data

3. **Performance Optimization:**
   - Response caching with appropriate TTL
   - Connection pooling for HTTP client
   - Gzip compression for responses
   - CDN for static assets

4. **Monitoring & Alerting:**
   - Track API response times
   - Monitor error rates
   - Alert on rate limit warnings
   - Log API usage for billing tracking
   - Dashboard showing credit usage

5. **Error Handling:**
   - Graceful degradation (show cached data if API fails)
   - User-friendly error messages
   - Error logging to Sentry/monitoring service
   - Retry logic with exponential backoff

6. **Testing:**
   - All tests passing
   - Integration tests with production-like data
   - Load testing (can handle expected traffic)
   - Smoke tests in production

7. **Documentation:**
   - API key management instructions
   - Deployment runbook
   - Rollback procedures
   - Incident response plan

8. **Compliance:**
   - Terms of Service reviewed
   - Privacy policy updated
   - GDPR compliance (if applicable)
   - Data retention policy

**Deployment Steps:**
Please create step-by-step deployment instructions for:
- [YOUR PLATFORM: AWS/Heroku/Vercel/DigitalOcean/etc.]

Include:
1. Pre-deployment checklist
2. Deployment commands/scripts
3. Post-deployment verification
4. Rollback procedure
5. Monitoring setup

**Infrastructure:**
- Web server: [nginx/Apache/etc.]
- Application: [Node.js/Python/PHP/etc.]
- Database: [PostgreSQL/MongoDB/etc.]
- Hosting: [YOUR PROVIDER]

Please provide production-ready deployment guide.`
        },
        {
          id: 'monitoring-setup',
          name: 'Monitoring & Observability Setup',
          language: 'DevOps',
          prompt: `I want to set up comprehensive monitoring for my ReachstreamAPI integration.

**What I Need to Monitor:**

1. **API Metrics:**
   - Request count (per endpoint, per platform)
   - Response times (p50, p95, p99)
   - Error rates (by status code)
   - Success rates per platform
   - Credit usage (daily, weekly, monthly)

2. **Application Metrics:**
   - Memory usage
   - CPU usage
   - Database connection pool
   - Cache hit/miss ratio

3. **Business Metrics:**
   - API calls per user
   - Most popular endpoints
   - Peak usage times
   - Cost per user (credits used)

**Monitoring Stack:**
- APM: [Datadog/New Relic/Elastic APM/etc.]
- Logging: [CloudWatch/Splunk/ELK stack/etc.]
- Errors: [Sentry/Rollbar/etc.]
- Dashboards: [Grafana/Datadog/etc.]

**Alerting Rules:**
1. **Critical Alerts** (immediate action):
   - Error rate >5% for 5 minutes
   - API response time >10s
   - 401/402 errors (API key issues)
   - Service unavailable (503)

2. **Warning Alerts:**
   - Rate limit at 90%
   - Error rate >2% for 15 minutes
   - Response time >5s
   - Credit balance <10% remaining

3. **Info Alerts:**
   - Daily usage report
   - Weekly cost summary
   - New high-value endpoint (potential cost increase)

**Dashboard Requirements:**
- Real-time API call volume
- Response time graph (last 24 hours)
- Error rate by status code
- Credit usage (daily burn rate)
- Most used endpoints
- Per-platform success rates

**Example Alert:**
"🚨 CRITICAL: ReachstreamAPI error rate at 8% (last 5 min)
Endpoint: /api/scrape/tiktok/profile
Status: 503 Service Unavailable
Runbook: https://docs.yourapp.com/runbooks/api-errors"

Please create:
1. Monitoring configuration (code/config files)
2. Dashboard JSON/YAML
3. Alert definitions
4. Logging best practices
5. Runbook for common issues`
        }
      ]
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Bookmark */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            AI Coding Assistant Prompts
          </h1>
          <p className="text-gray-600 mt-2">
            Copy-paste these prompts into Claude, Cursor, ChatGPT, or any AI coding assistant
          </p>
        </div>
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
              <span>Bookmark</span>
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="text-indigo-600 mt-1">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">
              How to Use These Prompts
            </h3>
            <ol className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">1.</span>
                <span>Click the copy button on any prompt below</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">2.</span>
                <span>Paste into Claude, Cursor, ChatGPT, or your favorite AI assistant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">3.</span>
                <span>Replace [PASTE YOUR KEY HERE] with your actual API key from the <a href="/api-keys" className="text-indigo-600 hover:underline">API Keys</a> page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-indigo-600">4.</span>
                <span>The AI will generate production-ready code for you!</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Prompt Categories */}
      <div className="space-y-4">
        {Object.entries(prompts).map(([categoryKey, category]) => (
          <div key={categoryKey} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className="w-full flex items-center justify-between p-6 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expandedCategories[categoryKey] ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div className="text-indigo-600">{category.icon}</div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {category.prompts.length} prompt{category.prompts.length > 1 ? 's' : ''}
              </span>
            </button>

            {/* Category Prompts */}
            {expandedCategories[categoryKey] && (
              <div className="p-6 space-y-6">
                {category.prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {prompt.name}
                          </h3>
                          <span className="text-sm text-gray-600 mt-1 inline-block">
                            {prompt.language}
                          </span>
                        </div>
                        <button
                          onClick={() => copyPrompt(prompt.id, prompt.prompt)}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {copiedPrompt === prompt.id ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span className="text-sm font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span className="text-sm font-medium">Copy Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-white">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto border">
                        {prompt.prompt}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tips Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
        <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Pro Tips for Vibe Coders
        </h3>
        <ul className="text-sm text-yellow-800 space-y-2">
          <li>• <strong>Be specific:</strong> Add details about your tech stack, database, deployment platform</li>
          <li>• <strong>Ask for tests:</strong> Always request unit tests and error handling in your prompts</li>
          <li>• <strong>Request types:</strong> Ask for TypeScript types or Python type hints for better code</li>
          <li>• <strong>Iterate:</strong> Start with quick start, then ask the AI to add features incrementally</li>
          <li>• <strong>Follow up:</strong> Ask the AI to explain any code you don't understand</li>
          <li>• <strong>Customize:</strong> Modify these prompts to match your exact needs</li>
        </ul>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-8 mt-8 text-center">
        <h3 className="text-2xl font-bold mb-3">Ready to Build?</h3>
        <p className="mb-6 text-indigo-100">
          Get your API key and start building in minutes
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/api-keys"
            className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Get API Key
          </a>
          <a
            href="/documentation"
            className="border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition"
          >
            View Docs
          </a>
        </div>
      </div>
    </div>
  );
}
