# Project Overview

## Introduction

- Microservices-based e-commerce platform built with Node.js and Express
- Organized as pnpm monorepo with workspace structure
- Uses API Gateway pattern with single entry point on port 3000
- All client requests flow through gateway to backend services

## Architecture

### Monorepo Structure

- Root directory contains shared packages providing common functionality
- Services directory contains independent microservices with own package.json
- Services can be developed, tested, and deployed independently
- Shared code imported via workspace imports for code reuse

### Services

**Gateway Service - Port 3000**
- Single entry point for all client requests
- Handles authentication and request routing
- Implements rate limiting and health monitoring
- Does not parse request bodies, proxies them directly to backends

**Auth Service - Port 3001**
- Consumer authentication via Firebase tokens
- Admin authentication via JWT
- User profile and session management
- Role-based access control
- Audit logging

**Catalog Service - Port 3002**
- Product and variant management
- Categories and brands
- Search functionality with synonyms
- Banners and content highlights

**Order Service - Port 3003**
- Shopping cart management
- Checkout process
- Razorpay payment integration
- Order tracking
- Returns, refunds, and invoice generation

**Inventory Service - Port 3005**
- Stock level tracking
- Inventory reservations
- Purchase order management
- Stock adjustments and movement history
- Low stock alerts

**Pricing Service - Port 3004**
- Pricing rules and product pricing
- Promotional pricing
- Discount and coupon management
- Bundle pricing
- Pricing history tracking

### Shared Packages

**@shared/config**
- MongoDB connection setup
- Firebase Admin SDK initialization
- Cloudinary configuration

**@shared/utils**
- sendResponse function for consistent API responses
- HTTP status code constants

**@shared/providers**
- Storage service abstraction
- Supports Cloudinary and local storage strategies

**@shared/middlewares**
- Joi validation middleware
- Multer file upload middleware
- JWT authentication middleware
- Error handling middleware

**@shared/cloudinary**
- Ready-to-use upload route handlers

**@shared/env-loader**
- Automatic environment variable loading
- Loads root .env then service .env in correct order

## Request Flow

### Client to Gateway

- Client sends all requests to gateway on port 3000
- Gateway applies CORS headers
- Generates or extracts correlation ID for tracing
- Applies rate limiting based on IP address

### Authentication Layer

- Authentication middleware checks if route is public
- Public routes: health checks, login, registration, catalog browsing
- For protected routes: extracts JWT from Authorization header
- Verifies token signature and expiration
- For admin routes: verifies token contains admin user type
- On success: attaches user ID and user type to request
- On failure: returns error without forwarding to backend

### Service Routing

- Gateway maintains mapping of route prefixes to backend service URLs
- /api/auth routes to Auth service
- /api/catalog routes to Catalog service
- /api/orders routes to Order service
- /api/pricing routes to Pricing service
- /api/inventory routes to Inventory service

### Path Rewriting

- Gateway uses http-proxy-middleware for forwarding
- Express strips mount path before passing to proxy
- Example: /api/catalog/products becomes /products
- Proxy prepends /api back: /api/products sent to backend
- Maintains backend service compatibility

### Headers Forwarding

- Gateway forwards correlation ID to backend
- Forwards user ID from JWT token
- Forwards user type from JWT token
- Backend services identify requesting user without handling auth

### Backend Processing

- Backend service logs request with correlation ID
- Applies CORS at service level
- Parses request body (gateway does not parse)
- Performs additional authorization checks if needed
- Executes business logic via controllers
- Queries database using Mongoose models
- Returns response using sendResponse utility

### Response Flow

- Backend sends response to gateway proxy
- Gateway forwards response to client without modification
- Preserves all headers and status codes
- Includes correlation ID in response headers
- If backend unhealthy: gateway returns service unavailable
- If proxy fails: gateway returns bad gateway error

## Service Health Monitoring

- Gateway polls all backend services every 30 seconds
- Sends health check requests to /api/health endpoint
- Tracks health status and failure count per service
- Marks service unhealthy after 3 consecutive failures
- Returns service unavailable for unhealthy service requests
- Exposes comprehensive health status at gateway /api/health endpoint

