# ReachstreamAPI - Getting Started Guide

🚀 **A complete social media scraping SaaS platform** built with Node.js, Express, React, PostgreSQL, and AWS.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Backend Setup](#backend-setup)
4. [Database Setup](#database-setup)
5. [Frontend Dashboard Setup](#frontend-dashboard-setup)
6. [Running the Application](#running-the-application)
7. [Testing the API](#testing-the-api)
8. [AWS Deployment](#aws-deployment)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

Before starting, ensure you have:

### Required
- **Node.js 18+** and npm
- **PostgreSQL 14+** (local or hosted)
- **Clerk Account** (for authentication) - [clerk.com](https://clerk.com)
- **Stripe Account** (for payments) - [stripe.com](https://stripe.com)
- **Oxylabs Proxy** (for scraping) - Your credentials: `scraping2025_rcOoG`

### Optional (for AWS deployment)
- **AWS Account** with CLI configured
- **AWS Credits** (you have $80k until Jan 2026!)

---

## 📁 Project Structure

```
ReachstreamAPI/
├── backend/                  # Express.js API server
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation, etc.
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── server.js        # Main entry point
│   └── package.json
│
├── scrapers/                 # AWS Lambda scrapers
│   └── tiktok/
│       └── profile.js       # TikTok profile scraper
│
├── frontend/                 # Frontend applications
│   └── dashboard/           # React developer dashboard
│       ├── src/
│       │   ├── components/  # Reusable UI components
│       │   ├── pages/       # Page components
│       │   └── App.jsx      # Main app component
│       └── package.json
│
├── database/                 # Database schemas
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── infrastructure/           # AWS CDK (coming soon)
│
└── docs/                     # Documentation
```

---

## 🔧 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/reachstream
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reachstream
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Clerk Authentication (get from clerk.com)
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Stripe (get from stripe.com)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Oxylabs Proxy
OXYLABS_USERNAME=scraping2025_rcOoG
OXYLABS_PASSWORD=your_oxylabs_password
OXYLABS_HOST=pr.oxylabs.io
OXYLABS_PORT=7777

# Security
JWT_SECRET=your_super_secret_jwt_key_change_this
```

---

## 💾 Database Setup

### Option A: Local PostgreSQL

1. **Install PostgreSQL** (if not already installed):

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (via Homebrew)
brew install postgresql
brew services start postgresql
```

2. **Create Database**:

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE reachstream;
CREATE USER reachstream_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE reachstream TO reachstream_user;
\q
```

3. **Run Migrations**:

```bash
# From the project root
psql -U reachstream_user -d reachstream -f database/migrations/001_initial_schema.sql
```

### Option B: Supabase (Managed PostgreSQL)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy your database URL from Supabase dashboard
3. Update `DATABASE_URL` in your `.env` file
4. Run migrations via Supabase SQL editor or CLI

---

## 🎨 Frontend Dashboard Setup

### 1. Navigate to Dashboard Directory

```bash
cd frontend/dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Clerk (use your publishable key)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# API URL
VITE_API_URL=http://localhost:3000
```

---

## ▶️ Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

Server will start at: **http://localhost:3000**

### Start Frontend Dashboard

```bash
cd frontend/dashboard
npm run dev
```

Dashboard will start at: **http://localhost:5173**

### Verify Everything Works

1. **Check Backend Health**: http://localhost:3000/health
2. **Check API Docs**: http://localhost:3000/api/docs
3. **Open Dashboard**: http://localhost:5173

---

## 🧪 Testing the API

### 1. Sign Up / Login

Go to http://localhost:5173 and sign up with Clerk

### 2. Create an API Key

1. Navigate to "API Keys" in the dashboard
2. Click "Create New Key"
3. Name it (e.g., "Test Key")
4. **Copy the key immediately** (you won't see it again!)

### 3. Test TikTok Scraper

```bash
curl -X GET "http://localhost:3000/api/scrape/tiktok/profile?username=charlidamelio" \
  -H "x-api-key: rsk_your_api_key_here"
```

Expected response:

```json
{
  "success": true,
  "data": {
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

### 4. Check Your Credits

```bash
# Get your Clerk token from the dashboard (dev tools > Application > Local Storage)
curl -X GET "http://localhost:3000/api/credits/balance" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN"
```

---

## ☁️ AWS Deployment

### Deploy to AWS Lambda (Scrapers)

```bash
cd scrapers
npm install

# Package scraper
zip -r tiktok-profile.zip tiktok/

# Deploy to Lambda (requires AWS CLI configured)
aws lambda create-function \
  --function-name reachstream-tiktok-profile \
  --runtime nodejs18.x \
  --handler tiktok/profile.handler \
  --zip-file fileb://tiktok-profile.zip \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role
```

### Deploy Backend to AWS Fargate

Coming soon... (AWS CDK stack in progress)

---

## ⚙️ Configuration

### Clerk Setup

1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Copy your publishable and secret keys
4. Add keys to `.env` files (backend and frontend)
5. Configure allowed redirect URLs:
   - http://localhost:5173 (development)
   - https://yourdomain.com (production)

### Stripe Setup

1. Go to [stripe.com](https://stripe.com) and create an account
2. Get your test API keys from the dashboard
3. Add keys to backend `.env`
4. Set up webhook endpoint:
   - URL: http://localhost:3000/api/credits/webhook (dev)
   - Events: `checkout.session.completed`, `payment_intent.succeeded`
5. Copy webhook secret to `.env`

### Oxylabs Setup

1. You already have credentials: `scraping2025_rcOoG`
2. Add your password to backend `.env`
3. Test connection:

```bash
curl -x pr.oxylabs.io:7777 -U scraping2025_rcOoG:YOUR_PASSWORD https://ip.oxylabs.io
```

---

## 🐛 Troubleshooting

### Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**: Ensure PostgreSQL is running

```bash
# Check status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

### Clerk Authentication Error

```
Error: Invalid Clerk token
```

**Solution**:
- Verify `CLERK_SECRET_KEY` in backend `.env`
- Ensure `VITE_CLERK_PUBLISHABLE_KEY` in frontend `.env`
- Check Clerk dashboard for correct keys

### Stripe Webhook Error

```
Error: No signatures found matching the expected signature
```

**Solution**: Use Stripe CLI for local testing

```bash
# Install Stripe CLI
npm install -g stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/credits/webhook
```

### Oxylabs Proxy Error

```
Error: Proxy authentication required
```

**Solution**: Verify Oxylabs credentials and check your subscription status

---

## 🎉 Next Steps

1. ✅ **Test all endpoints** in the dashboard
2. ✅ **Buy test credits** using Stripe test cards
3. ✅ **Monitor usage** in the Usage tab
4. 📝 **Add more scrapers** (Instagram, YouTube, etc.)
5. 🚀 **Deploy to AWS** using your $80k credits
6. 💰 **Launch and start making money!**

---

## 📚 Additional Resources

- [API Documentation](http://localhost:3000/api/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Oxylabs Docs](https://oxylabs.io/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)

---

## 💬 Support

Need help? Check:
- GitHub Issues
- Documentation in `/docs`
- Backend logs: `backend/logs/`
- Database errors: Check PostgreSQL logs

---

## 🔒 Security Notes

- **Never commit `.env` files** to git
- **Always use HTTPS** in production
- **Rotate API keys** regularly
- **Monitor credit usage** to prevent abuse
- **Enable rate limiting** for production

---

**Built with ❤️ for ReachstreamAPI**

Revenue Goal: $5,000/month within 6 months
Operating Costs: ~$2,400/month
Target Profit Margin: 80%

Let's build something amazing! 🚀
