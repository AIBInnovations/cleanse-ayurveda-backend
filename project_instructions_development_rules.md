# Development Rules

## Import Rules

### Always Use @shared for Shared Packages

**Correct:**
```javascript
import { sendResponse, HTTP_STATUS } from "@shared/utils";
import { database, cloudinary, firebaseAdmin } from "@shared/config";
import { storageService } from "@shared/providers";
import { validate, uploadAny } from "@shared/middlewares";
import { route as uploadRoutes } from "@shared/cloudinary";
```

**Incorrect:**
```javascript
import { sendResponse } from "../../utils/response.utils.js";
import database from "../config/database.config.js";
```

### Use Relative Imports for Service-Specific Code

```javascript
import User from "./models/user.model.js";
import { createUser } from "./src/auth/auth.controller.js";
import routes from "./index.route.js";
```

## File Organization

### Controllers
Location: `services/<service>/src/<feature>/<feature>.controller.js`

Pattern:
```javascript
import { sendResponse, HTTP_STATUS } from "@shared/utils";
import Model from "../../models/model.js";

export const getItems = async (req, res) => {
  try {
    const items = await Model.find();
    return sendResponse(res, HTTP_STATUS.OK, "Success", items, null);
  } catch (error) {
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Error", null, error.message);
  }
};
```

### Routes
Location: `services/<service>/src/<feature>/<feature>.route.js`

Pattern:
```javascript
import { Router } from "express";
import { getItems, createItem } from "./<feature>.controller.js";
import { validate } from "@shared/middlewares";
import { createSchema } from "./<feature>.validation.js";

const router = Router();

router.get("/", getItems);
router.post("/", validate(createSchema), createItem);

export default router;
```

Register in `index.route.js`:
```javascript
import featureRoutes from "./src/feature/feature.route.js";
router.use("/features", featureRoutes);
```

### Models/Schemas
Location: `services/<service>/models/` or `services/<service>/schema/`

Use Mongoose for MongoDB:
```javascript
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("ModelName", schema);
```

### Validation
Location: `services/<service>/src/<feature>/<feature>.validation.js`

Use Joi:
```javascript
import Joi from "joi";

export const createSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required()
});

export const updateSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email()
}).min(1);
```

## Configuration Rules

### Never Modify Shared Configs in Services
Shared configs are read-only from service perspective. If you need service-specific config, create it in the service's `config/` directory.

### Express Config is Service-Specific
Each service has its own `config/express.config.js` because it imports service-specific routes. Never move this to shared.

### Environment Variables
- Add common variables to root `.env`
- Add service-specific variables to service `.env`
- Never hardcode secrets or URLs
- Always use `process.env.VARIABLE_NAME`

## Installation Rules

### Adding Dependencies

**To Single Service:**
```bash
pnpm --filter <service-name>-service add <package>
```

**To Shared Package:**
```bash
cd shared/<package-name>
pnpm add <package>
cd ../..
pnpm install
```

**To Multiple Services/Packages:**
```bash
cd "e:/AIB/Cleanse Ayurveda/microservices"
pnpm install
```

### When Dependencies Change
Always run `pnpm install` at root after:
- Adding/removing packages in shared packages
- Adding/removing workspace dependencies
- Pulling changes from git
- Modifying any package.json

## Code Quality Rules

### Error Handling
Always wrap async operations in try-catch:
```javascript
export const handler = async (req, res) => {
  try {
    // logic
    return sendResponse(res, HTTP_STATUS.OK, "Success", data, null);
  } catch (error) {
    console.error("Error:", error);
    return sendResponse(res, HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed", null, error.message);
  }
};
```

### Response Format
Always use `sendResponse` utility:
```javascript
// Success
sendResponse(res, 200, "Success message", data, null);

// Error
sendResponse(res, 400, "Error message", null, errorDetails);
```

### Validation
Always validate input using Joi middleware:
```javascript
router.post("/", validate(createSchema), createHandler);
router.put("/:id", validate(updateSchema), updateHandler);
```

### Logging
Use console.log with prefixes for clarity:
```javascript
console.log("> Operation started");
console.error("> Operation failed:", error);
```

## Service Communication

### API Gateway Pattern
All client requests go through the Gateway Service on port 3000. Clients never call backend services directly.

The gateway handles authentication and routes requests to appropriate backend services based on URL prefix.

### Direct Database Access
Services share MongoDB instance. Each service manages its own collections.

### Future: Use Message Queue
For service-to-service communication, plan to use message queue (RabbitMQ/Redis) rather than direct HTTP calls.

### Avoid Circular Dependencies
Service A should not depend on Service B's business logic. Use events/messages instead.

## Gateway-Specific Rules

### Gateway Does Not Parse Bodies
The gateway must not use express.json() or express.urlencoded() middleware. Body parsing consumes the request stream and prevents proxying POST/PUT/PATCH requests to backend services.

### Path Rewriting
The gateway uses http-proxy-middleware which receives paths after Express strips the mount point. The pathRewrite function must prepend /api to maintain backend service compatibility.

Example: Client requests /api/catalog/products, Express mounts proxy at /api/catalog and passes /products, proxy prepends /api to create /api/products for backend.

### Public Routes
Public routes are defined in gateway constants file. These routes bypass authentication. When adding new public endpoints, update the PUBLIC_ROUTES array in services/gateway/utils/constants.js.

### User Context Forwarding
The gateway forwards user information via HTTP headers to backend services. Backend services receive x-user-id, x-user-type, and x-correlation-id headers for request processing and logging.

## Git Workflow

### Before Committing
1. Test service individually: `pnpm --filter <service> dev`
2. Test all services: `pnpm -r --parallel dev`
3. Check health endpoints
4. Verify no import errors

### Don't Commit
- `.env` files (use `.env.example` for documentation)
- `node_modules/`
- Service logs
- Secrets or credentials

## Testing

### Test Endpoints
Every service must have `/api/health` endpoint:
```javascript
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});
```

### Manual Testing
```bash
curl http://localhost:<port>/api/health
curl -X POST http://localhost:<port>/api/resource -H "Content-Type: application/json" -d '{"key":"value"}'
```

## Security Rules

### Never Expose
- Database credentials in code
- API keys in code
- JWT secrets in code
- Firebase service account keys in code

### Always Validate
- User input via Joi schemas
- File uploads (type, size)
- Authentication tokens
- Request parameters

### Use Middleware
- Authentication middleware for protected routes
- Validation middleware for all POST/PUT/PATCH
- Rate limiting (to be added)
- CORS properly configured
