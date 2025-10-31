/**
 * Monitoring Service
 * CloudWatch metrics, alarms, and alert notifications
 */

const { CloudWatchClient, PutMetricDataCommand, PutMetricAlarmCommand } = require('@aws-sdk/client-cloudwatch');
const { SNSClient, PublishCommand, CreateTopicCommand, SubscribeCommand } = require('@aws-sdk/client-sns');
const winston = require('winston');

const cloudwatch = new CloudWatchClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sns = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

const NAMESPACE = 'ReachstreamAPI';

/**
 * Send custom metric to CloudWatch
 */
const sendMetric = async (metricName, value, unit = 'Count', dimensions = {}) => {
  try {
    const params = {
      Namespace: NAMESPACE,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: Object.entries(dimensions).map(([key, val]) => ({
            Name: key,
            Value: val,
          })),
        },
      ],
    };

    await cloudwatch.send(new PutMetricDataCommand(params));
    winston.info(`Metric sent: ${metricName} = ${value} ${unit}`);
  } catch (error) {
    winston.error(`Failed to send metric ${metricName}:`, error.message);
  }
};

/**
 * Track API request metrics
 */
const trackApiRequest = async (platform, endpoint, success, responseTime) => {
  await Promise.all([
    sendMetric('ApiRequests', 1, 'Count', { Platform: platform, Endpoint: endpoint }),
    sendMetric('ApiSuccess', success ? 1 : 0, 'Count', { Platform: platform, Endpoint: endpoint }),
    sendMetric('ApiResponseTime', responseTime, 'Milliseconds', { Platform: platform, Endpoint: endpoint }),
  ]);

  if (!success) {
    await sendMetric('ApiErrors', 1, 'Count', { Platform: platform, Endpoint: endpoint });
  }
};

/**
 * Track credit deduction metrics
 */
const trackCreditUsage = async (userId, creditsUsed, remainingBalance) => {
  await Promise.all([
    sendMetric('CreditsDeducted', creditsUsed, 'Count', { UserId: userId }),
    sendMetric('RemainingBalance', remainingBalance, 'Count', { UserId: userId }),
  ]);
};

/**
 * Track scraper performance
 */
const trackScraperPerformance = async (platform, endpoint, duration, dataSize, success) => {
  await Promise.all([
    sendMetric('ScraperDuration', duration, 'Milliseconds', { Platform: platform, Endpoint: endpoint }),
    sendMetric('ScraperDataSize', dataSize, 'Bytes', { Platform: platform, Endpoint: endpoint }),
    sendMetric('ScraperSuccess', success ? 1 : 0, 'Count', { Platform: platform, Endpoint: endpoint }),
  ]);
};

/**
 * Create CloudWatch alarm for API errors
 */
const createApiErrorAlarm = async () => {
  try {
    const params = {
      AlarmName: 'ReachstreamAPI-HighErrorRate',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ApiErrors',
      Namespace: NAMESPACE,
      Period: 300, // 5 minutes
      Statistic: 'Sum',
      Threshold: 50, // More than 50 errors in 5 minutes
      ActionsEnabled: true,
      AlarmDescription: 'Alert when API error rate is too high',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN],
    };

    await cloudwatch.send(new PutMetricAlarmCommand(params));
    winston.info('API error alarm created successfully');
  } catch (error) {
    winston.error('Failed to create API error alarm:', error.message);
  }
};

/**
 * Create CloudWatch alarm for response time
 */
const createResponseTimeAlarm = async () => {
  try {
    const params = {
      AlarmName: 'ReachstreamAPI-SlowResponseTime',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 3,
      MetricName: 'ApiResponseTime',
      Namespace: NAMESPACE,
      Period: 300,
      Statistic: 'Average',
      Threshold: 5000, // Average response time > 5 seconds
      ActionsEnabled: true,
      AlarmDescription: 'Alert when API response time is degraded',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN],
    };

    await cloudwatch.send(new PutMetricAlarmCommand(params));
    winston.info('Response time alarm created successfully');
  } catch (error) {
    winston.error('Failed to create response time alarm:', error.message);
  }
};

/**
 * Create CloudWatch alarm for Lambda errors
 */
