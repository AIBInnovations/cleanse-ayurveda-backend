/**
 * Service Manager Utility
 * Manages microservice lifecycle - checking health, starting services
 */

import { spawn } from 'child_process';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ServiceManager {
  constructor(services) {
    this.services = services;
    this.processes = new Map();
    this.healthStatus = new Map();
  }

  /**
   * Check if a service is healthy
   * @param {string} serviceName - Service name
   * @param {number} port - Service port
   * @param {number} timeout - Timeout in ms
   * @returns {Promise<object>} Health status
   */
  async checkHealth(serviceName, port, timeout = 5000) {
    const healthUrl = `http://localhost:${port}/api/health`;
    const startTime = Date.now();

    try {
      const response = await axios.get(healthUrl, {
        timeout,
        validateStatus: () => true
      });

      const duration = Date.now() - startTime;
      const isHealthy = response.status === 200;

      return {
        serviceName,
        port,
        isHealthy,
        status: response.status,
        duration,
        error: null
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        serviceName,
        port,
        isHealthy: false,
        status: 0,
        duration,
        error: error.code === 'ECONNREFUSED' ? 'Service not running' : error.message
      };
    }
  }

  /**
   * Check health of all services
   * @returns {Promise<object>} Health status for all services
   */
  async checkAllServices() {
    console.log('\n🏥 Checking service health...\n');

    const healthChecks = Object.entries(this.services).map(([key, service]) =>
      this.checkHealth(service.name, service.port)
    );

    const results = await Promise.all(healthChecks);

    // Store results
    results.forEach(result => {
      this.healthStatus.set(result.serviceName, result);
    });

    // Print results
    results.forEach(result => {
      const status = result.isHealthy ? '✓' : '✗';
      const symbol = result.isHealthy ? '🟢' : '🔴';
      console.log(`${symbol} ${status} ${result.serviceName} (${result.port}): ${result.isHealthy ? `${result.duration}ms` : result.error}`);
    });

    const allHealthy = results.every(r => r.isHealthy);
    const unhealthyServices = results.filter(r => !r.isHealthy);

    console.log(`\n${allHealthy ? '✅ All services healthy' : `⚠️  ${unhealthyServices.length} service(s) unhealthy`}\n`);

    return {
      allHealthy,
      results,
      unhealthyServices
    };
  }

  /**
   * Start a service
   * @param {string} serviceKey - Service key from config
   * @param {object} service - Service config
   * @returns {Promise<object>} Start result
   */
  async startService(serviceKey, service) {
    return new Promise((resolve) => {
      console.log(`🚀 Starting ${service.name} service...`);

      const servicePath = path.resolve(__dirname, '../../', service.path);

      // Start service with npm run dev
      const process = spawn('npm', ['run', 'dev'], {
        cwd: servicePath,
        shell: true,
        stdio: 'pipe'
      });

      let outputBuffer = '';

      process.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;

        // Check if service started successfully
        if (output.includes('Server started') || output.includes(`listening on port ${service.port}`)) {
          console.log(`✓ ${service.name} started successfully`);
        }
      });

      process.stderr.on('data', (data) => {
        const error = data.toString();
        // Only log actual errors, not warnings
        if (error.toLowerCase().includes('error') && !error.toLowerCase().includes('deprecation')) {
          console.error(`${service.name} error:`, error);
        }
      });

      process.on('error', (error) => {
        console.error(`Failed to start ${service.name}:`, error.message);
        resolve({
          success: false,
          serviceName: service.name,
          error: error.message
        });
      });

      // Store process reference
      this.processes.set(serviceKey, process);

      // Wait a bit then check health
      setTimeout(async () => {
        const health = await this.checkHealth(service.name, service.port, 3000);
        resolve({
          success: health.isHealthy,
          serviceName: service.name,
          health
        });
      }, 5000); // Wait 5 seconds before checking
    });
  }

  /**
   * Start all unhealthy services
   * @param {array} unhealthyServices - List of unhealthy services
   * @returns {Promise<object>} Results
   */
  async startUnhealthyServices(unhealthyServices) {
    if (unhealthyServices.length === 0) {
      console.log('✅ No services need to be started\n');
      return { allStarted: true, results: [] };
    }

    console.log(`\n🔧 Attempting to start ${unhealthyServices.length} service(s)...\n`);

    const startPromises = unhealthyServices.map(unhealthy => {
      const serviceEntry = Object.entries(this.services).find(
        ([key, svc]) => svc.name === unhealthy.serviceName
      );

      if (serviceEntry) {
        const [key, service] = serviceEntry;
        return this.startService(key, service);
      }

      return Promise.resolve({
        success: false,
        serviceName: unhealthy.serviceName,
        error: 'Service config not found'
      });
    });

    const results = await Promise.all(startPromises);

    const allStarted = results.every(r => r.success);
    const failedStarts = results.filter(r => !r.success);

    if (allStarted) {
      console.log('\n✅ All services started successfully\n');
    } else {
      console.log(`\n⚠️  ${failedStarts.length} service(s) failed to start:`);
      failedStarts.forEach(failed => {
        console.log(`   ✗ ${failed.serviceName}: ${failed.error}`);
      });
      console.log();
    }

    return { allStarted, results };
  }

  /**
   * Wait for a service to become healthy
   * @param {string} serviceName - Service name
   * @param {number} port - Service port
   * @param {number} maxWait - Maximum wait time in ms
   * @param {number} interval - Check interval in ms
   * @returns {Promise<boolean>} True if became healthy
   */
  async waitForHealth(serviceName, port, maxWait = 60000, interval = 2000) {
    const startTime = Date.now();

    console.log(`⏳ Waiting for ${serviceName} to become healthy...`);

    while (Date.now() - startTime < maxWait) {
      const health = await this.checkHealth(serviceName, port, 3000);

      if (health.isHealthy) {
        console.log(`✓ ${serviceName} is healthy (${Date.now() - startTime}ms)`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    console.log(`✗ ${serviceName} did not become healthy within ${maxWait}ms`);
    return false;
  }

  /**
   * Stop all started services
   */
  stopAllServices() {
    console.log('\n🛑 Stopping all started services...\n');

    this.processes.forEach((process, serviceKey) => {
      const service = this.services[serviceKey];
      console.log(`Stopping ${service.name}...`);
      process.kill('SIGTERM');
    });

    this.processes.clear();
    console.log('✓ All services stopped\n');
  }

  /**
   * Get service health status
   * @param {string} serviceName - Service name
   * @returns {object|null} Health status
   */
  getHealthStatus(serviceName) {
    return this.healthStatus.get(serviceName) || null;
  }

  /**
   * Get all health statuses
   * @returns {Map} All health statuses
   */
  getAllHealthStatuses() {
    return this.healthStatus;
  }
}

export default ServiceManager;
