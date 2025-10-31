# ReachstreamAPI Monitoring & Alerting System

Comprehensive guide for setting up and using the 99.9% uptime monitoring system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup Guide](#setup-guide)
- [Health Check Endpoints](#health-check-endpoints)
- [CloudWatch Monitoring](#cloudwatch-monitoring)
- [Alert Notifications](#alert-notifications)
- [Status Pages](#status-pages)
- [Troubleshooting](#troubleshooting)

## Overview

ReachstreamAPI includes an enterprise-grade monitoring and alerting system designed to achieve 99.9% uptime SLA. The system provides:

- **Real-time health monitoring** of all services and dependencies
- **Multi-channel alerting** via Telegram, Email, and Slack
- **CloudWatch integration** for metrics and automated alarms
- **Error tracking** with Sentry for detailed debugging
- **Public status page** for transparency
- **Admin monitoring dashboard** for operations team

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ReachstreamAPI System                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Database   │  │    Clerk     │  │   Stripe     │      │
│  │  PostgreSQL  │  │     Auth     │  │   Payment    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                  ┌─────────▼─────────┐                       │
│                  │  Health Check     │                       │
│                  │     Service       │                       │
│                  └─────────┬─────────┘                       │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │  CloudWatch  │  │    Sentry    │  │Notifications │     │
│  │   Metrics    │  │Error Tracking│  │   Service    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
         ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
         │  Telegram   │ │  Email  │ │  Slack  │
         │    Bot      │ │   SNS   │ │Webhook  │
         └─────────────┘ └─────────┘ └─────────┘
```

## Setup Guide

### 1. AWS CloudWatch Setup

#### Create SNS Topic for Alerts

```bash
aws sns create-topic \
  --name ReachstreamAPI-Alerts \
  --region us-east-1

# Output: arn:aws:sns:us-east-1:123456789:ReachstreamAPI-Alerts
```

#### Subscribe Email to SNS Topic

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:ReachstreamAPI-Alerts \
  --protocol email \
  --notification-endpoint alerts@yourdomain.com
```

**Note:** Check your email and confirm the subscription.

#### Set IAM Permissions

Ensure your AWS IAM role/user has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DescribeAlarms"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:Subscribe",
        "sns:CreateTopic"
      ],
      "Resource": "arn:aws:sns:us-east-1:123456789:ReachstreamAPI-Alerts"
    }
  ]
}
```

### 2. Sentry Error Tracking Setup

#### Create Sentry Project

1. Go to [sentry.io](https://sentry.io) and create account
2. Create new project → Select "Node.js"
3. Copy the DSN (looks like: `https://xxx@o123.ingest.sentry.io/456`)

#### Configure Sentry

Add to `.env`:

```bash
SENTRY_DSN=https://your_dsn@sentry.io/project_id
```

### 3. Telegram Bot Setup

#### Create Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow prompts to create bot
4. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### Get Chat ID

1. Add your bot to a Telegram group or channel
2. Send a message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat.id` in the response

#### Configure Telegram

Add to `.env`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
```

### 4. Slack Webhook Setup

#### Create Slack Incoming Webhook

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Create new app → From scratch
3. Go to "Incoming Webhooks" → Activate
4. Click "Add New Webhook to Workspace"
5. Select channel for alerts
6. Copy webhook URL (looks like: `https://hooks.slack.com/services/XXX/YYY/ZZZ`)

#### Configure Slack

Add to `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
```

### 5. Monitoring API Key

Generate a secure monitoring API key for admin dashboard access:

```bash
# Generate random key
openssl rand -hex 32
```

Add to `.env`:

```bash
MONITORING_API_KEY=your_generated_key_here
```

### 6. Complete Environment Configuration

Your `.env` should include:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SNS_ALERT_TOPIC_ARN=arn:aws:sns:us-east-1:xxx:ReachstreamAPI-Alerts

# Sentry
SENTRY_DSN=https://xxx@sentry.io/123

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ

# Monitoring
MONITORING_API_KEY=your_secure_key_here
ALERT_EMAIL=alerts@yourdomain.com
```

### 7. Initialize Monitoring System

In your `server.js`, add:

```javascript
const { initSentry, requestHandler, tracingHandler, errorHandler } = require('./config/sentry');
const { initializeMonitoring } = require('./services/monitoringService');
const healthRoutes = require('./routes/health');
const notificationRoutes = require('./routes/notifications');

// Initialize Sentry (before other middleware)
initSentry(app);
app.use(requestHandler());
app.use(tracingHandler());

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/notifications', notificationRoutes);

// Sentry error handler (after routes, before other error handlers)
app.use(errorHandler());

// Initialize CloudWatch monitoring
initializeMonitoring().catch(err => {
  console.error('Failed to initialize monitoring:', err);
});
```

## Health Check Endpoints

### Basic Health Check

**Endpoint:** `GET /api/health`

Fast endpoint for load balancers and uptime monitors.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime_seconds": 86400
}
```

**Status Codes:**
- `200` - Healthy
- `503` - Degraded or Unhealthy

### Detailed Health Check

**Endpoint:** `GET /api/health/detailed`

**Headers:**
```
X-Monitoring-Key: your_monitoring_api_key
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "response_time_ms": 150,
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 12,
      "message": "Database connection successful"
    },
    "clerk": {
      "status": "healthy",
      "response_time_ms": 89,
      "message": "Clerk service operational"
    },
    "stripe": {
      "status": "healthy",
      "response_time_ms": 105,
      "message": "Stripe service operational"
    },
    "oxylabs": {
      "status": "healthy",
      "response_time_ms": 1250,
      "message": "Oxylabs proxy operational"
    },
    "system": {
      "status": "healthy",
      "memory": {
        "total_mb": "16384.00",
        "used_mb": "8192.00",
        "free_mb": "8192.00",
        "usage_percent": "50.00"
      },
      "cpu": {
        "load_1min": "1.50",
        "load_5min": "1.25",
        "load_15min": "1.10",
        "cores": 8
      },
      "uptime_hours": "24.00"
    }
  }
}
```

### Public Health Summary

**Endpoint:** `GET /api/health/summary`

**Response:**
```json
{
  "status": "healthy",
  "uptime_percent": 99.9,
  "response_time_avg_ms": 150,
  "last_incident": null,
  "last_check": "2024-01-15T10:30:00.000Z"
}
```

### Scraper Health Check

**Endpoint:** `GET /api/health/scraper/:platform/:endpoint`

**Example:** `GET /api/health/scraper/tiktok/profile`

**Response:**
```json
{
  "status": "healthy",
  "response_time_ms": 5,
  "message": "tiktok/profile scraper loaded successfully"
}
```

## CloudWatch Monitoring

### Custom Metrics

The system automatically sends these metrics to CloudWatch:

| Metric Name | Description | Unit | Dimensions |
|------------|-------------|------|-----------|
| `ApiRequests` | Total API requests | Count | Platform, Endpoint |
| `ApiSuccess` | Successful requests | Count | Platform, Endpoint |
| `ApiErrors` | Failed requests | Count | Platform, Endpoint |
| `ApiResponseTime` | Response latency | Milliseconds | Platform, Endpoint |
| `CreditsDeducted` | Credits used | Count | UserId |
| `RemainingBalance` | Credit balance | Count | UserId |
| `ScraperDuration` | Scraper execution time | Milliseconds | Platform, Endpoint |
| `ScraperDataSize` | Response size | Bytes | Platform, Endpoint |
| `SystemHealth` | Overall health status | Count | - |
| `DependencyHealth` | Service health | Count | Service |

### Automated Alarms

#### High Error Rate Alarm

Triggers when more than 50 errors occur in 5 minutes.

**Actions:**
- Sends alert to SNS topic
- Notifies via Telegram, Email, Slack

**Resolution:**
- Check CloudWatch Logs
- Review Sentry errors
- Investigate affected endpoints

#### Slow Response Time Alarm

Triggers when average response time exceeds 5 seconds for 15 minutes.

**Actions:**
- Sends degradation warning
- Monitors for further degradation

**Resolution:**
- Check system resources
- Review database performance
- Investigate proxy issues

#### Lambda Error Alarm

Triggers when Lambda function has more than 5 errors per minute.

**Actions:**
- Sends critical alert
- Flags function for investigation

**Resolution:**
- Check Lambda logs
- Review function configuration
- Investigate cold starts

### Viewing Metrics

#### AWS Console

1. Go to CloudWatch Console
2. Select "Metrics" → "All metrics"
3. Find "ReachstreamAPI" namespace
4. Select metrics to visualize

#### CLI

```bash
# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace ReachstreamAPI \
  --metric-name ApiRequests \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Alert Notifications

### Alert Severity Levels

| Level | Description | Channels | Response Time |
|-------|-------------|----------|---------------|
| `critical` | Service down, immediate action required | All | < 5 minutes |
| `error` | Significant error, investigate soon | Email, Telegram | < 30 minutes |
| `warning` | Potential issue, monitor situation | Email | < 2 hours |
| `info` | Informational update | Email | Next business day |
| `success` | Issue resolved, restoration confirmed | All | N/A |

### Pre-configured Alerts

#### High Error Rate Alert

```javascript
await alertHighErrorRate(100, 5);
```

**Telegram Message:**
```
⚠️ **High Error Rate Alert**

The API is experiencing an elevated error rate.

Details:
- Error Count: 100 errors
- Time Window: 5 minutes
- Threshold Exceeded: Yes

Action Required:
Check logs and investigate immediately.
```

#### Service Down Alert

```javascript
await alertServiceDown('Database', 'Connection timeout after 30s');
```

**Telegram Message:**
```
🚨 **CRITICAL ALERT - Service Down**

The Database service is not responding.

Error:
Connection timeout after 30s

Impact:
High - API functionality may be affected

Action Required:
Immediate investigation and remediation required.
```

#### Service Restored Notification

```javascript
await notifyServiceRestored('Database');
```

**Telegram Message:**
```
✅ **Service Restored**

The Database service has been restored and is operating normally.

Status: Healthy
Timestamp: 2024-01-15T10:30:00.000Z
```

### Testing Notifications

Use the admin monitoring dashboard or API endpoints:

#### Test Telegram

```bash
curl -X POST http://localhost:3000/api/notifications/test/telegram \
  -H "X-Monitoring-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "severity": "info"
  }'
```

#### Test Email

```bash
curl -X POST http://localhost:3000/api/notifications/test/email \
  -H "X-Monitoring-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Email",
    "message": "Test notification",
    "severity": "info"
  }'
