/**
 * Notification Routes
 * Test notification channels and send alerts
 */

const express = require('express');
const router = express.Router();
const {
  sendTelegramNotification,
  sendEmailNotification,
  sendSlackNotification,
  alertHighErrorRate,
  alertServiceDegradation,
  alertServiceDown,
  notifyServiceRestored,
} = require('../services/notificationService');

/**
 * Middleware to verify monitoring access
 */
const verifyMonitoringAccess = (req, res, next) => {
  const monitoringKey = req.headers['x-monitoring-key'];

  if (!monitoringKey || monitoringKey !== process.env.MONITORING_API_KEY) {
    return res.status(403).json({
      error: 'Monitoring access denied',
    });
  }

  next();
};

/**
 * POST /api/notifications/test/telegram
 * Test Telegram notification
 */
router.post('/test/telegram', verifyMonitoringAccess, async (req, res) => {
  try {
    const { message, severity } = req.body;

    await sendTelegramNotification(
      message || 'This is a test notification from ReachstreamAPI monitoring system.',
      severity || 'info'
    );

    res.status(200).json({
      success: true,
      message: 'Telegram notification sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/test/email
 * Test email notification
 */
router.post('/test/email', verifyMonitoringAccess, async (req, res) => {
  try {
    const { subject, message, severity } = req.body;

    await sendEmailNotification(
      subject || 'Test Email Notification',
      message || 'This is a test notification from ReachstreamAPI monitoring system.',
      severity || 'info'
    );

    res.status(200).json({
      success: true,
      message: 'Email notification sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/test/slack
 * Test Slack notification
 */
router.post('/test/slack', verifyMonitoringAccess, async (req, res) => {
  try {
    const { message, severity } = req.body;

    await sendSlackNotification(
      message || 'This is a test notification from ReachstreamAPI monitoring system.',
      severity || 'info'
    );

    res.status(200).json({
      success: true,
      message: 'Slack notification sent successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/alert/high-error-rate
 * Trigger high error rate alert
 */
router.post('/alert/high-error-rate', verifyMonitoringAccess, async (req, res) => {
  try {
    const { errorCount, timeWindow } = req.body;

    await alertHighErrorRate(errorCount || 100, timeWindow || 5);

    res.status(200).json({
      success: true,
      message: 'High error rate alert sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/alert/service-degradation
 * Trigger service degradation alert
 */
router.post('/alert/service-degradation', verifyMonitoringAccess, async (req, res) => {
  try {
    const { service, details } = req.body;

    await alertServiceDegradation(service, details);

    res.status(200).json({
      success: true,
      message: 'Service degradation alert sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/alert/service-down
 * Trigger service down alert
 */
router.post('/alert/service-down', verifyMonitoringAccess, async (req, res) => {
  try {
    const { service, error } = req.body;

    await alertServiceDown(service, error);

    res.status(200).json({
      success: true,
      message: 'Service down alert sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/notify/service-restored
 * Send service restored notification
 */
router.post('/notify/service-restored', verifyMonitoringAccess, async (req, res) => {
  try {
    const { service } = req.body;

    await notifyServiceRestored(service);

    res.status(200).json({
      success: true,
      message: 'Service restored notification sent',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
