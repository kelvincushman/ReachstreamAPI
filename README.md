# ReachstreamAPI

A real-time social media scraping API platform that allows developers to extract public data from major social media platforms through a simple, pay-as-you-go credit system.

## 🎯 Overview

**ReachstreamAPI** is modeled after the successful business [ScrapeCreators.com](https://scrapecreators.com/), which generates $20,000/month in revenue with an 80% profit margin. This platform provides a simple, powerful API for extracting real-time public data from social media platforms.

## 🚀 Key Features

- **Simple to Use**: One header (`x-api-key`), simple parameters, no complex authentication
- **Pay-as-you-go Credits**: 1 request = 1 credit, transparent pricing
- **Real-time Data**: Most current publicly available data from social media platforms
- **High Performance**: Average response time < 4 seconds, 98%+ success rate
- **No Rate Limits**: Unlimited concurrent requests
- **Excellent Support**: Direct, personal support with quick response times

## 📊 Supported Platforms

- **TikTok** (Profile, Feed, Hashtag, Shop)
- **Instagram** (Profile, Feed)
- **YouTube** (Channel, Videos)
- **LinkedIn** (Profile, Ad Library)
- **Facebook** (Profile, Ad Library)
- **Twitter/X** (Profile, Feed)
- **Reddit** (Posts, Comments)

## 💰 Business Model

### Pricing Tiers

| Tier | Price | Credits | Cost per 1K Requests |
|------|-------|---------|---------------------|
| Free Trial | $0 | 100 | Free |
| Freelance | $47 | 25,000 | $1.88 |
| Business | $497 | 500,000 | $0.99 |
| Enterprise | Custom | 1M+ | Custom |

### Monthly Operating Costs

- **Proxies**: ~$1,500/month
- **Hosting (AWS)**: ~$400/month
- **Monitoring**: ~$500/month
- **Total**: ~$2,400/month

**Target Profit Margin**: 80%

## 🏗️ Technical Architecture

### Tech Stack

| Component | Technology | Hosting |
|-----------|------------|---------|
| Backend API | Node.js + Express | AWS Fargate |
| Scraper Functions | Node.js + impit | AWS Lambda |
| Database | PostgreSQL | Supabase |
| Frontend (Marketing) | Astro | AWS Amplify |
| Frontend (Dashboard) | React | AWS Amplify |
| Payments | Stripe | Stripe |
| Infrastructure | AWS CDK | AWS |

### Architecture Highlights

- **Serverless-first**: Leverages AWS Lambda for cost-effective scraping
- **Scalable**: Auto-scaling infrastructure to handle traffic spikes
- **Resilient**: Built with fault tolerance and retry mechanisms
- **Secure**: TLS encryption, API key authentication, row-level security

## 📁 Project Structure

```
ReachstreamAPI/
├── docs/                           # Complete project documentation
│   ├── EXECUTIVE_SUMMARY.md
│   ├── prd.md
│   ├── architecture_and_agents.md
│   ├── business_and_deployment.md
│   ├── github_repositories.md
│   ├── CLAUDE_CODE_README.md
│   └── PROJECT_STRUCTURE.md
│
├── backend/                        # Express.js Backend API ✅ COMPLETE
│   ├── src/
│   │   ├── config/                # Database configuration
│   │   ├── middleware/            # Auth, validation middleware
│   │   ├── routes/                # API routes (auth, credits, keys, scrape)
│   │   ├── services/              # Business logic (credits, API keys)
│   │   └── server.js              # Main Express server
│   ├── package.json
│   └── .env.example
│
├── scrapers/                       # AWS Lambda Scrapers ✅ COMPLETE
│   ├── tiktok/
│   │   └── profile.js             # TikTok profile scraper
│   └── package.json
│
├── frontend/                       # Frontend Applications ✅ COMPLETE
│   └── dashboard/                 # React Developer Dashboard
│       ├── src/
│       │   ├── components/        # Reusable UI components
│       │   ├── pages/             # Dashboard pages
│       │   └── App.jsx            # Main application
│       ├── package.json
│       ├── vite.config.js
│       └── tailwind.config.js
│
├── database/                       # Database Schema ✅ COMPLETE
│   └── migrations/
│       └── 001_initial_schema.sql # PostgreSQL schema
│
├── infrastructure/                 # AWS CDK ✅ COMPLETE
│   ├── lib/
│   │   └── reachstream-stack.ts   # Lambda & API Gateway stack
│   └── package.json
│
├── .claude/                        # Claude Code agent configurations
│   └── agents/                    # Technology-specific skills
│
├── GETTING_STARTED.md             # Setup and installation guide ✅
├── README.md                      # This file
└── claude.md                      # Claude Code instructions
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL 14+** (local or Supabase)
- **Clerk Account** for authentication ([clerk.com](https://clerk.com))
- **Stripe Account** for payments ([stripe.com](https://stripe.com))
- **Oxylabs Proxy** for scraping (credentials: `scraping2025_rcOoG`)

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/ReachstreamAPI.git
cd ReachstreamAPI
```

2. **Set up the backend**:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials (Clerk, Stripe, Oxylabs, PostgreSQL)
```

3. **Set up the database**:
```bash
# Create PostgreSQL database
createdb reachstream

# Run migrations
psql -d reachstream -f ../database/migrations/001_initial_schema.sql
```

4. **Set up the frontend**:
```bash
cd ../frontend/dashboard
npm install
cp .env.example .env
# Edit .env with your Clerk publishable key
```

5. **Start the backend**:
```bash
cd ../../backend
npm run dev
# Backend runs on http://localhost:3000
```

6. **Start the frontend** (in a new terminal):
```bash
cd frontend/dashboard
npm run dev
# Dashboard runs on http://localhost:5173
```

7. **Test the API**:
```bash
# Get API documentation
curl http://localhost:3000/api/docs

# Check health
curl http://localhost:3000/health
```

### First Steps

1. **Sign up** at http://localhost:5173 using Clerk
2. **Create an API key** in the dashboard
3. **Test TikTok scraper**:
```bash
curl -X GET "http://localhost:3000/api/scrape/tiktok/profile?username=charlidamelio" \
  -H "x-api-key: rsk_your_api_key_here"
```

📖 **For detailed setup instructions**, see [GETTING_STARTED.md](./GETTING_STARTED.md)

## ✅ Implementation Status

### Completed Features

✅ **Backend API (Express.js)**
- Authentication with Clerk integration
- Credit management system with Stripe
- API key generation and validation
- Request logging and analytics
- RESTful API with error handling
- Rate limiting and security middleware

✅ **Database (PostgreSQL)**
- Complete schema with 5 tables
- Migrations ready to run
- Indexes for performance
- Transaction support

✅ **Scrapers (AWS Lambda)**
- TikTok profile scraper with Oxylabs proxy
- Error handling and retry logic
- Lambda deployment ready

✅ **Frontend Dashboard (React)**
- Overview page with metrics
- API key management
- Billing and credit purchases
- Usage statistics (coming soon)
- Documentation page
- Responsive Tailwind UI

✅ **Infrastructure (AWS CDK)**
- Lambda function configuration
- API Gateway setup
- Ready for deployment

### Coming Soon

🔄 Instagram profile scraper
🔄 YouTube channel scraper
🔄 LinkedIn profile scraper
🔄 Usage analytics with charts
🔄 Astro marketing website

## 🤖 Claude Code Integration

This project is designed to be built entirely by **Claude Code** using specialized sub-agents. The `.claude/agents/` directory contains configuration files for:

- **Infrastructure Agent**: AWS resource provisioning
- **Backend Agent**: Node.js API development
- **Scraper Agent**: Social media scraper functions
- **Frontend Agent**: Marketing website & dashboard
- **Database Agent**: Database management
- **Documentation Agent**: API documentation
- **QA Engineer**: Testing and quality assurance
- **Code Quality Agent**: Code reviews and standards enforcement

## 📚 Documentation

All comprehensive documentation is located in the `/docs` directory:

1. **EXECUTIVE_SUMMARY.md** - Quick overview and roadmap
2. **prd.md** - Complete Product Requirements Document
3. **architecture_and_agents.md** - Technical architecture
4. **business_and_deployment.md** - Business model and deployment guide
5. **github_repositories.md** - Curated GitHub repos and tech stack
6. **CLAUDE_CODE_README.md** - Main implementation guide for Claude Code
7. **PROJECT_STRUCTURE.md** - Complete directory structure

## 📡 API Endpoints

### Authentication Endpoints
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/me` - Update user profile
- `DELETE /api/auth/me` - Delete account

### Credit Management
- `GET /api/credits/balance` - Get credit balance
- `GET /api/credits/history` - Get transaction history
- `GET /api/credits/purchases` - Get purchase history
- `POST /api/credits/checkout` - Create Stripe checkout session
- `GET /api/credits/pricing` - Get pricing tiers

### API Key Management
- `POST /api/keys` - Create new API key
- `GET /api/keys` - List all API keys
- `GET /api/keys/:keyId` - Get API key details
- `PATCH /api/keys/:keyId` - Update API key
- `DELETE /api/keys/:keyId` - Delete API key
- `POST /api/keys/:keyId/revoke` - Revoke API key
- `GET /api/keys/:keyId/stats` - Get key usage stats

### Scraping Endpoints
- `GET /api/scrape/tiktok/profile?username=:username` - Scrape TikTok profile ✅
- `GET /api/scrape/instagram/profile?username=:username` - Coming soon 🔄
- `GET /api/scrape/youtube/channel?channel_id=:id` - Coming soon 🔄
- `GET /api/scrape/stats` - Get scraping statistics

### Example Request

```bash
curl -X GET "http://localhost:3000/api/scrape/tiktok/profile?username=charlidamelio" \
  -H "x-api-key: rsk_your_api_key_here"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "user_id": "123456789",
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
    "proxy_used": true
  }
}
```

## 🚀 Getting Started with Claude Code

1. **Read the Documentation**: Start with `docs/EXECUTIVE_SUMMARY.md`
2. **Review Claude Instructions**: Read `claude.md` for project guidelines
3. **Load Sub-Agents**: Import all agent configurations from `.claude/agents/`
4. **Follow the Workflow**: Use `docs/CLAUDE_CODE_README.md` for the 8-phase implementation plan
5. **Deploy**: Follow the deployment guide in `docs/business_and_deployment.md`

## 🎯 Development Principles

- **Modularity**: Write modular, reusable code
- **Clarity**: Clear, well-documented code with meaningful names
- **Testing**: High test coverage with unit and integration tests
- **Security**: Follow security best practices
- **User Experience**: Prioritize smooth and intuitive UX

## 📈 Success Metrics

| Metric | Target |
|--------|--------|
| Monthly Revenue | $5,000 within 6 months |
| Profit Margin | 80% |
| API Success Rate | > 98% |
| Average Response Time | < 4 seconds |
| Customer Acquisition Cost | < $50 |
| Free to Paid Conversion | > 10% |

## 🔗 Resources

- **Original Business**: [ScrapeCreators.com](https://scrapecreators.com/)
- **Founder Interview**: [YouTube Video](https://www.youtube.com/watch?v=4BsxnGRbF4k)
- **Claude Code Docs**: [Official Documentation](https://docs.claude.com/en/docs/claude-code/sub-agents)

## 📝 License

This project is proprietary and confidential.

## 🤝 Contributing

This project is built and maintained by Claude Code agents. For questions or support, please refer to the documentation in the `/docs` directory.

---

**Built with Claude Code** 🤖