```

#### Test Slack

```bash
curl -X POST http://localhost:3000/api/notifications/test/slack \
  -H "X-Monitoring-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "severity": "info"
  }'
```

## Status Pages

### Public Status Page

**Location:** `frontend/status-page/index.html`

**Features:**
- Real-time system status
- 30-day uptime percentage
- Average response time
- Service health indicators
- Recent incidents timeline
- Auto-refresh every 60 seconds

**Deployment:**

```bash
# Deploy to S3 + CloudFront
aws s3 sync frontend/status-page s3://status.reachstream.com
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

**Access:** `https://status.reachstream.com`

### Admin Monitoring Dashboard

**Location:** `frontend/monitoring/index.html`

**Features:**
- Secure key-based authentication
- Real-time system metrics
- Service health visualization
- Resource usage monitoring
- API performance metrics
- One-click notification testing
- Auto-refresh every 30 seconds

**Deployment:**

```bash
# Deploy to secure admin subdomain
aws s3 sync frontend/monitoring s3://monitoring.reachstream.com
```

**Access:** `https://monitoring.reachstream.com`

## Troubleshooting

### Health Check Returns Unhealthy

1. **Check detailed health endpoint:**
   ```bash
   curl -H "X-Monitoring-Key: your_key" \
     http://localhost:3000/api/health/detailed
   ```

