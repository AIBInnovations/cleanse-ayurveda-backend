# Running the Project

## Installation

### Initial Setup
```bash
cd "e:/AIB/Cleanse Ayurveda/microservices"
pnpm install
```

This installs all dependencies for all services and shared packages.

### When to Run Install

**Run at root** when:
- Initial project setup
- Adding/updating dependencies in shared packages
- Adding/updating dependencies in multiple services
- After pulling changes that modify package.json files

**Run in specific service** when:
- Adding dependency only to that service
- Quick iteration on single service

```bash
pnpm --filter auth-service add express-rate-limit
pnpm --filter catalog-service add stripe
```

## Running Services

### Run Single Service

```bash
# Gateway Service (port 3000)
pnpm --filter gateway-service start
pnpm --filter gateway-service dev

# Auth Service (port 3001)
pnpm --filter auth-service start
pnpm --filter auth-service dev

# Catalog Service (port 3002)
pnpm --filter catalog-service start
pnpm --filter catalog-service dev

# Order Service (port 3003)
pnpm --filter order-service start
pnpm --filter order-service dev

# Pricing Service (port 3004)
pnpm --filter pricing-service start
pnpm --filter pricing-service dev

# Inventory Service (port 3005)
pnpm --filter inventory-service start
pnpm --filter inventory-service dev
```

### Run All Services

```bash
# Production mode
pnpm -r --parallel start

# Development mode
pnpm -r --parallel dev
```

### Run Specific Scripts

```bash
# Seed data
pnpm --filter auth-service seed
pnpm --filter catalog-service seed

# Run tests
pnpm --filter catalog-service test
```

## Environment Variables

Environment loading follows this cascade:
1. Root `.env` loads first (common variables)
2. Service-specific `.env` loads second (overrides root)

### Root .env Location
`e:/AIB/Cleanse Ayurveda/microservices/.env`

Contains: MongoDB, JWT, Firebase, Cloudinary, Initial Admin credentials

### Service .env Location
- `e:/AIB/Cleanse Ayurveda/microservices/services/auth/.env`
- `e:/AIB/Cleanse Ayurveda/microservices/services/catalog/.env`

Contains: PORT only (service-specific)

## Health Check Endpoints

```bash
# Gateway Health (shows status of all services)
curl http://localhost:3000/api/health

# Individual Services (through gateway)
curl http://localhost:3000/api/auth/health
curl http://localhost:3000/api/catalog/health
curl http://localhost:3000/api/orders/health
curl http://localhost:3000/api/pricing/health
curl http://localhost:3000/api/inventory/health

# Direct Service Access (without gateway)
curl http://localhost:3001/api/health  # Auth
curl http://localhost:3002/api/health  # Catalog
curl http://localhost:3003/api/health  # Order
curl http://localhost:3004/api/health  # Pricing
curl http://localhost:3005/api/health  # Inventory
```

## Troubleshooting

### Import Errors
Always use `@shared/*` imports for shared packages:
```javascript
import { sendResponse } from "@shared/utils";
import { database } from "@shared/config";
import { storageService } from "@shared/providers";
import { validate } from "@shared/middlewares";
```

### Environment Not Loading
Ensure you run commands from project root or service directory. The env-loader detects location automatically.

### Port Conflicts
Check service .env files for PORT configuration. Default ports:
- Gateway: 3000
- Auth: 3001
- Catalog: 3002
- Order: 3003
- Pricing: 3004
- Inventory: 3005
