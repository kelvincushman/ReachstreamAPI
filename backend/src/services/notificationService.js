/**
 * Notification Service
 * Multi-channel alert notifications: Email, Telegram, Slack
 */

const axios = require('axios');
const winston = require('winston');
const { PublishCommand } = require('@aws-sdk/client-sns');
const { sns } = require('../config/aws');

/**
 * Send Telegram notification
 */
const sendTelegramNotification = async (message, severity = 'info') => {
  try {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      winston.warn('Telegram credentials not configured');
      return;
    }

    // Format message with severity emoji
    const emojiMap = {
      critical: '🚨',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
    };

    const emoji = emojiMap[severity] || 'ℹ️';
    const formattedMessage = `${emoji} **ReachstreamAPI Alert**\n\n${message}\n\n_${new Date().toLocaleString()}_`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: formattedMessage,
      parse_mode: 'Markdown',
    });

    winston.info('Telegram notification sent successfully');
  } catch (error) {
    winston.error('Failed to send Telegram notification:', error.message);
  }
};

/**
 * Send email notification via AWS SNS
 */
const sendEmailNotification = async (subject, message, severity = 'info') => {
  try {
    const SNS_TOPIC_ARN = process.env.SNS_ALERT_TOPIC_ARN;

    if (!SNS_TOPIC_ARN) {
      winston.warn('SNS topic ARN not configured');
      return;
    }

    const formattedMessage = `
ReachstreamAPI Alert - ${severity.toUpperCase()}

${subject}

${message}

---
Timestamp: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
Service: ReachstreamAPI
    `.trim();

    const params = {
      Subject: `[${severity.toUpperCase()}] ${subject}`,
      Message: formattedMessage,
      TopicArn: SNS_TOPIC_ARN,
    };

    await sns.send(new PublishCommand(params));
    winston.info('Email notification sent via SNS');
  } catch (error) {
    winston.error('Failed to send email notification:', error.message);
  }
};

/**
 * Send Slack notification
 */
const sendSlackNotification = async (message, severity = 'info') => {
  try {
    const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

    if (!SLACK_WEBHOOK_URL) {
      winston.warn('Slack webhook URL not configured');
      return;
    }

    // Color coding by severity
    const colorMap = {
      critical: '#DC2626',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      success: '#10B981',
    };

    const payload = {
      text: 'ReachstreamAPI Alert',
      attachments: [
        {
          color: colorMap[severity] || '#3B82F6',
          fields: [
            {
              title: 'Message',
              value: message,
              short: false,
            },
            {
              title: 'Severity',
              value: severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true,
            },
          ],
        },
      ],
    };

    await axios.post(SLACK_WEBHOOK_URL, payload);
    winston.info('Slack notification sent successfully');
  } catch (error) {
    winston.error('Failed to send Slack notification:', error.message);
  }
};

/**
 * Send notification to all configured channels
 */
const sendMultiChannelAlert = async (subject, message, severity = 'warning') => {
  await Promise.allSettled([
    sendTelegramNotification(`**${subject}**\n\n${message}`, severity),
    sendEmailNotification(subject, message, severity),
    sendSlackNotification(`${subject}\n\n${message}`, severity),
  ]);
};

/**
 * Alert: High error rate detected
 */
const alertHighErrorRate = async (errorCount, timeWindow) => {
  const subject = 'High Error Rate Detected';
  const message = `
⚠️ **High Error Rate Alert**

The API is experiencing an elevated error rate.

**Details:**
- Error Count: ${errorCount} errors
- Time Window: ${timeWindow} minutes
- Threshold Exceeded: Yes

**Action Required:**
Check logs and investigate immediately.

**Quick Links:**
- CloudWatch Logs: [View Logs](#)
- Sentry Dashboard: [View Errors](#)
  `.trim();

  await sendMultiChannelAlert(subject, message, 'warning');
};

/**
 * Alert: Service degradation
 */
const alertServiceDegradation = async (service, details) => {
  const subject = `Service Degradation: ${service}`;
  const message = `
⚠️ **Service Degradation Alert**

The ${service} service is experiencing performance issues.

**Details:**
${details}

**Action Required:**
Investigate service health and dependencies.
  `.trim();

  await sendMultiChannelAlert(subject, message, 'warning');
};

/**
 * Alert: Service down
 */
const alertServiceDown = async (service, error) => {
  const subject = `CRITICAL: ${service} Service Down`;
  const message = `
🚨 **CRITICAL ALERT - Service Down**

The ${service} service is not responding.

**Error:**
${error}

**Impact:**
High - API functionality may be affected

**Action Required:**
Immediate investigation and remediation required.
  `.trim();

  await sendMultiChannelAlert(subject, message, 'critical');
};

/**
 * Alert: Credit balance low
 */
const alertLowCreditBalance = async (userId, email, balance) => {
  const subject = 'Low Credit Balance Warning';
  const message = `
ℹ️ **Low Credit Balance**

User ${email} (${userId}) has a low credit balance.

**Current Balance:** ${balance} credits

**Recommended Action:**
User should purchase more credits to continue using the API.
  `.trim();

  // Send only email for this (not critical enough for Telegram/Slack)
  await sendEmailNotification(subject, message, 'info');
};

/**
 * Alert: Payment failed
 */
const alertPaymentFailed = async (userId, email, amount, error) => {
  const subject = 'Payment Processing Failed';
  const message = `
❌ **Payment Failed**

Payment processing failed for user ${email} (${userId}).

**Amount:** $${amount}
**Error:** ${error}

**Action Required:**
User may need to update payment method.
  `.trim();

  await sendEmailNotification(subject, message, 'warning');
};

/**
 * Notification: Service restored
 */
const notifyServiceRestored = async (service) => {
  const subject = `Service Restored: ${service}`;
  const message = `
✅ **Service Restored**

The ${service} service has been restored and is operating normally.

**Status:** Healthy
**Timestamp:** ${new Date().toISOString()}
  `.trim();

  await sendMultiChannelAlert(subject, message, 'success');
};

/**
 * Notification: System healthy
 */
const notifySystemHealthy = async () => {
  const subject = 'All Systems Operational';
  const message = `
✅ **All Systems Healthy**

All services are operating normally.

**Uptime:** 99.9%
**Status:** All checks passing
  `.trim();

  await sendTelegramNotification(message, 'success');
};

/**
 * Daily health report
 */
const sendDailyHealthReport = async (stats) => {
  const subject = 'Daily Health Report';
  const message = `
📊 **Daily Health Report**

**API Performance:**
- Total Requests: ${stats.totalRequests}
- Success Rate: ${stats.successRate}%
- Average Response Time: ${stats.avgResponseTime}ms

**Uptime:**
- Uptime: ${stats.uptime}%
- Incidents: ${stats.incidents}

**Top Endpoints:**
${stats.topEndpoints.map(e => `- ${e.name}: ${e.count} requests`).join('\n')}

**Credits:**
- Credits Purchased: ${stats.creditsPurchased}
- Credits Used: ${stats.creditsUsed}

All systems operating normally.
  `.trim();

  await sendEmailNotification(subject, message, 'info');
};

module.exports = {
  sendTelegramNotification,
  sendEmailNotification,
  sendSlackNotification,
  sendMultiChannelAlert,
  alertHighErrorRate,
  alertServiceDegradation,
  alertServiceDown,
  alertLowCreditBalance,
  alertPaymentFailed,
  notifyServiceRestored,
  notifySystemHealthy,
  sendDailyHealthReport,
};
