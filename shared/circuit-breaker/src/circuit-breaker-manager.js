import { CircuitBreaker } from "./circuit-breaker.js";

/**
 * Circuit Breaker Manager
 *
 * Manages multiple circuit breakers for different services/endpoints
 */
export class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.defaultOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,
    };
  }

  /**
   * Get or create a circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @param {object} options - Circuit breaker options
   * @returns {CircuitBreaker} Circuit breaker instance
   */
  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      const breakerOptions = {
        ...this.defaultOptions,
        ...options,
        name: serviceName,
      };

      this.breakers.set(serviceName, new CircuitBreaker(breakerOptions));

      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "CIRCUIT_BREAKER_CREATED",
          service: serviceName,
          options: breakerOptions,
        })
      );
    }

    return this.breakers.get(serviceName);
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {string} serviceName - Name of the service
   * @param {Function} fn - Async function to execute
   * @param {object} options - Circuit breaker options
   * @returns {Promise<any>} Result of the function
   */
  async execute(serviceName, fn, options = {}) {
    const breaker = this.getBreaker(serviceName, options);
    return breaker.execute(fn);
  }

  /**
   * Get circuit breaker for a service
   * @param {string} serviceName - Name of the service
   * @returns {CircuitBreaker|null} Circuit breaker instance or null
   */
  getBreakerByName(serviceName) {
    return this.breakers.get(serviceName) || null;
  }

  /**
   * Get all circuit breakers
   * @returns {Map<string, CircuitBreaker>} Map of all circuit breakers
   */
  getAllBreakers() {
    return this.breakers;
  }

  /**
   * Get metrics for all circuit breakers
   * @returns {object} Metrics for all breakers
   */
  getAllMetrics() {
    const metrics = {};

    this.breakers.forEach((breaker, serviceName) => {
      metrics[serviceName] = breaker.getMetrics();
    });

    return metrics;
  }

  /**
   * Reset a circuit breaker
   * @param {string} serviceName - Name of the service
   */
  resetBreaker(serviceName) {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.reset();
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.breakers.forEach((breaker) => {
      breaker.reset();
    });
  }
}

// Export singleton instance
export default new CircuitBreakerManager();
