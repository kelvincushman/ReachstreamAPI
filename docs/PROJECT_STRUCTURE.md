# CreatorScrape Project Structure

This document outlines the recommended directory structure for the CreatorScrape platform.

## Root Directory Structure

```
creatorscrape/
├── docs/                           # All project documentation
│   ├── prd.md                      # Product Requirements Document
│   ├── architecture_and_agents.md  # Technical architecture
│   ├── business_and_deployment.md  # Business model and deployment guide
│   ├── github_repositories.md      # Repository references
│   └── CLAUDE_CODE_README.md       # Main guide for Claude Code
│
├── claude_agents/                  # Claude Code sub-agent configurations
│   ├── infra-agent.md
│   ├── backend-agent.md
│   ├── scraper-agent.md
│   ├── frontend-agent.md
│   ├── db-agent.md
│   └── doc-agent.md
│
├── infrastructure/                 # AWS CDK infrastructure code
│   ├── bin/
│   │   └── infrastructure.ts       # CDK app entry point
│   ├── lib/
│   │   ├── vpc-stack.ts            # VPC and networking
│   │   ├── fargate-stack.ts        # Backend services on Fargate
│   │   ├── lambda-stack.ts         # Scraper Lambda functions
│   │   ├── api-gateway-stack.ts    # API Gateway configuration
│   │   └── amplify-stack.ts        # Frontend hosting
│   ├── package.json
│   ├── tsconfig.json
│   └── cdk.json
│
├── backend/                        # Node.js backend services
│   ├── src/
│   │   ├── services/
│   │   │   ├── auth/               # Authentication service
│   │   │   │   ├── routes.js
│   │   │   │   ├── controller.js
│   │   │   │   └── middleware.js
│   │   │   ├── billing/            # Billing service
│   │   │   │   ├── routes.js
│   │   │   │   ├── controller.js
│   │   │   │   └── stripe.js
│   │   │   └── api/                # Main API service
│   │   │       ├── routes.js
│   │   │       └── controller.js
│   │   ├── db/
│   │   │   ├── supabase.js         # Supabase client
│   │   │   └── queries.js          # Database queries
│   │   ├── utils/
│   │   │   ├── logger.js
│   │   │   └── errors.js
│   │   └── app.js                  # Express app setup
│   ├── tests/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── scrapers/                       # Lambda scraper functions
│   ├── tiktok/
│   │   ├── profile/
│   │   │   ├── index.js
│   │   │   └── package.json
│   │   ├── feed/
│   │   │   ├── index.js
│   │   │   └── package.json
│   │   └── hashtag/
│   │       ├── index.js
│   │       └── package.json
│   ├── instagram/
│   │   ├── profile/
│   │   └── feed/
│   ├── youtube/
│   │   ├── channel/
│   │   └── videos/
│   └── shared/
│       ├── proxy-rotator.js        # Shared proxy rotation logic
│       └── utils.js
│
├── frontend/                       # Frontend applications
│   ├── marketing/                  # Astro marketing website
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro     # Homepage
│   │   │   │   ├── pricing.astro
│   │   │   │   ├── features.astro
│   │   │   │   └── use-cases.astro
│   │   │   ├── components/
│   │   │   └── layouts/
│   │   ├── public/
│   │   ├── package.json
│   │   └── astro.config.mjs
│   │
│   └── dashboard/                  # React developer dashboard
│       ├── src/
│       │   ├── components/
│       │   │   ├── Auth/
│       │   │   ├── Dashboard/
│       │   │   ├── ApiKeys/
│       │   │   ├── Billing/
│       │   │   └── Settings/
│       │   ├── pages/
│       │   │   ├── Login.jsx
│       │   │   ├── Signup.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   └── Billing.jsx
│       │   ├── services/
│       │   │   └── api.js          # API client
│       │   ├── App.jsx
│       │   └── main.jsx
│       ├── public/
│       └── package.json
│
├── database/                       # Database migrations and seeds
│   ├── migrations/
│   │   ├── 001_create_users.sql
│   │   ├── 002_create_api_keys.sql
│   │   ├── 003_create_credits.sql
│   │   ├── 004_create_credit_purchases.sql
│   │   └── 005_create_api_requests.sql
│   └── seeds/
│       └── initial_data.sql
│
├── api-docs/                       # API documentation website
│   ├── docs/
│   │   ├── getting-started.md
│   │   ├── authentication.md
│   │   ├── endpoints/
│   │   ├── code-examples/
│   │   └── use-cases/
│   ├── package.json
│   └── docusaurus.config.js
│
├── .github/                        # GitHub Actions workflows
│   └── workflows/
│       ├── deploy-backend.yml
│       ├── deploy-scrapers.yml
│       └── deploy-frontend.yml
│
├── .gitignore
├── README.md
└── package.json                    # Root package.json for monorepo
```

## Key Directories Explained

### `/docs`
Contains all project documentation created by Manus AI, including the PRD, architecture, and business model.

### `/claude_agents`
Contains the configuration files for all Claude Code sub-agents. These files define the roles, responsibilities, and system prompts for each agent.

### `/infrastructure`
Contains the AWS CDK code for provisioning all cloud infrastructure. Written in TypeScript.

### `/backend`
Contains the Node.js backend services (Auth, Billing, API). Uses Express.js framework.

### `/scrapers`
Contains all the Lambda scraper functions for each social media platform. Each scraper is a standalone Node.js function.

### `/frontend`
Contains both the marketing website (Astro) and the developer dashboard (React).

### `/database`
Contains SQL migration scripts and seed data for the Supabase PostgreSQL database.

### `/api-docs`
Contains the API documentation website built with Docusaurus or similar tool.

## Development Workflow

1. **Infrastructure First**: Use the `infra-agent` to provision AWS resources.
2. **Database Setup**: Use the `db-agent` to create the database schema.
3. **Backend Development**: Use the `backend-agent` to build the API services.
4. **Scraper Development**: Use the `scraper-agent` to build the scraper functions.
5. **Frontend Development**: Use the `frontend-agent` to build the website and dashboard.
6. **Documentation**: Use the `doc-agent` to create the API documentation.

## Deployment

Each component is deployed independently:
- **Backend**: Docker container to AWS Fargate
- **Scrapers**: Zip files to AWS Lambda
- **Frontend**: Static files to AWS Amplify
- **Database**: Managed by Supabase

## Notes for Claude Code

- This structure is a recommendation. Adjust as needed based on project requirements.
- Use the appropriate sub-agent for each directory/component.
- Maintain clear separation of concerns between components.
- Follow the deployment guide in `business_and_deployment.md`.
