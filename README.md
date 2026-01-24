# Cleanse Ayurveda Microservices Monorepo

A pnpm workspace monorepo for Cleanse Ayurveda microservices architecture.

## Architecture Overview

This monorepo contains six microservices following a microservices architecture pattern with an API Gateway as the single entry point for client requests.

## Structure

```
microservices/
├── services/
│   ├── gateway/           # API Gateway (Port 3000)
│   ├── auth/              # Authentication Service (Port 3001)
│   ├── catalog/           # Product Catalog Service (Port 3002)
│   ├── order/             # Order Management Service (Port 3003)
│   ├── pricing-promotions/# Pricing & Promotions Service (Port 3004)
│   └── inventory/         # Inventory Management Service (Port 3005)
├── shared/
│   ├── config/            # @shared/config - Database, Firebase, Cloudinary
│   ├── utils/             # @shared/utils - Response utilities
│   ├── providers/         # @shared/providers - Cloudinary provider
│   ├── middlewares/       # @shared/middlewares - Validation, Upload
│   ├── cloudinary/        # @shared/cloudinary - Upload endpoints
│   ├── auth-middleware/   # @shared/auth-middleware - JWT authentication
│   ├── error-handler/     # @shared/error-handler - Error handling
│   ├── circuit-breaker/   # @shared/circuit-breaker - Circuit breaker pattern
│   ├── http-client/       # @shared/http-client - Resilient HTTP client
│   └── env-loader/        # @shared/env-loader - Environment configuration
├── common/
│   └── dev_docs/          # Development documentation
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MongoDB Atlas account
- Firebase Account (for authentication)
- Cloudinary Account (for media management)

## Installation

```bash
# Install pnpm globally (if not already installed)
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Configuration

1. Copy root `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `.env` file with your credentials:
   - MongoDB connection strings
   - JWT secrets
   - Service API keys
   - Firebase configuration
   - Cloudinary credentials
   - Razorpay keys

3. Copy Firebase service account credentials:
```bash
# Place your Firebase service account JSON in:
services/auth/secrets/serviceAccountKey.json
services/catalog/secrets/serviceAccountKey.json
```

## Running Services

### Start All Services
```bash
# Development mode (all services)
pnpm dev:all
```

### Start Individual Services
```bash
# API Gateway
pnpm dev:gateway

# Auth Service
pnpm dev:auth

# Catalog Service
pnpm dev:catalog

# Order Service
pnpm dev:order

# Inventory Service
pnpm dev:inventory

# Pricing Service
pnpm dev:pricing
```

### Production Mode
```bash
# Start all services in production
pnpm start:all

# Or individual services
pnpm start:gateway
pnpm start:auth
pnpm start:catalog
pnpm start:order
pnpm start:inventory
pnpm start:pricing
```

## Seeding Data

```bash
# Seed auth service (roles, initial admin)
pnpm seed:auth

