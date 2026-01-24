/**
 * Circuit Breaker States
 */
export const CircuitState = {
  CLOSED: "CLOSED", // Normal operation, requests flow through
  OPEN: "OPEN", // Circuit is open, requests fail fast
  HALF_OPEN: "HALF_OPEN", // Testing if service has recovered
};

/**
 * Circuit Breaker Implementation
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * and provide fast-fail behavior when a service is unavailable.
 */
export class CircuitBreaker {
  constructor(options = {}) {
    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Number of failures before opening
    this.successThreshold = options.successThreshold || 2; // Number of successes in HALF_OPEN before closing
    this.timeout = options.timeout || 60000; // Time to wait before attempting recovery (ms)
    this.name = options.name || "CircuitBreaker";

    // State
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastStateChange = Date.now();

    // Metrics
    this.metrics = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalRejected: 0,
      stateChanges: [],
    };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise<any>} Result of the function
   * @throws {Error} If circuit is open or function fails
   */
  async execute(fn) {
    this.metrics.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if we should attempt recovery
      if (Date.now() < this.nextAttempt) {
        this.metrics.totalRejected++;
        this.logState("REQUEST_REJECTED", "Circuit is OPEN");
        throw new Error(`Circuit breaker is OPEN for ${this.name}`);
      }

      // Transition to HALF_OPEN to test recovery
      this.setState(CircuitState.HALF_OPEN);
    }

    try {
      // Execute the function
      const result = await fn();

      // Record success
      this.onSuccess();

      return result;
    } catch (error) {
      // Record failure
      this.onFailure();

      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.metrics.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      this.logState("SUCCESS_IN_HALF_OPEN", `Success count: ${this.successCount}/${this.successThreshold}`);

      if (this.successCount >= this.successThreshold) {
        // Enough successes, close the circuit
        this.setState(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.metrics.totalFailures++;
    this.failureCount++;
    this.successCount = 0; // Reset success count on any failure

    this.logState("FAILURE", `Failure count: ${this.failureCount}/${this.failureThreshold}`);

    if (
      this.state === CircuitState.HALF_OPEN ||
      this.failureCount >= this.failureThreshold
    ) {
      // Open the circuit
      this.setState(CircuitState.OPEN);
      this.nextAttempt = Date.now() + this.timeout;
      this.failureCount = 0;
    }
  }

  /**
   * Change circuit breaker state
   * @param {string} newState - New state
   */
  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChange = Date.now();

    this.metrics.stateChanges.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString(),
    });

    this.logState("STATE_CHANGE", `${oldState} -> ${newState}`);
  }

  /**
   * Get current state
   * @returns {string} Current circuit state
   */
  getState() {
    return this.state;
  }

  /**
   * Check if circuit is open
   * @returns {boolean} True if circuit is open
   */
  isOpen() {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Get circuit breaker metrics
   * @returns {object} Metrics object
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentState: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt:
        this.state === CircuitState.OPEN
          ? new Date(this.nextAttempt).toISOString()
          : null,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
    };
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.logState("RESET", "Circuit breaker manually reset");
  }

  /**
   * Log circuit breaker state
   * @param {string} event - Event type
   * @param {string} message - Log message
   */
  logState(event, message) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: `CIRCUIT_BREAKER_${event}`,
        name: this.name,
        state: this.state,
        message,
      })
    );
  }
}
