# Creating New Services

## Automated Creation (Recommended)

```bash
cd "e:/AIB/Cleanse Ayurveda/microservices"
python scripts/create-service.py <service-name> <port>

# Example
python scripts/create-service.py order 3003
```

Then run:
```bash
pnpm install
pnpm --filter order-service dev
```

## Manual Creation

### 1. Create Directory Structure

```
services/<service-name>/
├── index.js
├── index.route.js
├── package.json
├── .env
├── config/
│   └── express.config.js
├── models/
├── src/
└── scripts/
```

### 2. Create package.json

```json
{
  "name": "<service-name>-service",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "@shared/config": "workspace:*",
    "@shared/utils": "workspace:*",
    "@shared/providers": "workspace:*",
    "@shared/middlewares": "workspace:*",
    "@shared/cloudinary": "workspace:*",
    "@shared/env-loader": "workspace:*"
  },
  "devDependencies": {
    "nodemon": "^3.1.11"
  }
}
```

### 3. Create .env

```bash
# Service-specific configuration
PORT=<port-number>
```

### 4. Create index.js

```javascript
import "@shared/env-loader";
import { database as connectDB } from "@shared/config";
import createApp from "./config/express.config.js";

const PORT = process.env.PORT || <port>;

async function startServer() {
  console.log("> Starting server...");
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`> Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("> Failed to start server:", error);
  process.exit(1);
});
```

### 5. Create config/express.config.js

```javascript
import express from "express";
import cors from "cors";
import routes from "../index.route.js";

export default function createApp() {
  const app = express();

  console.log("> Middleware configured");

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  console.log("> Routes initialized");
  app.use("/api", routes);

  return app;
}
```

### 6. Create index.route.js

```javascript
import { Router } from "express";
import { sendResponse } from "@shared/utils";

const router = Router();

router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

// Add your routes here

export default router;
```

### 7. Install and Run

```bash
cd "e:/AIB/Cleanse Ayurveda/microservices"
pnpm install
pnpm --filter <service-name>-service dev
```

## Port Allocation

Reserve ports to avoid conflicts:
- 3000: Gateway Service
- 3001: Auth Service
- 3002: Catalog Service
- 3003: Order Service
- 3004: Pricing Service
- 3005: Inventory Service
- 3006+: New services

## Adding Service Dependencies

### Add to Specific Service
```bash
pnpm --filter <service-name>-service add <package-name>
```

### Common Dependencies Already Included
All services have access to:
- @shared/config (database, firebase, cloudinary configs)
- @shared/utils (sendResponse, HTTP_STATUS)
- @shared/providers (storageService, cloudinary provider)
- @shared/middlewares (validate, upload)
- @shared/cloudinary (upload routes)
- @shared/env-loader (automatic env loading)

## Service-Specific vs Shared Code

**Keep in Service:**
- Business logic controllers
- Service-specific models/schemas
- Service-specific routes
- Service-specific validation rules
- Service-specific middleware (if not reusable)

**Move to Shared:**
- Database connection logic
- Authentication/authorization middleware (if used by multiple services)
- Response formatting utilities
- File upload handling
- Common constants (HTTP status codes)
- Third-party service configurations (Firebase, Cloudinary, etc)
