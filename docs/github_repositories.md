# GitHub Repositories for Social Media Scraping SaaS Platform

## Core Scraping Libraries

### 1. **Apify impit** (Recommended - Modern)
- **Repository**: https://github.com/apify/impit
- **Stars**: 200
- **Language**: Rust with Node.js bindings
- **NPM Package**: `impit`
- **Purpose**: Browser impersonation for making browser-like HTTP requests
- **Key Features**:
  - Supports HTTP/1.1, HTTP/2, and HTTP/3
  - Fetch API interface for Node.js
  - Browser impersonation (Chrome, Firefox)
  - Built-in proxy support
  - TLS fingerprinting
- **Use Case**: Primary HTTP client for all scraping operations

### 2. **Apify got-scraping** (Legacy Reference)
- **Repository**: https://github.com/apify/got-scraping
- **Stars**: 715
- **Status**: Deprecated (EOL) - Use impit instead
- **Purpose**: Understanding scraping patterns and header generation
- **Key Features**:
  - Browser-like request headers
  - Automatic proxy protocol detection
  - Header generator for different browsers/OS/devices
- **Use Case**: Reference for understanding scraping architecture

### 3. **TikTok Scraper**
- **Repository**: https://github.com/drawrowfly/tiktok-scraper
- **Stars**: 4.9k
- **Forks**: 874
- **Used by**: 19.2k repositories
- **Language**: TypeScript/JavaScript
- **Purpose**: Complete TikTok scraping implementation
- **Key Features**:
  - User, hashtag, trends, music feed scraping
  - Metadata extraction to JSON/CSV
  - Download with/without watermark
  - Progress tracking and history
  - Batch mode processing
  - Proxy and session support
- **Use Case**: Reference implementation for TikTok API endpoints

### 4. **snscrape** (Python - Multi-platform)
- **Repository**: https://github.com/JustAnotherArchivist/snscrape
- **Language**: Python
- **Purpose**: Multi-platform social media scraper
- **Platforms**: Twitter, Instagram, Facebook, Reddit, etc.
- **Use Case**: Reference for multi-platform scraping patterns

### 5. **Ultimate Social Scrapers**
- **Repository**: https://github.com/harismuneer/Ultimate-Social-Scrapers
- **Purpose**: Facebook, Instagram, Twitter scraping
- **Features**: Posts, photos, videos, likes, comments
- **Use Case**: Reference for social media data structures

## SaaS Infrastructure & Boilerplates

### 6. **Node.js Express Boilerplate**
- **Repository**: https://github.com/hagopj13/node-express-boilerplate
- **Purpose**: Production-ready RESTful API boilerplate
- **Features**:
  - Express.js framework
  - MongoDB with Mongoose
  - Authentication & authorization
  - Validation
  - Error handling
  - API documentation
- **Use Case**: Base API structure

### 7. **AWS Serverless HTTP API Boilerplate**
- **Repository**: https://github.com/leroychan/aws-serverless-http-api-boilerplate
- **Purpose**: Node.js RESTful API on AWS SAM
- **Features**:
  - AWS Lambda functions
  - API Gateway integration
  - Serverless architecture
- **Use Case**: AWS Lambda deployment for scraper functions

### 8. **Node.js AWS Lambda Boilerplate**
- **Repository**: https://github.com/igorski/nodejs-aws-lambda-boilerplate
- **Purpose**: Node.js microservice for AWS Lambda
- **Features**:
  - Local development with Express
  - Lambda deployment ready
- **Use Case**: Individual scraper microservices

## Credit-Based Billing Systems

### 9. **Lago - Open Source Metering & Billing**
- **Repository**: https://github.com/getlago/lago
- **Purpose**: Usage-based billing API
- **Key Features**:
  - Consumption tracking
  - Subscription management
  - Pricing iterations
  - Payment orchestration
  - Revenue analytics
- **Use Case**: Primary billing system for credit-based model

### 10. **Flexprice**
- **Repository**: https://github.com/flexprice/flexprice
- **Purpose**: Usage-based pricing and billing
- **Features**:
  - Credit-based pricing models
  - Metering and invoicing
  - Hybrid pricing support
- **Use Case**: Alternative billing solution

### 11. **Credit-Based Backend Example**
- **Repository**: https://github.com/Pythagora-io/credit-based-backend-gpt-pilot-example
- **Purpose**: Reference implementation for credit-based systems
- **Features**:
  - Secure authentication
  - Credit-based billing
  - Dashboard for credit tracking
  - API activity monitoring
- **Use Case**: Reference architecture for credit system

