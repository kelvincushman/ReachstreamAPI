---
name: express-expert
description: Use for Express.js API development, middleware, routing, and error handling. Invoke when building REST APIs, web servers, or Express applications.
---

# Express.js Expert Skill

## Overview

This skill provides expertise in building production-ready Express.js APIs with proper middleware, routing, error handling, and security best practices.

## Quick Start

### Create a Basic Express Server

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
```

## Core Workflows

### Workflow 1: RESTful API Structure

Organize routes by resource:

```javascript
// src/routes/index.js
import express from 'express';
import userRoutes from './user.routes.js';
import scraperRoutes from './scraper.routes.js';
import billingRoutes from './billing.routes.js';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/scraper', scraperRoutes);
router.use('/billing', billingRoutes);

export default router;

// src/routes/user.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

router.get('/me', authenticate, userController.getCurrentUser);
router.put('/me', authenticate, userController.updateUser);
router.get('/credits', authenticate, userController.getCredits);

export default router;
```

### Workflow 2: Middleware Chain

Create reusable middleware:

```javascript
// src/middleware/auth.js
export const authenticate = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    const user = await userService.findByApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// src/middleware/rateLimit.js
import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// src/middleware/validateRequest.js
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }
    
    next();
  };
};
```

### Workflow 3: Error Handling

Centralized error handling:

```javascript
// src/middleware/errorHandler.js
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production error response
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: err.status,
        message: err.message
      });
    } else {
      // Programming or unknown error
      console.error('ERROR 💥', err);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
      });
    }
  }
};

// Usage in app.js
import { errorHandler } from './middleware/errorHandler.js';

// Routes
app.use('/api', routes);

// 404 handler
app.use((req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

// Global error handler
app.use(errorHandler);
```

### Workflow 4: Request Validation

```javascript
// src/validators/scraper.validator.js
import Joi from 'joi';

export const tiktokProfileSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.alphanum': 'Username must only contain alphanumeric characters',
      'string.min': 'Username must be at least 3 characters',
      'any.required': 'Username is required'
    })
});

// src/controllers/scraper.controller.js
import { AppError } from '../middleware/errorHandler.js';
import { tiktokProfileSchema } from '../validators/scraper.validator.js';

export const scrapeTikTokProfile = async (req, res, next) => {
  try {
    // Validate input
    const { error, value } = tiktokProfileSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }
    
    // Check credits
    if (req.user.credit_balance < 1) {
      throw new AppError('Insufficient credits', 402);
    }
    
    // Invoke Lambda scraper
    const data = await scraperService.scrapeTikTokProfile(value.username);
    
    // Deduct credits
    await billingService.deductCredits(req.user.id, 1);
    
    // Log request
    await analyticsService.logRequest(
      req.user.id,
      'tiktok/profile',
      'tiktok',
      'success',
      Date.now() - req.startTime
    );
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
```

## Best Practices

### Security Middleware

```javascript
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Security headers
app.use(helmet());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

### Request Logging

```javascript
import morgan from 'morgan';
import { createLogger } from './utils/logger.js';

const logger = createLogger();

// Custom token for user ID
morgan.token('user-id', (req) => req.user?.id || 'anonymous');

// Custom format
const morganFormat = ':method :url :status :response-time ms - :user-id';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));
```

### Async Error Handling

```javascript
// src/utils/catchAsync.js
export const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Usage
import { catchAsync } from '../utils/catchAsync.js';

export const getUser = catchAsync(async (req, res, next) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  res.json({ success: true, data: user });
});
```

## Common Patterns

### Pattern 1: Controller-Service Architecture

```javascript
// src/controllers/user.controller.js
import { userService } from '../services/user.service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getCurrentUser = catchAsync(async (req, res) => {
  const user = await userService.findById(req.user.id);
  res.json({ success: true, data: user });
});

// src/services/user.service.js
import { supabase } from '../config/supabase.js';

export class UserService {
  async findById(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  async updateCredits(userId, amount) {
    const { data, error } = await supabase
      .from('users')
      .update({ credit_balance: amount })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

export const userService = new UserService();
```

### Pattern 2: Response Formatting

```javascript
// src/utils/response.js
export class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }
  
  static error(res, message, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }
  
  static paginated(res, data, pagination) {
    return res.json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit)
      }
    });
  }
}

// Usage
import { ApiResponse } from '../utils/response.js';

export const getUsers = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const { users, total } = await userService.getAll(page, limit);
  
  ApiResponse.paginated(res, users, { page, limit, total });
});
```

### Pattern 3: Request Timing

```javascript
// src/middleware/timing.js
export const requestTiming = (req, res, next) => {
  req.startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
  });
  
  next();
};
```

## Testing

```javascript
// test/api.test.js
import request from 'supertest';
import app from '../src/app.js';

describe('User API', () => {
  it('should get current user', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('x-api-key', 'test-api-key')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('email');
  });
  
  it('should return 401 without API key', async () => {
    await request(app)
      .get('/api/users/me')
      .expect(401);
  });
});
```

## Advanced Topics

For advanced patterns like WebSockets, GraphQL integration, and microservices, see [ADVANCED.md](ADVANCED.md).