## Authentication and Authorization

### Consumer Authentication

- Consumers authenticate via Firebase Authentication
- Supports phone with OTP, email/password, social login
- Client receives Firebase ID token
- Client exchanges Firebase token for JWT access token
- JWT used in Authorization header for subsequent requests

### Admin Authentication

- Admins authenticate with email and password
- Credentials stored in MongoDB
- Passwords hashed with bcrypt cost factor 12
- Auth service issues JWT on successful login
- JWT contains user ID, role ID, and user type
- Roles with permissions stored in database
- Role information included in token for quick authorization

### Token Management

- JWT access tokens expire after 7 days
- Refresh tokens expire after 14 days
- Auth service maintains session records
- Sessions can be revoked
- Expired access tokens renewed using refresh token
- Expired refresh tokens require re-authentication

## Database Architecture

- All services share single MongoDB instance
- Each service maintains separate collections
- Provides data consistency with schema independence

### Collection Ownership

**Auth Service**
- users, admins, roles, sessions, audit logs

**Catalog Service**
- products, categories, brands, synonyms, banners, highlights

**Order Service**
- carts, orders, order items, payments, refunds, returns, invoices

**Inventory Service**
- stock levels, reservations, purchase orders, stock movements

**Pricing Service**
- pricing rules, promotions, discounts, coupons

### Cross-Service Data

- Services do not query each other's collections
- Cross-service data handled via API calls
- Minimal data duplication where necessary
- Future: message queue for async communication

## File Storage

- Storage service abstraction with strategy pattern
- Configured via environment variable

**Cloudinary Strategy**
- Uploads to cloud storage
- Returns secure URL and public ID
- Default for production

**Local Strategy**
- Stores on local filesystem
- Returns file path
- Used for development and testing

**Usage**
- All services use shared upload middleware
- Ensures consistent file handling across platform

## Environment Configuration

**Root .env**
- MongoDB connection string
- JWT secrets
- Firebase configuration
- Cloudinary credentials
- Initial admin credentials

**Service .env**
- Contains only PORT variable
- Overrides root values if needed

**Loading Process**
- Env-loader loads root .env first
- Then loads service .env
- Service values override root values

## Service Communication

- Services are independent with no direct HTTP calls
- Gateway is only component calling backend services
- Cross-service data via client multiple requests
- Or minimal data duplication in collections
- Future: message queue for async service-to-service communication

## Error Handling

- All async operations wrapped in try-catch blocks
- Errors logged with correlation IDs for tracing
- Responses use sendResponse utility
- Appropriate HTTP status codes for all errors
- Gateway forwards backend errors to client
- Gateway returns bad gateway on proxy failure
- Gateway returns service unavailable for unhealthy services

## Security

**Gateway Level**
- Enforces authentication except public routes
- Verifies JWT tokens before forwarding
- Rate limiting by IP address
- Only gateway port exposed publicly

**Backend Services**
- Validate all input with Joi schemas
- Validate file uploads for type and size
- Check admin tokens for admin operations
- Never log or expose sensitive data

**General**
- Environment variables for all configuration
- Never hardcode secrets
- .env files excluded from version control
- MongoDB uses authentication
- Services connect with minimal required permissions

## Development Workflow

**Running Services**
- Run individual service: pnpm --filter service-name dev
- Run all services: pnpm -r --parallel dev
- Filter flag for specific service development
- Parallel flag for integration testing

**Dependencies**
- Shared package changes require root reinstall
- Individual service changes require only service restart
- Root install after workspace changes or git pulls

**Health Checks**
- Each service has /api/health endpoint
- Gateway /api/health shows comprehensive system status
- Quick verification that services are running correctly

## Deployment

**Service Deployment**
- Each service deployed independently
- Can be containers or processes
- Backend services scale horizontally based on load

**Gateway Requirements**
- Deploy with high availability
- Single entry point for entire system
- Only public-facing endpoint

**Configuration**
- Environment variables set in deployment environment
- MongoDB secured and backed up regularly
- Cloudinary requires valid API credentials in production

**Networking**
- Service-to-service communication on internal network only
- Backend services not exposed publicly
- Only gateway port accessible from internet
