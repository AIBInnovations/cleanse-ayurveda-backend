import axios from "axios";
import { SERVICE_ROUTES, HEALTH_CHECK_CONFIG } from "../utils/constants.js";

/**
 * Service health status tracker
 */
class HealthCheckService {
  constructor() {
    this.serviceHealth = new Map();
    this.failureCount = new Map();
    this.checkInterval = null;

    // Initialize health status for all services
    Object.keys(SERVICE_ROUTES).forEach((route) => {
      this.serviceHealth.set(route, true);
      this.failureCount.set(route, 0);
    });
  }

  /**
   * Check health of a single service
   */
  async checkService(serviceName, serviceUrl) {
    try {
      const response = await axios.get(`${serviceUrl}/api/health`, {
        timeout: HEALTH_CHECK_CONFIG.TIMEOUT_MS,
      });

      if (response.status === 200) {
        // Service is healthy, reset failure count
        this.failureCount.set(serviceName, 0);

        if (!this.serviceHealth.get(serviceName)) {
          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              event: "SERVICE_RECOVERED",
              service: serviceName,
              url: serviceUrl,
            })
          );
        }

        this.serviceHealth.set(serviceName, true);
        return true;
      }
    } catch (error) {
      // Service check failed
      const currentFailures = this.failureCount.get(serviceName) + 1;
      this.failureCount.set(serviceName, currentFailures);

      if (currentFailures >= HEALTH_CHECK_CONFIG.UNHEALTHY_THRESHOLD) {
        if (this.serviceHealth.get(serviceName)) {
          console.log(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              event: "SERVICE_UNHEALTHY",
              service: serviceName,
              url: serviceUrl,
              failureCount: currentFailures,
              error: error.message,
            })
          );
        }

        this.serviceHealth.set(serviceName, false);
      }

      return false;
    }
  }

  /**
   * Check all services
   */
  async checkAllServices() {
    const promises = Object.entries(SERVICE_ROUTES).map(([route, url]) =>
      this.checkService(route, url)
    );

    await Promise.all(promises);
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks() {
    // Initial check
    this.checkAllServices();

    // Periodic checks - store interval ID for cleanup
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, HEALTH_CHECK_CONFIG.INTERVAL_MS);

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "HEALTH_CHECK_STARTED",
        interval: HEALTH_CHECK_CONFIG.INTERVAL_MS,
      })
    );
  }

  /**
   * Stop periodic health checks (for graceful shutdown)
   */
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "HEALTH_CHECK_STOPPED",
        })
      );
    }
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(serviceName) {
    return this.serviceHealth.get(serviceName) !== false;
  }

  /**
   * Get health status of all services
   */
  getHealthStatus() {
    const status = {};
    this.serviceHealth.forEach((healthy, service) => {
      status[service] = {
        healthy,
        failureCount: this.failureCount.get(service),
      };
    });
    return status;
  }
}

// Export singleton instance
export default new HealthCheckService();