2. **Identify failing service** in response

3. **Review service-specific logs:**
   - Database: Check PostgreSQL logs
   - Clerk: Verify API key validity
   - Stripe: Check Stripe dashboard
   - Oxylabs: Test proxy manually

### Notifications Not Sending

1. **Verify environment variables:**
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $SLACK_WEBHOOK_URL
   echo $SNS_ALERT_TOPIC_ARN
   ```

2. **Test individual channels:**
   - Use test endpoints in monitoring dashboard
   - Check bot permissions (Telegram)
   - Verify webhook URL (Slack)
   - Confirm SNS subscription (Email)

3. **Check application logs:**
   ```bash
   tail -f logs/app.log | grep -i notification
   ```

### CloudWatch Metrics Not Appearing

1. **Verify AWS credentials:**
   ```bash
   aws sts get-caller-identity
   ```

2. **Check IAM permissions:**
   - CloudWatch:PutMetricData
   - CloudWatch:PutMetricAlarm

3. **Review application logs:**
   ```bash
   tail -f logs/app.log | grep -i cloudwatch
   ```

4. **Manual metric test:**
   ```javascript
   const { sendMetric } = require('./services/monitoringService');
   await sendMetric('TestMetric', 1, 'Count');
   ```

### Sentry Errors Not Tracking

1. **Verify DSN configuration:**
   ```bash
   echo $SENTRY_DSN
   ```

2. **Check Sentry project settings:**
   - Go to Sentry dashboard
   - Verify project is active
   - Check rate limits

3. **Test error capture:**
   ```javascript
   const { captureException } = require('./config/sentry');
   captureException(new Error('Test error'));
   ```

### High False Positive Alarms

1. **Adjust alarm thresholds** in `monitoringService.js`:
   ```javascript
   Threshold: 50, // Increase to reduce sensitivity
   EvaluationPeriods: 3, // Increase to require sustained issues
   ```

2. **Configure alarm suppression:**
   ```bash
   aws cloudwatch disable-alarm-actions \
     --alarm-names ReachstreamAPI-HighErrorRate
   ```

3. **Review alarm history:**
   ```bash
   aws cloudwatch describe-alarm-history \
     --alarm-name ReachstreamAPI-HighErrorRate
   ```

## Best Practices

1. **Test monitoring regularly:**
   - Run monthly notification tests
   - Simulate failure scenarios
   - Verify alarm triggers

2. **Review metrics weekly:**
   - Check CloudWatch dashboards
   - Analyze error patterns
   - Monitor uptime trends

3. **Maintain alert channels:**
   - Update contact information
   - Rotate access keys
   - Test escalation procedures

4. **Document incidents:**
   - Record all outages
   - Perform post-mortems
   - Update runbooks

5. **Monitor monitoring:**
   - Set up dead man's switch
   - Verify health checks run
   - Track alert delivery

## Support

For monitoring system issues:

1. **Check this guide first**
2. **Review application logs**
3. **Consult CloudWatch/Sentry dashboards**
4. **Contact DevOps team**

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Maintainer:** ReachstreamAPI Team
