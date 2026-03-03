const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const buildSwaggerSpec = () => {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'CityConnect API',
        version: '1.0.0',
        description: 'CityConnect backend API documentation',
      },
      servers: [
        {
          url: process.env.API_BASE_URL || 'http://localhost:5000',
          description: 'Current environment',
        },
        {
          url: 'http://localhost:5000',
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Validation failed' },
                  details: { type: 'object', nullable: true },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
              path: { type: 'string', example: '/api/auth/send-otp' },
              requestId: { type: 'string', example: '20ecf1d2-8d0f-4fb0-b870-cf5cf6f39f30' },
            },
          },
        },
      },
    },
    apis: ['./routes/*.js'],
  };

  return swaggerJsdoc(options);
};

const setupSwagger = (app) => {
  const spec = buildSwaggerSpec();

  app.get('/api-docs.json', (_req, res) => {
    res.status(200).json(spec);
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
};

module.exports = {
  buildSwaggerSpec,
  setupSwagger,
};
