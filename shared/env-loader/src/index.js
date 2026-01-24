import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadEnv(serviceName = null) {
  const loaded = {
    root: false,
    service: false,
    vars: {}
  };

  const monorepoRoot = resolve(__dirname, '../../..');
  const rootEnvPath = resolve(monorepoRoot, '.env');
  
  let serviceEnvPath = null;
  if (serviceName) {
    serviceEnvPath = resolve(monorepoRoot, 'services', serviceName, '.env');
  } else {
    const cwd = process.cwd();
    const possibleServiceEnv = resolve(cwd, '.env');
    if (existsSync(possibleServiceEnv) && (cwd.includes('/services/') || cwd.includes('\\services\\'))) {
      serviceEnvPath = possibleServiceEnv;
    }
  }

  if (existsSync(rootEnvPath)) {
    const result = dotenv.config({ path: rootEnvPath });
    if (!result.error) {
      loaded.root = true;
      loaded.vars = { ...loaded.vars, ...result.parsed };
      const count = Object.keys(result.parsed || {}).length;
      console.log('> Root .env loaded (' + count + ' variables)');
    }
  }

  if (serviceEnvPath && existsSync(serviceEnvPath)) {
    const result = dotenv.config({ path: serviceEnvPath, override: true });
    if (!result.error) {
      loaded.service = true;
      loaded.vars = { ...loaded.vars, ...result.parsed };
      const count = Object.keys(result.parsed || {}).length;
      console.log('> Service .env loaded (' + count + ' variables)');
    }
  }

  return loaded;
}

export function validateEnv(requiredVars = []) {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error('Missing required environment variables: ' + missing.join(', '));
  }
  
  console.log('> All required environment variables present');
}

export function getEnv(key, defaultValue = undefined) {
  return process.env[key] || defaultValue;
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment() {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

loadEnv();

export default {
  loadEnv,
  validateEnv,
  getEnv,
  isProduction,
  isDevelopment
};
