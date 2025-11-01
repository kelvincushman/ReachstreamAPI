/**
 * Swagger API Documentation Routes
 * Serves interactive Swagger UI for API documentation
 */

const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load Swagger YAML specification
const swaggerDocument = YAML.load(path.join(__dirname, '../config/swagger.yaml'));

// Swagger UI options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #4F46E5 }
    .swagger-ui .info .description { font-size: 16px; margin-top: 10px; }
    .swagger-ui .opblock-tag { font-size: 18px; }
    .swagger-ui .opblock { margin-bottom: 20px; border-radius: 8px; }
    .swagger-ui .opblock.opblock-get { border-color: #4F46E5; background: rgba(79, 70, 229, 0.05); }
    .swagger-ui .opblock.opblock-get .opblock-summary { border-color: #4F46E5; }
    .swagger-ui .btn.execute { background-color: #4F46E5; border-color: #4F46E5; }
    .swagger-ui .btn.execute:hover { background-color: #4338CA; border-color: #4338CA; }
  `,
  customSiteTitle: 'ReachstreamAPI Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
  },
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Also provide raw JSON endpoint
router.get('/json', (req, res) => {
  res.json(swaggerDocument);
});

module.exports = router;