# Seed catalog service (test data)
pnpm seed:catalog
```

## Available Scripts

- `pnpm dev:all` - Start all services in development mode
- `pnpm start:all` - Start all services in production mode
- `pnpm dev:gateway` - Start API Gateway in development mode
- `pnpm dev:auth` - Start auth service in development mode
- `pnpm dev:catalog` - Start catalog service in development mode
- `pnpm dev:order` - Start order service in development mode
- `pnpm dev:inventory` - Start inventory service in development mode
- `pnpm dev:pricing` - Start pricing service in development mode
- `pnpm seed:auth` - Seed auth database
- `pnpm seed:catalog` - Seed catalog database
- `pnpm test:catalog` - Run catalog tests
- `pnpm clean` - Remove all node_modules

## Services

### API Gateway (Port 3000)
Single entry point for all client requests with:
- JWT authentication and authorization
- Request routing to backend services
- Rate limiting (100 requests per 15 minutes)
- Correlation ID generation for distributed tracing
- Health check monitoring of backend services

**Client Access**: All client applications should connect to port 3000 only.

### Auth Service (Port 3001)
Authentication and user management with:
- User registration and login (phone/email/password)
- Admin management
- Role-based access control (RBAC)
- JWT token generation and validation
- Session management
- OTP verification
- Audit logging

### Catalog Service (Port 3002)
Product catalog management with:
- Product catalog (CRUD operations)
- Brands, categories, ingredients management
- Product variants and pricing
- Collections and bundles
- Search functionality with synonyms
- Related products
- Media management via Cloudinary

### Order Service (Port 3003)
Order management system with:
- Cart management
- Order creation and tracking
- Order status updates
- Payment integration with Razorpay
- Invoice generation
- Service integrations (Catalog, Inventory, Pricing, Shipping, Engagement)

### Inventory Service (Port 3005)
Inventory and warehouse management with:
- Stock management
- Warehouse operations
- Stock reservations for carts
- Stock adjustments
- Low stock alerts
- Bulk import/export

### Pricing & Promotions Service (Port 3004)
Dynamic pricing and promotions with:
- Product pricing management
- Discount rules and campaigns
- Coupon management
- Tax calculations
- Price history tracking
- Bulk pricing operations

## Shared Packages

### @shared/config
Database, Firebase, Cloudinary, and Express configuration.

```javascript
import { database, cloudinary, firebase, express } from '@shared/config';
```

### @shared/utils
Common utility functions including response formatting.

```javascript
import { sendResponse } from '@shared/utils';
```

### @shared/providers
Service providers (Cloudinary, etc.).

```javascript
import cloudinary from '@shared/providers';
```

### @shared/middlewares
Common middleware (validation, upload).

```javascript
import { validate, upload } from '@shared/middlewares';
```

### @shared/cloudinary
Cloudinary upload endpoints and utilities.

```javascript
import { route } from '@shared/cloudinary';
```

### @shared/auth-middleware
JWT authentication and authorization middleware.

```javascript
import { authenticateUser, authenticateAdmin, authenticateService } from '@shared/auth-middleware';
```

### @shared/error-handler
Centralized error handling with custom error classes.

```javascript
import { errorHandler, notFoundHandler, requestLogger, AppError, BadRequestError } from '@shared/error-handler';
```

### @shared/circuit-breaker
Circuit breaker pattern implementation for fault tolerance.

```javascript
import { CircuitBreaker, CircuitBreakerManager, circuitBreakerManager } from '@shared/circuit-breaker';
```

### @shared/http-client
Resilient HTTP client with circuit breaker, retry logic, and configurable timeouts.

```javascript
import { ResilientHttpClient, TimeoutConfig } from '@shared/http-client';
```

### @shared/env-loader
Environment variable configuration loader.

```javascript
import { loadEnv } from '@shared/env-loader';
```

## Architecture Patterns

### API Gateway Pattern
All client requests go through the API Gateway on port 3000. The gateway handles authentication, routing, and rate limiting before forwarding requests to backend services.

### Service-to-Service Authentication
Backend services communicate using API keys (X-Service-ID and X-API-Key headers) for mutual authentication.

### Circuit Breaker Pattern
All inter-service HTTP calls use circuit breakers to prevent cascading failures. Circuit opens after 5 consecutive failures and attempts recovery after 60 seconds.

### Retry Logic with Exponential Backoff
Failed requests are automatically retried (max 3 attempts) with exponential backoff (100ms initial, 2x multiplier, 10% jitter) for transient errors.

### Idempotency
Non-GET requests automatically include idempotency keys (X-Idempotency-Key header) to safely retry operations without duplication.

### Distributed Tracing
Correlation IDs (X-Correlation-ID header) propagate through all service calls for request tracing across distributed systems.

### Error Handling
Standardized error responses with consistent format, custom error classes, and comprehensive error logging with sanitization.

### Timeout Configuration
Configurable timeouts per operation type:
- QUICK: 1s (health checks)
- STANDARD: 5s (standard operations)
- COMPLEX: 30s (reports, aggregations)
- LONG_RUNNING: 60s (bulk operations)

## Development

### Adding a New Service

1. Create service directory:
```bash
mkdir -p services/new-service
cd services/new-service
```

2. Create `package.json`:
```json
{
  "name": "new-service",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "dependencies": {
    "@shared/config": "workspace:*",
    "@shared/utils": "workspace:*",
    "@shared/auth-middleware": "workspace:*",
    "@shared/error-handler": "workspace:*",
    "@shared/http-client": "workspace:*",
    "express": "^4.21.2",
    "cors": "^2.8.5"
  }
}
```

3. Create standard structure:
```
new-service/
├── config/
│   └── express.config.js
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middlewares/
│   └── validations/
├── index.js
└── package.json
```

4. Install dependencies:
```bash
cd ../../
pnpm install
```

### Adding a Shared Package

1. Create package directory:
```bash
mkdir -p shared/new-package/src
cd shared/new-package
```

2. Create `package.json`:
```json
{
  "name": "@shared/new-package",
  "version": "1.0.0",
  "main": "src/index.js",
  "type": "module"
}
```

3. Create `src/index.js` with exports

4. Install in services:
```bash
pnpm --filter service-name add @shared/new-package@workspace:*
```

5. Run install to link:
```bash
cd ../../
pnpm install
```

## Environment Variables

Environment variables are loaded from the root `.env` file. Each service can override with service-specific `.env` files if needed.

Critical environment variables:
- `MONGODB_URI_*` - MongoDB connection strings per service
- `JWT_SECRET_ACCESS_TOKEN` - JWT secret for access tokens
- `JWT_SECRET_REFRESH_TOKEN` - JWT secret for refresh tokens
- `SERVICE_API_KEY_*` - API keys for service-to-service authentication
- `FIREBASE_*` - Firebase configuration
- `CLOUDINARY_*` - Cloudinary credentials
- `RAZORPAY_*` - Razorpay payment gateway keys

## Health Checks

All services expose health check endpoints:
- Gateway: `http://localhost:3000/api/health`
- Auth: `http://localhost:3001/api/health`
- Catalog: `http://localhost:3002/api/health`
- Order: `http://localhost:3003/api/health`
- Inventory: `http://localhost:3005/api/health`
- Pricing: `http://localhost:3004/api/health`

## API Documentation

For detailed API documentation of each service, refer to:
- API_DOCUMENTATION.md (comprehensive endpoint documentation)
- PROJECT_ANALYSIS_REPORT.md (architecture and implementation details)

## Monitoring

Services implement structured logging with:
- JSON format for log aggregation
- Correlation IDs for distributed tracing
- Request/response logging
- Error logging with stack traces
- Sensitive data sanitization

## Security

- JWT-based authentication at API Gateway
- Service-to-service authentication with API keys
- Rate limiting to prevent abuse
- Input validation on all endpoints
- Error message sanitization in production
- Secret management via environment variables

## License

Private

## Support

For issues and questions, contact the development team.
