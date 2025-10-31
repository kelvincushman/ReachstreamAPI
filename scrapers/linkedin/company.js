/**
 * LinkedIn Company Page Scraper
 * Fetches company information from LinkedIn
 */

const { gotScraping } = require('got-scraping');
require('dotenv').config();

const OXYLABS_USERNAME = process.env.OXYLABS_USERNAME;
const OXYLABS_PASSWORD = process.env.OXYLABS_PASSWORD;
const OXYLABS_HOST = process.env.OXYLABS_HOST || 'pr.oxylabs.io';
const OXYLABS_PORT = process.env.OXYLABS_PORT || 7777;

const getProxyUrl = () => {
  return `http://${OXYLABS_USERNAME}:${OXYLABS_PASSWORD}@${OXYLABS_HOST}:${OXYLABS_PORT}`;
};

/**
 * Extract company data from LinkedIn HTML
 */
const extractCompanyData = (html, companyId) => {
  try {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">({.+?})<\/script>/);

    if (!jsonLdMatch) {
      throw new Error('Could not find company data in HTML');
    }

    const data = JSON.parse(jsonLdMatch[1]);

    // Extract from meta tags
    const getMetaContent = (property) => {
      const match = html.match(new RegExp(`<meta property="${property}" content="([^"]+)"`));
      return match ? match[1] : null;
    };

    const name = data.name || getMetaContent('og:title');
    const description = data.description || getMetaContent('og:description');
    const image = data.image || getMetaContent('og:image');

    // Extract follower count
    const followerMatch = html.match(/(\d{1,3}(?:,\d{3})*|\d+)\s+followers?/i);
    const followerCount = followerMatch ? parseInt(followerMatch[1].replace(/,/g, ''), 10) : 0;

    // Extract employee count
    const employeeMatch = html.match(/(\d{1,3}(?:,\d{3})*|\d+(?:-\d+)?)\s+employees?/i);
    const employeeCount = employeeMatch ? employeeMatch[1] : null;

    // Extract industry
    const industryMatch = html.match(/<div[^>]*>([^<]+)<\/div>.*?industry/i);
    const industry = industryMatch ? industryMatch[1].trim() : null;

    return {
      success: true,
      data: {
        company_id: companyId,
        name,
        description,
        logo_url: image,
        follower_count: followerCount,
        employee_count: employeeCount,
        industry,
        company_url: `https://www.linkedin.com/company/${companyId}`,
        scraped_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Failed to extract company data: ${error.message}`);
  }
};

/**
 * Scrape LinkedIn company page
 */
const scrapeCompany = async (companyId) => {
  const startTime = Date.now();

  try {
    if (!companyId || typeof companyId !== 'string') {
      throw new Error('Invalid company ID provided');
    }

    const cleanCompanyId = companyId.replace(/^\//, '').replace(/\/$/, '');
    const url = `https://www.linkedin.com/company/${cleanCompanyId}`;

    console.log(`Scraping LinkedIn company: ${url}`);

    const response = await gotScraping({
      url,
      proxyUrl: getProxyUrl(),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: { request: 30000 },
      retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
    });

    if (response.statusCode !== 200) {
      throw new Error(`LinkedIn returned status ${response.statusCode}`);
    }

    const companyData = extractCompanyData(response.body, cleanCompanyId);
    const responseTime = Date.now() - startTime;

    return {
      ...companyData,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('LinkedIn company scraping error:', error.message);

    return {
      success: false,
      error: error.message,
      metadata: {
        response_time_ms: responseTime,
        proxy_used: true,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

/**
 * Lambda handler
 */
const handler = async (event) => {
  try {
    const companyId = event.queryStringParameters?.company_id || event.company_id;

    if (!companyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameter: company_id',
          example: 'company_id=microsoft',
        }),
      };
    }

    const result = await scrapeCompany(companyId);

    return {
      statusCode: result.success ? 200 : 500,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

module.exports = { scrapeCompany, handler };
