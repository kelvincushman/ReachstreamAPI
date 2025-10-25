# CreatorScrape Platform - Claude Code Implementation Guide

This document provides comprehensive instructions for Claude Code to build the entire CreatorScrape SaaS platform using specialized sub-agents.

## Project Overview

**CreatorScrape** is a real-time social media scraping API platform that allows developers to extract public data from major social media platforms through a simple, pay-as-you-go API. The platform is modeled after the successful business ScrapeCreators.com, which generates $20,000/month in revenue with an 80% profit margin.

## Documentation Structure

This project includes the following documentation files:

1. **prd.md** - Product Requirements Document with detailed user stories and acceptance criteria
2. **architecture_and_agents.md** - Technical architecture and agent specifications
3. **business_and_deployment.md** - Business model canvas and deployment guide
4. **github_repositories.md** - Comprehensive list of GitHub repositories and tech stack components
5. **claude_agents/** - Directory containing all sub-agent configuration files

## Sub-Agent Team

The project will be built by a team of specialized Claude Code sub-agents:

| Agent | File | Responsibility |
|-------|------|----------------|
| **Infrastructure Agent** | `claude_agents/infra-agent.md` | AWS infrastructure provisioning with CDK |
| **Backend Agent** | `claude_agents/backend-agent.md` | Node.js backend services (Auth, Billing, API) |
| **Scraper Agent** | `claude_agents/scraper-agent.md` | Social media scraper functions |
| **Frontend Agent** | `claude_agents/frontend-agent.md` | Marketing website and developer dashboard |
| **Database Agent** | `claude_agents/db-agent.md` | Supabase PostgreSQL database management |
| **Documentation Agent** | `claude_agents/doc-agent.md` | API documentation and guides |

## Implementation Workflow

### Phase 1: Project Setup

1. **Initialize Project Repository**
   - Create a new Git repository
   - Set up the project structure
   - Initialize npm packages for backend and frontend

2. **Configure Sub-Agents**
   - Load all agent configuration files from `claude_agents/` directory
   - Verify each agent has access to required tools
   - Test agent invocation

### Phase 2: Infrastructure Setup

**Agent**: `infra-agent`

1. Set up AWS account and configure credentials
2. Create AWS CDK project for infrastructure as code
3. Define CDK stacks for:
   - VPC and networking
   - AWS Fargate for backend services
   - AWS Lambda for scraper functions
   - Amazon API Gateway
   - AWS Amplify for frontend
   - CloudWatch for monitoring
4. Deploy infrastructure to AWS

### Phase 3: Database Setup

**Agent**: `db-agent`

1. Create Supabase project
2. Run SQL migrations to create database schema:
   - users table
   - api_keys table
   - credits table
   - credit_purchases table
   - api_requests table
3. Set up row-level security policies
4. Create database indexes for performance

### Phase 4: Backend Development

**Agent**: `backend-agent`

1. **Auth Service**
   - User registration endpoint
   - User login endpoint
   - API key generation and management
   - JWT-based authentication

2. **Billing Service**
   - Stripe integration for payments
   - Credit purchase endpoints
   - Credit balance tracking
   - Credit deduction logic

3. **API Service**
   - API Gateway integration
   - Request routing to scraper functions
   - Response formatting
   - Error handling

### Phase 5: Scraper Development

**Agent**: `scraper-agent`

1. **TikTok Scrapers**
   - Profile scraper
   - Feed scraper
   - Hashtag scraper

2. **Instagram Scrapers**
   - Profile scraper
   - Feed scraper

3. **YouTube Scrapers**
   - Channel scraper
   - Videos scraper

4. **Proxy Management**
   - Implement proxy rotation
   - Configure proxy providers (Evomi, Webshare, Massive)

### Phase 6: Frontend Development

**Agent**: `frontend-agent`

1. **Marketing Website (Astro)**
   - Homepage with value proposition
   - Pricing page
   - Features page
   - Use cases page

2. **Developer Dashboard (React)**
   - Login/signup pages
   - Dashboard overview
   - API key management
   - Usage charts
   - Billing and credit purchase
   - Account settings

### Phase 7: Documentation

**Agent**: `doc-agent`

1. Create API documentation website
2. Document all endpoints with examples
3. Write getting started guide
4. Create code examples in multiple languages
5. Set up interactive API explorer

### Phase 8: Testing and Deployment

**Main Agent**

1. Run end-to-end tests
2. Verify all integrations
3. Deploy to production
4. Configure DNS
5. Set up monitoring and alerts

## Environment Variables

The following environment variables need to be configured:

```bash
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Proxies
EVOMI_PROXY_URL=your_evomi_proxy_url
WEBSHARE_PROXY_URL=your_webshare_proxy_url
MASSIVE_PROXY_URL=your_massive_proxy_url

# Application
API_BASE_URL=https://api.creatorscrape.com
FRONTEND_URL=https://creatorscrape.com
JWT_SECRET=your_jwt_secret
```

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| **Backend Runtime** | Node.js 18+ |
| **Backend Framework** | Express.js |
| **HTTP Client** | impit (npm) |
| **Database** | PostgreSQL (Supabase) |
| **Hosting - Backend** | AWS Fargate |
| **Hosting - Scrapers** | AWS Lambda |
| **Hosting - Frontend** | AWS Amplify |
| **Frontend Framework** | Astro + React |
| **Styling** | Tailwind CSS |
| **Payment Processing** | Stripe |
| **Infrastructure as Code** | AWS CDK (TypeScript) |

## Key GitHub Repositories

Refer to `github_repositories.md` for a complete list of relevant repositories, including:

- **apify/impit** - Modern HTTP client for scraping
- **drawrowfly/tiktok-scraper** - TikTok scraping reference
- **getlago/lago** - Open source billing system
- **hagopj13/node-express-boilerplate** - API boilerplate

## Success Criteria

The project is complete when:

1. All user stories in the PRD are implemented
2. The API has a success rate > 98%
3. Average API response time < 4 seconds
4. The platform can handle 2,000 concurrent requests
5. All documentation is complete and published
6. The platform is deployed to AWS and accessible via the domain
7. Payment processing is functional
8. Monitoring and alerting are configured

## Next Steps for Claude Code

1. Read and understand all documentation files
2. Load all sub-agent configurations from the `claude_agents/` directory
3. Begin with Phase 1: Project Setup
4. Delegate tasks to appropriate sub-agents based on their expertise
5. Coordinate between agents to ensure smooth integration
6. Monitor progress and adjust the plan as needed

## Support and Resources

- **Original Business**: https://scrapecreators.com/
- **Founder Interview**: https://www.youtube.com/watch?v=4BsxnGRbF4k
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code/sub-agents
- **AWS CDK Docs**: https://docs.aws.amazon.com/cdk/
- **Supabase Docs**: https://supabase.com/docs
- **Stripe API Docs**: https://stripe.com/docs/api

---

**Ready to build? Let's create an amazing SaaS platform!**

