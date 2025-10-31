/**
 * ReachstreamAPI AWS CDK Stack
 * Provisions Lambda functions, Fargate services, and API Gateway
 */

import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class ReachstreamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function for TikTok scraper
    const tiktokScraper = new lambda.Function(this, 'TikTokProfileScraper', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'profile.handler',
      code: lambda.Code.fromAsset('../scrapers/tiktok'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        OXYLABS_USERNAME: process.env.OXYLABS_USERNAME || '',
        OXYLABS_PASSWORD: process.env.OXYLABS_PASSWORD || '',
        OXYLABS_HOST: 'pr.oxylabs.io',
        OXYLABS_PORT: '7777',
      },
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'ReachstreamAPI', {
      restApiName: 'ReachstreamAPI',
      description: 'Social media scraping API',
    });

    // TikTok endpoint
    const tiktok = api.root.addResource('tiktok');
    const tiktokProfile = tiktok.addResource('profile');
    tiktokProfile.addMethod('GET', new apigateway.LambdaIntegration(tiktokScraper));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