const createLambdaErrorAlarm = async (functionName) => {
  try {
    const params = {
      AlarmName: `ReachstreamAPI-${functionName}-Errors`,
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Period: 60,
      Statistic: 'Sum',
      Threshold: 5, // More than 5 errors per minute
      ActionsEnabled: true,
      AlarmDescription: `Alert when ${functionName} Lambda has errors`,
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN],
      Dimensions: [
        {
          Name: 'FunctionName',
          Value: functionName,
        },
      ],
    };

    await cloudwatch.send(new PutMetricAlarmCommand(params));
    winston.info(`Lambda error alarm created for ${functionName}`);
  } catch (error) {
    winston.error(`Failed to create Lambda error alarm for ${functionName}:`, error.message);
  }
};

/**
 * Send alert notification via SNS
 */
const sendAlert = async (subject, message, severity = 'warning') => {
  try {
    const params = {
      Subject: `[${severity.toUpperCase()}] ${subject}`,
      Message: JSON.stringify({
        severity,
        subject,
        message,
        timestamp: new Date().toISOString(),
        service: 'ReachstreamAPI',
      }),
      TopicArn: process.env.SNS_ALERT_TOPIC_ARN,
    };

    await sns.send(new PublishCommand(params));
    winston.info(`Alert sent: ${subject}`);
  } catch (error) {
    winston.error('Failed to send alert:', error.message);
  }
};

/**
 * Create SNS topic for alerts
 */
const createAlertTopic = async () => {
  try {
    const params = {
      Name: 'ReachstreamAPI-Alerts',
      Tags: [
        {
          Key: 'Service',
          Value: 'ReachstreamAPI',
        },
        {
          Key: 'Purpose',
          Value: 'Monitoring',
        },
      ],
    };

    const result = await sns.send(new CreateTopicCommand(params));
    winston.info('SNS alert topic created:', result.TopicArn);
    return result.TopicArn;
  } catch (error) {
    winston.error('Failed to create alert topic:', error.message);
    throw error;
  }
};

/**
 * Subscribe email to alert topic
 */
const subscribeEmailToAlerts = async (email, topicArn) => {
  try {
    const params = {
      Protocol: 'email',
      TopicArn: topicArn,
      Endpoint: email,
    };

    await sns.send(new SubscribeCommand(params));
    winston.info(`Email ${email} subscribed to alerts`);
  } catch (error) {
    winston.error('Failed to subscribe email to alerts:', error.message);
  }
};

/**
 * Subscribe Slack webhook to alert topic
 */
const subscribeSlackToAlerts = async (webhookUrl, topicArn) => {
  try {
    const params = {
      Protocol: 'https',
      TopicArn: topicArn,
      Endpoint: webhookUrl,
    };

    await sns.send(new SubscribeCommand(params));
    winston.info('Slack webhook subscribed to alerts');
  } catch (error) {
    winston.error('Failed to subscribe Slack to alerts:', error.message);
  }
};

/**
 * Initialize all monitoring alarms
 */
const initializeMonitoring = async () => {
  winston.info('Initializing monitoring system...');

  try {
    await Promise.all([
      createApiErrorAlarm(),
      createResponseTimeAlarm(),
    ]);

    winston.info('Monitoring system initialized successfully');
  } catch (error) {
    winston.error('Failed to initialize monitoring:', error.message);
  }
};

/**
 * Track system health metrics
 */
const trackSystemHealth = async (healthCheck) => {
  await Promise.all([
    sendMetric('SystemHealth', healthCheck.status === 'healthy' ? 1 : 0, 'Count'),
    sendMetric('HealthCheckResponseTime', healthCheck.response_time_ms, 'Milliseconds'),
  ]);

  // Track individual dependency health
  for (const [service, check] of Object.entries(healthCheck.checks)) {
    await sendMetric(
      'DependencyHealth',
      check.status === 'healthy' ? 1 : 0,
      'Count',
      { Service: service }
    );
  }
};

module.exports = {
  sendMetric,
  trackApiRequest,
  trackCreditUsage,
  trackScraperPerformance,
  createApiErrorAlarm,
  createResponseTimeAlarm,
  createLambdaErrorAlarm,
  sendAlert,
  createAlertTopic,
  subscribeEmailToAlerts,
  subscribeSlackToAlerts,
  initializeMonitoring,
  trackSystemHealth,
};