## Supabase SaaS Starters

### 12. **Basejump - Supabase SaaS Starter**
- **Website**: https://usebasejump.com/
- **Repository**: Open source
- **Purpose**: Complete SaaS starter for Supabase
- **Features**:
  - Authentication
  - Team management
  - Billing integration
  - 31-second setup
- **Use Case**: Frontend and auth infrastructure

### 13. **Next.js Supabase SaaS Template**
- **Repository**: https://github.com/adrianhajdin/saas-template
- **Purpose**: High-powered SaaS template
- **Features**:
  - User authentication
  - Subscriptions
  - Payments
  - Next.js + Supabase + Clerk
- **Use Case**: Alternative frontend framework

## Claude Code Subagent Resources

### 14. **Awesome Claude Code Subagents**
- **Repository**: https://github.com/VoltAgent/awesome-claude-code-subagents
- **Stars**: 3.6k
- **Forks**: 398
- **Purpose**: Production-ready Claude subagent collection
- **Contains**: 100+ specialized AI agents for:
  - Full-stack development
  - DevOps
  - Data science
  - Business operations
- **Use Case**: Templates for creating custom subagents

### 15. **Claude Code Documentation**
- **URL**: https://docs.claude.com/en/docs/claude-code/sub-agents
- **Purpose**: Official subagent documentation
- **Features**:
  - Subagent configuration format
  - Tool management
  - Model selection
  - Best practices
- **Use Case**: Reference for creating custom subagents

## Additional Utility Repositories

### 16. **Smartproxy Social Media Scraping API**
- **Repository**: https://github.com/Smartproxy/Social-Media-Scraping-API
- **Purpose**: Commercial API examples
- **Platforms**: Instagram, TikTok
- **Use Case**: API endpoint design reference

### 17. **Scrape-it**
- **Repository**: https://github.com/IonicaBizau/scrape-it
- **Purpose**: Node.js scraper for humans
- **Features**: Simple, declarative scraping
- **Use Case**: Simple scraping tasks

## Proxy Management

### 18. **Proxy Rotation Resources**
- **Articles**:
  - https://zenscrape.com/how-to-build-a-simple-proxy-rotator-in-node-js/
  - https://www.zenrows.com/blog/ip-rotation-scraping
  - https://www.scrapingbee.com/blog/how-to-set-up-a-rotating-proxy-in-puppeteer/
- **Purpose**: Implementing proxy rotation
- **Use Case**: Avoiding rate limits and blocks

## Recommended Proxy Services (from Adrian's Stack)

1. **Evomi** - Core residential (cheapest residential proxies)
2. **Webshare** - Residential proxies
3. **Massive** - Proxy provider
4. **Core residential** - Proxy provider

## Complete Tech Stack Summary

### Backend
- **Runtime**: Node.js
- **HTTP Client**: impit (npm)
- **Framework**: Express.js or Fastify
- **Database**: Supabase (PostgreSQL)
- **Billing**: Lago or Flexprice

### Hosting
- **Main API**: Render.com or AWS ECS
- **Scraper Functions**: AWS Lambda
- **Database**: Supabase Cloud or AWS RDS
- **File Storage**: AWS S3
- **CDN**: AWS CloudFront

### Frontend
- **Framework**: Astro + React
- **Styling**: Tailwind CSS
- **Auth**: Supabase Auth

### DevOps
- **CI/CD**: GitHub Actions or GitLab CI/CD
- **Monitoring**: AWS CloudWatch
- **Error Tracking**: Sentry (optional)

### Development
- **IDE**: VS Code with Claude Code
- **AI Assistant**: Claude Code with custom subagents
- **Version Control**: Git + GitHub

## Implementation Priority

### Phase 1: Core Infrastructure
1. Set up AWS account and services
2. Configure Supabase project
3. Deploy Node.js API boilerplate to Render.com
4. Set up basic authentication

### Phase 2: Scraping Engine
1. Implement impit HTTP client
2. Create scraper modules for each platform
3. Deploy scrapers to AWS Lambda
4. Implement proxy rotation

### Phase 3: Billing & Credits
1. Integrate Lago billing system
2. Implement credit tracking
3. Set up payment processing
4. Create usage dashboard

### Phase 4: Frontend & Documentation
1. Build Astro + React frontend
2. Create API documentation
3. Implement user dashboard
4. Add monitoring and analytics

### Phase 5: Claude Code Agents
1. Create custom subagents for each component
2. Set up agent orchestration
3. Implement automated testing agents
4. Create deployment agents

