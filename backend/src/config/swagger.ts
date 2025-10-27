import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Warehouse API',
      version: '1.0.0',
      description: 'API для системы управления умным складом с роботами и ИИ',
      contact: {
        name: 'Smart Warehouse Team',
        email: 'support@smartwarehouse.ru',
        url: 'https://smartwarehouse.ru'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.smartwarehouse.ru',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT токен авторизации'
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API ключ для роботов'
        }
      },
      schemas: {
        // Общие схемы
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Ошибка валидации данных'
                },
                messageRu: {
                  type: 'string',
                  example: 'Ошибка валидации данных'
                },
                statusCode: {
                  type: 'integer',
                  example: 400
                },
                severity: {
                  type: 'string',
                  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
                  example: 'LOW'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T10:30:00.000Z'
                },
                requestId: {
                  type: 'string',
                  example: 'req_123456789'
                },
                details: {
                  type: 'object',
                  description: 'Дополнительные детали ошибки'
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              description: 'Данные ответа'
            },
            message: {
              type: 'string',
              example: 'Операция выполнена успешно'
            }
          }
        },
        // Схемы для аутентификации
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@smartwarehouse.ru',
              description: 'Email пользователя'
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'SecurePass123!',
              description: 'Пароль пользователя'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              description: 'JWT токен авторизации'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@smartwarehouse.ru'
            },
            name: {
              type: 'string',
              example: 'Администратор'
            },
            role: {
              type: 'string',
              enum: ['admin', 'operator', 'viewer'],
              example: 'admin'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z'
            }
          }
        },
        // Схемы для роботов
        Robot: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'RB-001',
              description: 'Уникальный ID робота'
            },
            status: {
              type: 'string',
              enum: ['active', 'charging', 'offline', 'maintenance'],
              example: 'active',
              description: 'Статус робота'
            },
            battery_level: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              example: 85,
              description: 'Уровень заряда батареи в процентах'
            },
            current_zone: {
              type: 'string',
              pattern: '^[A-E]$',
              example: 'A',
              description: 'Текущая зона склада'
            },
            current_row: {
              type: 'integer',
              minimum: 1,
              maximum: 20,
              example: 5,
              description: 'Текущий ряд'
            },
            current_shelf: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              example: 3,
              description: 'Текущая полка'
            },
            last_update: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z',
              description: 'Время последнего обновления'
            }
          }
        },
        RobotData: {
          type: 'object',
          required: ['robot_id', 'status', 'battery_level'],
          properties: {
            robot_id: {
              type: 'string',
              example: 'RB-001',
              description: 'ID робота'
            },
            status: {
              type: 'string',
              enum: ['active', 'charging', 'offline', 'maintenance'],
              example: 'active'
            },
            battery_level: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 85
            },
            location: {
              type: 'object',
              properties: {
                zone: {
                  type: 'string',
                  pattern: '^[A-E]$',
                  example: 'A'
                },
                row: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 20,
                  example: 5
                },
                shelf: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 10,
                  example: 3
                }
              }
            },
            scan_results: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/ScanResult'
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        ScanResult: {
          type: 'object',
          properties: {
            product_id: {
              type: 'string',
              example: 'TEL-4567',
              description: 'ID товара'
            },
            product_name: {
              type: 'string',
              example: 'Роутер RT-AC68U',
              description: 'Название товара'
            },
            quantity: {
              type: 'integer',
              minimum: 0,
              example: 25,
              description: 'Количество товара'
            },
            status: {
              type: 'string',
              enum: ['OK', 'LOW_STOCK', 'CRITICAL'],
              example: 'OK',
              description: 'Статус запасов'
            }
          }
        },
        // Схемы для dashboard
        DashboardData: {
          type: 'object',
          properties: {
            robots: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Robot'
              }
            },
            recentScans: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/RecentScan'
              }
            },
            statistics: {
              $ref: '#/components/schemas/DashboardStats'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        },
        RecentScan: {
          type: 'object',
          properties: {
            time: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            },
            robot_id: {
              type: 'string',
              example: 'RB-001'
            },
            zone: {
              type: 'string',
              example: 'A'
            },
            product_name: {
              type: 'string',
              example: 'Роутер RT-AC68U'
            },
            product_id: {
              type: 'string',
              example: 'TEL-4567'
            },
            quantity: {
              type: 'integer',
              example: 25
            },
            status: {
              type: 'string',
              enum: ['OK', 'LOW_STOCK', 'CRITICAL'],
              example: 'OK'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            activeRobots: {
              type: 'integer',
              example: 3,
              description: 'Количество активных роботов'
            },
            totalRobots: {
              type: 'integer',
              example: 5,
              description: 'Общее количество роботов'
            },
            scannedToday: {
              type: 'integer',
              example: 150,
              description: 'Количество сканирований сегодня'
            },
            criticalStock: {
              type: 'integer',
              example: 2,
              description: 'Количество товаров с критическим уровнем запасов'
            },
            avgBattery: {
              type: 'integer',
              example: 78,
              description: 'Средний уровень заряда батареи'
            }
          }
        },
        // Схемы для WebSocket
        WebSocketMessage: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              example: 'dashboard_update',
              description: 'Тип сообщения'
            },
            data: {
              type: 'object',
              description: 'Данные сообщения'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T10:30:00.000Z'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Ошибка авторизации',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Unauthorized',
                  messageRu: 'Необходима авторизация',
                  statusCode: 401,
                  severity: 'MEDIUM',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_123456789'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Доступ запрещен',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Forbidden',
                  messageRu: 'Доступ запрещен',
                  statusCode: 403,
                  severity: 'MEDIUM',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_123456789'
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Ошибка валидации',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  messageRu: 'Ошибка валидации данных',
                  statusCode: 400,
                  severity: 'LOW',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_123456789',
                  details: {
                    validationErrors: [
                      {
                        field: 'email',
                        message: 'Некорректный формат email адреса',
                        value: 'invalid-email'
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'Ресурс не найден',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  messageRu: 'Ресурс не найден',
                  statusCode: 404,
                  severity: 'LOW',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_123456789'
                }
              }
            }
          }
        },
        InternalServerError: {
          description: 'Внутренняя ошибка сервера',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: 'Internal server error',
                  messageRu: 'Внутренняя ошибка сервера',
                  statusCode: 500,
                  severity: 'CRITICAL',
                  timestamp: '2024-01-15T10:30:00.000Z',
                  requestId: 'req_123456789'
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Аутентификация и авторизация пользователей'
      },
      {
        name: 'Dashboard',
        description: 'Данные для главной панели управления'
      },
      {
        name: 'Robots',
        description: 'Управление роботами и получение данных от них'
      },
      {
        name: 'Inventory',
        description: 'Управление инвентаризацией и товарами'
      },
      {
        name: 'Analytics',
        description: 'Аналитика и отчеты'
      },
      {
        name: 'WebSocket',
        description: 'WebSocket события для реального времени'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/sockets/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1976d2; }
      .swagger-ui .scheme-container { background: #f5f5f5; padding: 10px; border-radius: 4px; }
    `,
    customSiteTitle: 'Smart Warehouse API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    }
  }));

  // JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger документация доступна по адресу: http://localhost:3000/api-docs');
};

export default specs;

