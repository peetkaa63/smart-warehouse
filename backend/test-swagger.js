// Простой тест для проверки Swagger документации
const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Warehouse API Test',
      version: '1.0.0',
      description: 'Тестовая версия API документации'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`📚 Test Swagger server running on port ${PORT}`);
  console.log(`📖 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`📄 JSON Schema: http://localhost:${PORT}/api-docs.json`);
});

