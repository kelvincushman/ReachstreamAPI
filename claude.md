# Claude Code Instructions for ReachstreamAPI

## Project Overview

**ReachstreamAPI** is a real-time social media scraping API platform built with Node.js, AWS serverless infrastructure, and modern web technologies. The goal is to create a profitable SaaS business that provides developers with simple, reliable access to public social media data through a pay-as-you-go API.

This project is modeled after [ScrapeCreators.com](https://scrapecreators.com/), which generates $20,000/month with an 80% profit margin.

## Core Principles

- **Modularity**: Write code in a modular and reusable way. Create small, focused components and functions.
- **Clarity**: Write clear, concise, and well-documented code. Use meaningful variable and function names.
- **Testing**: Write unit and integration tests for all new features. Aim for high test coverage (>80%).
- **Security**: Follow security best practices to protect user data, API keys, and prevent vulnerabilities.
- **Performance**: Optimize for speed and scalability. Target <4s API response times and 98%+ success rates.
- **User Experience**: Prioritize a smooth and intuitive experience for developers using the API.

## Development Workflow

1. **Understand the Task**: Before writing any code, fully understand the requirements from the PRD (`docs/prd.md`).
2. **Create a Plan**: Break down the task into smaller, manageable steps.
3. **Write the Code**: Implement the feature following the project's coding standards and architecture.
4. **Write Tests**: Create comprehensive unit and integration tests for the new code.
5. **Code Review**: Use the `code-quality-agent` to review code for quality, security, and best practices.
6. **Update Documentation**: Update the project documentation, including API docs and technical specifications.
7. **Commit Changes**: Use the `git-expert` agent to commit changes with clear, descriptive commit messages.

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **HTTP Client**: impit (for scraping)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: JWT + API Keys

### Infrastructure
- **Cloud Provider**: AWS
- **Compute**: AWS Fargate (backend), AWS Lambda (scrapers)
- **API Gateway**: Amazon API Gateway
- **Database**: Supabase (managed PostgreSQL)
- **Storage**: AWS S3
- **CDN**: AWS CloudFront
- **IaC**: AWS CDK (TypeScript)

### Frontend
- **Marketing Site**: Astro
- **Dashboard**: React + Tailwind CSS
- **Hosting**: AWS Amplify

### DevOps
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Monitoring**: AWS CloudWatch
- **Payment Processing**: Stripe

## Agent-Specific Instructions

### `infra-agent`
- **Role**: Provision and manage all AWS infrastructure using AWS CDK
- **Focus**: Scalability, security, cost optimization
- **Responsibilities**:
  - Create and deploy AWS CDK stacks
  - Configure VPC, Fargate, Lambda, API Gateway, Amplify
  - Set up CloudWatch monitoring and alarms
  - Implement proper IAM roles and policies
  - Optimize for cost and performance

### `backend-agent`
- **Role**: Develop Node.js backend services (Auth, Billing, API)
- **Focus**: Clean architecture, RESTful API design, database integration
- **Responsibilities**:
  - Implement authentication and API key management
  - Build credit-based billing system with Stripe integration
  - Create API endpoints for scraper orchestration
  - Write database queries and ORM code
  - Implement comprehensive error handling and logging

### `scraper-agent`
- **Role**: Build robust scraper functions for each social media platform
- **Focus**: Reliability, proxy rotation, data extraction accuracy
- **Responsibilities**:
  - Implement scrapers using the `impit` library
  - Configure proxy rotation to avoid blocking
  - Parse and structure data into clean JSON
  - Handle rate limits and anti-scraping measures
  - Deploy scrapers as AWS Lambda functions

### `frontend-agent`
- **Role**: Build marketing website and developer dashboard
- **Focus**: User experience, responsive design, performance
- **Responsibilities**:
  - Create Astro-based marketing website
  - Build React dashboard for account management
  - Implement responsive design with Tailwind CSS
  - Integrate with backend API for authentication and data
  - Optimize for page load speed and SEO

### `db-agent`
- **Role**: Manage Supabase PostgreSQL database
- **Focus**: Schema design, data integrity, performance optimization
- **Responsibilities**:
  - Design and create database schema
  - Write SQL migration scripts
  - Implement row-level security policies
  - Create indexes for query optimization
  - Manage database backups and recovery

### `doc-agent`
- **Role**: Create and maintain comprehensive API documentation
- **Focus**: Clarity, completeness, developer experience
- **Responsibilities**:
  - Document all API endpoints with examples
  - Write getting started guides and tutorials
  - Create code examples in multiple languages
  - Set up interactive API explorer
  - Keep documentation up-to-date with API changes

### `qa-engineer`
- **Role**: Ensure quality through comprehensive testing
- **Focus**: Test coverage, bug detection, quality assurance
- **Responsibilities**:
  - Create and execute test plans for new features
  - Write unit tests for all functions and components
  - Write integration tests for API endpoints
  - Perform manual testing for critical user flows
  - Report bugs clearly and work with engineers to resolve them
  - Maintain test coverage above 80%

### `code-quality-agent`
- **Role**: Enforce code quality standards and best practices
- **Focus**: Code reviews, security, performance, maintainability
- **Responsibilities**:
  - Review all code changes for quality and adherence to standards
  - Identify security vulnerabilities and suggest fixes
  - Ensure proper error handling and logging
  - Check for performance issues and optimization opportunities
  - Verify that code is well-documented and follows naming conventions
  - Ensure test coverage is adequate

### `git-expert`
- **Role**: Manage all Git operations and version control
- **Focus**: Clean commit history, proper branching, collaboration
- **Responsibilities**:
  - Create feature branches for new development
  - Write clear, descriptive commit messages
  - Manage pull requests and code merges
  - Resolve merge conflicts
  - Maintain a clean and organized Git history

## Coding Standards

### JavaScript/Node.js
- Use ES6+ syntax (async/await, arrow functions, destructuring)
- Follow Airbnb JavaScript Style Guide
- Use meaningful variable and function names
- Keep functions small and focused (single responsibility)
- Use `const` by default, `let` when reassignment is needed
- Avoid `var`

### API Design
- Follow RESTful principles
- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Use appropriate status codes (200, 201, 400, 401, 404, 500)
- Return consistent JSON responses
- Include error messages with helpful context
- Version the API (e.g., `/v1/...`)

### Testing
- Write tests for all new code
- Use Jest for unit and integration testing
- Aim for >80% code coverage
- Test both success and error cases
- Mock external dependencies

### Security
- Never commit API keys, secrets, or credentials
- Use environment variables for configuration
- Validate and sanitize all user input
- Use parameterized queries to prevent SQL injection
- Implement rate limiting to prevent abuse
- Use HTTPS for all communication

### Documentation
- Document all functions with JSDoc comments
- Include parameter types and return values
- Provide usage examples for complex functions
- Keep README files up-to-date
- Document API endpoints with OpenAPI/Swagger

## File Organization

### Backend Services
```
backend/src/services/
├── auth/           # Authentication and API key management
├── billing/        # Credit-based billing and Stripe integration
└── api/            # Main API orchestration
```

### Scraper Functions
```
scrapers/
├── tiktok/         # TikTok scrapers (profile, feed, hashtag)
├── instagram/      # Instagram scrapers
├── youtube/        # YouTube scrapers
└── shared/         # Shared utilities (proxy rotation, etc.)
```

### Frontend
```
frontend/
├── marketing/      # Astro marketing website
└── dashboard/      # React developer dashboard
```

## Environment Variables

All sensitive configuration should be stored in environment variables:

```bash
# Database
SUPABASE_URL=
SUPABASE_KEY=

# AWS
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=

# Proxies
EVOMI_PROXY_URL=
WEBSHARE_PROXY_URL=

# Application
API_BASE_URL=
FRONTEND_URL=
JWT_SECRET=
```

## Quality Checklist

Before committing code, ensure:

- [ ] Code follows the project's coding standards
- [ ] All functions have JSDoc comments
- [ ] Unit tests are written and passing
- [ ] Integration tests are written (if applicable)
- [ ] Code has been reviewed by `code-quality-agent`
- [ ] No security vulnerabilities introduced
- [ ] No API keys or secrets in code
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate
- [ ] Documentation is updated

## Getting Help

- **Architecture Questions**: Consult `docs/architecture_and_agents.md`
- **Requirements**: Refer to `docs/prd.md`
- **Implementation Guide**: See `docs/CLAUDE_CODE_README.md`
- **GitHub Repos**: Check `docs/github_repositories.md` for reference implementations

## Success Metrics

Track these metrics to ensure project success:

- **API Success Rate**: >98%
- **Average Response Time**: <4 seconds
- **Test Coverage**: >80%
- **Code Quality Score**: A or higher
- **Security Vulnerabilities**: 0 critical, 0 high
- **Documentation Coverage**: 100% of public APIs

---

**Remember**: Quality over speed. Take time to write clean, tested, and well-documented code. The goal is to build a reliable, maintainable, and profitable SaaS platform.

