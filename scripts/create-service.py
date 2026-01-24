#!/usr/bin/env python3
"""
Create New Microservice

Usage:
  python scripts/create-service.py <service-name> <port>

Example:
  python scripts/create-service.py order 3003
"""

import sys
import os
from pathlib import Path
import json

def create_service(service_name, port):
    """Create new microservice with proper structure"""

    root = Path(__file__).parent.parent
    service_dir = root / "services" / service_name

    if service_dir.exists():
        print(f"Error: Service '{service_name}' already exists")
        sys.exit(1)

    # Create directory structure
    print(f"Creating service: {service_name} on port {port}")

    dirs = [
        service_dir,
        service_dir / "src",
        service_dir / "config",
        service_dir / "models",
        service_dir / "scripts",
    ]

    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        print(f"Created: {d}")

    # Create package.json
    package_json = {
        "name": f"{service_name}-service",
        "version": "1.0.0",
        "description": "",
        "main": "index.js",
        "scripts": {
            "start": "node index.js",
            "dev": "nodemon index.js"
        },
        "keywords": [],
        "author": "",
        "license": "ISC",
        "type": "module",
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

    with open(service_dir / "package.json", "w") as f:
        json.dump(package_json, f, indent=2)
    print(f"Created: package.json")

    # Create .env
    env_content = f"""# 
# {service_name.upper()} SERVICE - Specific Configuration
# Loaded after root .env (can override common variables if needed)
# 

# Server Port ({service_name.title()} Service)
PORT={port}
"""

    with open(service_dir / ".env", "w") as f:
        f.write(env_content)
    print(f"Created: .env")

    # Create index.js
    index_js = f"""import "@shared/env-loader";
import {{ database as connectDB }} from "@shared/config";
import createApp from "./config/express.config.js";

const PORT = process.env.PORT || {port};

async function startServer() {{
  console.log("> Starting server...");

  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {{
    console.log(`> Server running on port ${{PORT}}`);
  }});
}}

startServer().catch((error) => {{
  console.error("> Failed to start server:", error);
  process.exit(1);
}});
"""

    with open(service_dir / "index.js", "w") as f:
        f.write(index_js)
    print(f"Created: index.js")

    # Create express.config.js
    express_config = """import express from "express";
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
"""

    with open(service_dir / "config" / "express.config.js", "w") as f:
        f.write(express_config)
    print(f"Created: config/express.config.js")

    # Create index.route.js
    index_route = """import { Router } from "express";
import { sendResponse } from "@shared/utils";

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get("/health", (req, res) => {
  sendResponse(res, 200, "Server is running", { status: "ok" }, null);
});

// TODO: Add your routes here
// Example:
// import exampleRoutes from "./src/example/example.route.js";
// router.use("/examples", exampleRoutes);

export default router;
"""

    with open(service_dir / "index.route.js", "w") as f:
        f.write(index_route)
    print(f"Created: index.route.js")

    # Create README
    readme = f"""# {service_name.title()} Service

Port: {port}

## Running

```bash
pnpm --filter {service_name}-service start
pnpm --filter {service_name}-service dev
```

## Health Check

```bash
curl http://localhost:{port}/api/health
```
"""

    with open(service_dir / "README.md", "w") as f:
        f.write(readme)
    print(f"Created: README.md")

    print(f"\nService '{service_name}' created successfully!")
    print(f"\nNext steps:")
    print(f"1. cd 'e:/AIB/Cleanse Ayurveda/microservices'")
    print(f"2. pnpm install")
    print(f"3. pnpm --filter {service_name}-service dev")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/create-service.py <service-name> <port>")
        print("Example: python scripts/create-service.py order 3003")
        sys.exit(1)

    service_name = sys.argv[1]
    try:
        port = int(sys.argv[2])
    except ValueError:
        print("Error: Port must be a number")
        sys.exit(1)

    create_service(service_name, port)
